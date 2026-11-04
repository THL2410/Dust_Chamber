import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DesignProjects } from './entities/DesignProjects';
import { DesignInputs } from './entities/DesignInputs';
import { DesignResults } from './entities/DesignResults';
import { CreateCalculationDto } from './dto/create-calculation.dto';
import { UpdateCalculationDto } from './dto/update-calculation.dto';
import { calculateDesign } from './design-calculation';
import { fractionRowToPayload, mergeCalculationUpdate, type InputPatch } from './calculation-merge';
import { CALCULATION_CONSTANTS as K } from './calculations.constants';

/** Cận trên giả định khi tìm thiết bị gợi ý cho dải không giới hạn trên */
const OPEN_UPPER_UM = 1e9;

interface CollectorRow {
  id: number;
  code: string;
  name: string;
  typicalEfficiency: string;
}

@Injectable()
export class CalculationsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(DesignProjects)
    private readonly projectRepo: Repository<DesignProjects>,
  ) {}

  /** Kiểm tra dữ liệu, gộp giá trị mặc định rồi gọi hàm tính thuần. Không đụng DB. */
  private compute(dto: CreateCalculationDto) {
    const { chamberHeightM: H, chamberLengthM: L, chamberWidthM: B, dMinTargetUm: d } = dto;
    const hasAll = !!(H && L && B);
    const hasDminAndOne = !!(d && (H || L || B));
    if (!hasAll && !hasDminAndOne) {
      throw new BadRequestException(
        'Cần nhập đủ H, L, B (chế độ CHECK) hoặc d_min kèm ít nhất một trong H, L, B (chế độ DESIGN).',
      );
    }

    // Chế độ DESIGN chỉ bắt buộc Q, t, ρb, d_min và một kích thước; Cb và phân bố hạt là tùy chọn.
    // Chế độ CHECK vẫn cần Cb vì mục đích là kiểm tra hiệu suất và nồng độ bụi ra.
    if (hasAll && dto.dustConcentrationGM3 == null) {
      throw new BadRequestException('Chế độ CHECK cần nhập nồng độ bụi Cb.');
    }

    const inputValues = {
      flowRateM3H: dto.flowRateM3H,
      temperatureC: dto.temperatureC,
      dustConcentrationGM3: dto.dustConcentrationGM3 ?? null,
      dustDensityKgM3: dto.dustDensityKgM3,
      dMinTargetUm: dto.dMinTargetUm ?? null,
      chamberHeightM: H ?? null,
      chamberLengthM: L ?? null,
      chamberWidthM: B ?? null,
      gasVelocityMS: dto.gasVelocityMS ?? K.defaultGasVelocityInChamber,
      operatingHoursPerDay: dto.operatingHoursPerDay ?? K.defaultOperatingHoursPerDay,
      pipeVelocityMS: dto.pipeVelocityMS ?? K.defaultPipeVelocity,
      pipeDiameterM: dto.pipeDiameterM ?? null,
      pipeLengthM: dto.pipeLengthM ?? K.defaultDuctLengthLd,
      frictionRPaM: dto.frictionRPaM ?? K.defaultUnitFrictionLossR,
      roughnessBeta: dto.roughnessBeta ?? K.defaultRoughnessFactorBeta,
      localResistanceSum: dto.localResistanceSum ?? K.defaultLocalResistanceSum,
      chamberPressureDropPa: dto.chamberPressureDropPa ?? K.defaultChamberPressureLoss,
      fanEfficiency: dto.fanEfficiency ?? K.defaultFanEfficiency,
    };

    try {
      const calc = calculateDesign({ ...inputValues, fractions: dto.particleFractions });
      return { inputValues, calc };
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }

  /** Thiết bị lọc bụi thay thế có khoảng cỡ hạt giao với dải [dFrom, dTo]. */
  private findCollectors(
    db: Pick<DataSource, 'query'>,
    dFromUm: number,
    dToUm: number,
  ): Promise<CollectorRow[]> {
    return db.query(
      `SELECT id, code, name, typical_efficiency AS "typicalEfficiency"
         FROM dust_collectors
        WHERE is_active AND min_diameter_um < $2 AND max_diameter_um > $1
        ORDER BY id`,
      [dFromUm, dToUm],
    );
  }

  /** Tính toán để xem trước, KHÔNG lưu DB (không tạo phương án mới trong lịch sử). */
  async preview(dto: CreateCalculationDto) {
    const { inputValues, calc } = this.compute(dto);
    const fractions: unknown[] = [];
    for (const f of calc.fractionResults) {
      const collectors =
        f.regime === 'OTHER_DEVICE' ? await this.findCollectors(this.dataSource, f.dFromUm, f.dToUm ?? OPEN_UPPER_UM) : [];
      fractions.push({ ...f, collectors });
    }
    return {
      message: 'Tính toán thành công (chưa lưu).',
      projectId: null,
      mode: calc.mode,
      warnings: calc.warnings,
      input: inputValues,
      result: calc.result,
      fractions,
    };
  }

  /** Ghi các dải hạt, kết quả từng dải và gợi ý thiết bị khác của một phương án. */
  private async saveFractions(
    manager: Pick<DataSource, 'query'>,
    projectId: number,
    fractionResults: ReturnType<typeof calculateDesign>['fractionResults'],
  ) {
    const fractions: unknown[] = [];
    for (const [idx, f] of fractionResults.entries()) {
      const [row] = await manager.query(
        `INSERT INTO dust_fractions (project_id, d_from_um, d_to_um, mass_percent, sort_order)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [projectId, f.dFromUm, f.dToUm, f.massPercent, idx + 1],
      );
      await manager.query(
        `INSERT INTO fraction_results
           (fraction_id, d_rep_um, settling_velocity_m_s, efficiency_percent,
            inlet_conc_g_m3, outlet_conc_g_m3, regime)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [row.id, f.dRepUm, f.settlingVelocityMS, f.efficiencyPercent,
         f.inletConcGM3, f.outletConcGM3, f.regime],
      );
      let collectors: CollectorRow[] = [];
      if (f.regime === 'OTHER_DEVICE') {
        collectors = await this.findCollectors(manager, f.dFromUm, f.dToUm ?? OPEN_UPPER_UM);
        if (collectors.length) {
          await manager.query(
            `INSERT INTO fraction_collector_suggestions (fraction_id, collector_id)
             SELECT $1, UNNEST($2::smallint[])`,
            [row.id, collectors.map((c) => c.id)],
          );
        }
      }
      fractions.push({ id: row.id, ...f, collectors });
    }
    return fractions;
  }

  async calculateAndSave(userId: number, dto: CreateCalculationDto) {
    const { inputValues, calc } = this.compute(dto);

    return this.dataSource.transaction(async (manager) => {
      const project = await manager.save(
        manager.create(DesignProjects, {
          name: dto.name || 'Phương án buồng lắng bụi',
          note: dto.note ?? null,
          userId,
          mode: calc.mode,
        }),
      );
      // Lưu đúng giá trị người dùng nhập (không ghi đè bằng giá trị tính ra);
      // vận tốc khí thực tế nằm ở result.uMS (B3).
      const input = await manager.save(
        manager.create(DesignInputs, { projectId: project.id, ...inputValues }),
      );
      const result = await manager.save(
        manager.create(DesignResults, { projectId: project.id, ...calc.result }),
      );
      const fractions = await this.saveFractions(manager, project.id, calc.fractionResults);

      return {
        message: 'Tính toán và lưu phương án thành công!',
        projectId: project.id,
        mode: calc.mode,
        warnings: calc.warnings,
        input,
        result,
        fractions,
      };
    });
  }

  /**
   * Sửa phương án đã lưu (PATCH): trộn phần người dùng gửi với dữ liệu đang lưu rồi tính lại bằng đúng
   * hàm calculateDesign của preview/lưu mới và giữ nguyên ID.
   */
  async update(id: number, userId: number, dto: UpdateCalculationDto) {
    return this.dataSource.transaction(async (manager) => {
      // Khóa dòng dự án để hai lần sửa đồng thời không ghi đè lẫn nhau
      const project = await manager.findOne(DesignProjects, {
        where: { id, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!project) throw new NotFoundException(`Không tìm thấy phương án với ID ${id}`);
      const stored = await manager.findOneBy(DesignInputs, { projectId: id });
      if (!stored) throw new NotFoundException(`Phương án ${id} thiếu dữ liệu đầu vào`);

      const rows: Array<{ d_from_um: string; d_to_um: string | null; mass_percent: string }> = await manager.query(
        `SELECT d_from_um, d_to_um, mass_percent FROM dust_fractions WHERE project_id = $1 ORDER BY sort_order`,
        [id],
      );
      let merged;
      try {
        merged = mergeCalculationUpdate(
          stored as unknown as InputPatch,
          rows.map(fractionRowToPayload),
          dto as unknown as InputPatch & { particleFractions?: CreateCalculationDto['particleFractions'] | null },
        );
      } catch (e) {
        throw new BadRequestException((e as Error).message);
      }
      // compute() chỉ đọc giá trị rỗng qua ?? / truthy nên null từ merged dùng được như "không nhập"
      const { inputValues, calc } = this.compute(merged as unknown as CreateCalculationDto);

      await manager.update(DesignProjects, { id }, {
        name: dto.name || project.name,
        note: dto.note !== undefined ? dto.note : project.note,
        mode: calc.mode,
        updatedAt: new Date(),
      });
      await manager.update(DesignInputs, { projectId: id }, inputValues);
      await manager.update(DesignResults, { projectId: id }, calc.result);

      // Xóa dải cũ (con trước cha) rồi ghi lại toàn bộ dải mới
      await manager.query(
        `DELETE FROM fraction_collector_suggestions
          WHERE fraction_id IN (SELECT id FROM dust_fractions WHERE project_id = $1)`,
        [id],
      );
      await manager.query(`DELETE FROM dust_fractions WHERE project_id = $1`, [id]);
      const fractions = await this.saveFractions(manager, id, calc.fractionResults);

      return {
        message: 'Đã sửa và tính lại phương án thành công!',
        projectId: id,
        mode: calc.mode,
        warnings: calc.warnings,
        input: inputValues,
        result: calc.result,
        fractions,
      };
    });
  }

  async findAllByUser(userId: number) {
    return this.projectRepo.find({
      where: { userId },
      relations: { designInputs: true, designResults: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, userId: number) {
    const project = await this.projectRepo.findOne({
      where: { id, userId },
      relations: { designInputs: true, designResults: true },
    });
    if (!project) throw new NotFoundException(`Không tìm thấy phương án với ID ${id}`);
    return project;
  }

  async remove(id: number, userId: number) {
    const project = await this.findOne(id, userId);
    await this.projectRepo.remove(project);
    return { message: `Đã xóa phương án có ID ${id} thành công` };
  }
}