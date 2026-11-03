import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { DesignProjects } from './entities/DesignProjects';
import { DesignInputs } from './entities/DesignInputs';
import { DesignResults } from './entities/DesignResults';
import { CreateCalculationDto } from './dto/create-calculation.dto';
import { UpdateCalculationDto } from './dto/update-calculation.dto';
import { calculateDesign, FractionCalcResult } from './design-calculation';
import { CALCULATION_CONSTANTS as K } from './calculations.constants';

type Calc = ReturnType<typeof calculateDesign>;
type SqlRunner = { query: (sql: string, params?: unknown[]) => Promise<any> };

/** Thiết bị lọc bụi được gợi ý cho một dải hạt */
export interface CollectorSuggestion {
  id: number;
  code: string;
  name: string;
  typicalEfficiency: string;
}

/** Một dải hạt kèm kết quả tính và danh sách thiết bị gợi ý */
export type FractionWithCollectors = FractionCalcResult & { id?: number; collectors: CollectorSuggestion[] };

export interface FractionInput {
  diameterFromMicron?: number;
  diameterMicron: number;
  weightPercent: number;
}

/** Thông số đầu vào đã chuẩn hóa (đã áp giá trị mặc định) */
export interface InputValues {
  flowRateM3H: number;
  temperatureC: number;
  dustConcentrationGM3: number;
  dustDensityKgM3: number;
  dMinTargetUm: number | null;
  chamberHeightM: number | null;
  chamberLengthM: number | null;
  chamberWidthM: number | null;
  gasVelocityMS: number;
  operatingHoursPerDay: number;
  pipeVelocityMS: number;
  pipeDiameterM: number | null;
  pipeLengthM: number;
  frictionRPaM: number;
  roughnessBeta: number;
  localResistanceSum: number;
  chamberPressureDropPa: number;
  fanEfficiency: number;
}

const INPUT_KEYS: (keyof InputValues)[] = [
  'flowRateM3H', 'temperatureC', 'dustConcentrationGM3', 'dustDensityKgM3',
  'dMinTargetUm', 'chamberHeightM', 'chamberLengthM', 'chamberWidthM',
  'gasVelocityMS', 'operatingHoursPerDay', 'pipeVelocityMS', 'pipeDiameterM',
  'pipeLengthM', 'frictionRPaM', 'roughnessBeta', 'localResistanceSum',
  'chamberPressureDropPa', 'fanEfficiency',
];
const REQUIRED_KEYS: (keyof InputValues)[] = [
  'flowRateM3H', 'temperatureC', 'dustConcentrationGM3', 'dustDensityKgM3',
];

type RawInput = Partial<Record<keyof InputValues, number | null>>;

@Injectable()
export class CalculationsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(DesignProjects)
    private readonly projectRepo: Repository<DesignProjects>,
  ) {}

  /* ================================================================ */
  /* API 1: POST /calculations/preview  (không ghi DB, không tạo ID)   */
  /* ================================================================ */
  async preview(dto: CreateCalculationDto) {
    const values = this.buildInput(dto);
    const calc = this.compute(values, dto.particleFractions);
    // Chỉ đọc bảng dust_collectors để hiển thị gợi ý, không ghi gì
    const fractions: FractionWithCollectors[] = [];
    for (const f of calc.fractionResults) {
      const collectors: CollectorSuggestion[] =
        f.regime === 'OTHER_DEVICE' ? await this.suggest(this.dataSource, f.dFromUm, f.dToUm) : [];
      fractions.push({ ...f, collectors });
    }
    return {
      message: 'Kết quả tính toán (chưa lưu).',
      saved: false,
      mode: calc.mode,
      warnings: calc.warnings,
      input: { ...values, gasVelocityMS: this.actualVelocity(calc) },
      result: calc.result,
      fractions,
    };
  }

  /* ================================================================ */
  /* API 2: POST /calculations  (tính lại bằng cùng công thức rồi lưu) */
  /* ================================================================ */
  async create(userId: number, dto: CreateCalculationDto) {
    const values = this.buildInput(dto);
    const calc = this.compute(values, dto.particleFractions); // lỗi tính toán thì chưa ghi gì

    return this.dataSource.transaction(async (manager) => {
      const project = await manager.save(
        manager.create(DesignProjects, {
          name: dto.name || 'Phương án buồng lắng bụi',
          note: dto.note ?? null,
          userId,
          mode: calc.mode,
        }),
      );
      const input = await manager.save(
        manager.create(DesignInputs, {
          projectId: project.id,
          ...values,
          gasVelocityMS: this.actualVelocity(calc),
        }),
      );
      const result = await manager.save(
        manager.create(DesignResults, { projectId: project.id, ...calc.result }),
      );
      const fractions = await this.saveFractions(manager, project.id, calc);
      return {
        message: 'Tính toán và lưu phương án thành công!',
        saved: true,
        projectId: project.id,
        mode: calc.mode,
        warnings: calc.warnings,
        input,
        result,
        fractions,
      };
    });
  }

  /* ================================================================ */
  /* API 3: PATCH /calculations/:id  (sửa đầu vào, tự tính lại)        */
  /* ================================================================ */
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

      // Phân bố cỡ hạt đang lưu (dùng lại nếu người dùng không gửi phân bố mới)
      const rows: Array<Record<string, unknown>> = await manager.query(
        `SELECT d_from_um, d_to_um, mass_percent
         FROM dust_fractions WHERE project_id = $1 ORDER BY sort_order`,
        [id],
      );
      const storedFractions: FractionInput[] = rows.map((r) => ({
        diameterFromMicron: Number(r.d_from_um),
        diameterMicron: Number(r.d_to_um),
        weightPercent: Number(r.mass_percent),
      }));

      // Trộn: trường nào người dùng gửi (kể cả null) thì dùng, không gửi thì giữ giá trị cũ
      const body = dto as unknown as Record<string, unknown>;
      const merged: RawInput = {};
      for (const k of INPUT_KEYS) {
        merged[k] = body[k] !== undefined ? (body[k] as number | null) : (stored[k] as number | null);
      }
      // Vận tốc khí lưu ở chế độ CHECK (hoặc khi H, B cùng được cho) là vận tốc tính ra,
      // không phải thông số thiết kế, nên không mang sang lần tính mới.
      if (body.gasVelocityMS === undefined) {
        const wasDesignVelocity =
          project.mode === 'DESIGN' && !(stored.chamberHeightM && stored.chamberWidthM);
        merged.gasVelocityMS = wasDesignVelocity ? stored.gasVelocityMS : null;
      }

      const values = this.buildInput(merged);
      const fractionsIn =
        dto.particleFractions !== undefined ? dto.particleFractions : storedFractions;
      const calc = this.compute(values, fractionsIn); // lỗi ở đây: chưa ghi gì, transaction rollback

      // Ghi đồng thời đầu vào, kết quả tổng, các dải hạt; lỗi ở bất kỳ bước nào thì rollback tất cả
      await manager.update(DesignProjects, { id }, {
        name: dto.name || project.name,
        note: dto.note !== undefined ? dto.note : project.note,
        mode: calc.mode,
        updatedAt: new Date(),
      });
      await manager.update(DesignInputs, { projectId: id }, {
        ...values,
        gasVelocityMS: this.actualVelocity(calc),
      });
      await manager.update(DesignResults, { projectId: id }, calc.result);

      // Xóa dải cũ theo thứ tự con trước cha rồi ghi lại toàn bộ dải mới
      await manager.query(
        `DELETE FROM fraction_collector_suggestions
         WHERE fraction_id IN (SELECT id FROM dust_fractions WHERE project_id = $1)`, [id]);
      await manager.query(
        `DELETE FROM fraction_results
         WHERE fraction_id IN (SELECT id FROM dust_fractions WHERE project_id = $1)`, [id]);
      await manager.query(`DELETE FROM dust_fractions WHERE project_id = $1`, [id]);
      const fractions = await this.saveFractions(manager, id, calc);

      return {
        message: 'Đã cập nhật và tính lại phương án.',
        saved: true,
        projectId: id,
        mode: calc.mode,
        warnings: calc.warnings,
        input: await manager.findOneBy(DesignInputs, { projectId: id }),
        result: await manager.findOneBy(DesignResults, { projectId: id }),
        fractions,
      };
    });
  }

  /* ================================================================ */
  /* Lịch sử (giữ nguyên)                                              */
  /* ================================================================ */
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

  /* ================================================================ */
  /* Hàm dùng chung cho cả 3 API                                       */
  /* ================================================================ */

  /** Chuẩn hóa đầu vào: áp giá trị mặc định, kiểm trường bắt buộc */
  private buildInput(src: RawInput): InputValues {
    for (const k of REQUIRED_KEYS) {
      if (src[k] === undefined || src[k] === null) {
        throw new BadRequestException(`Thiếu trường bắt buộc: ${k}`);
      }
    }
    return {
      flowRateM3H: src.flowRateM3H as number,
      temperatureC: src.temperatureC as number,
      dustConcentrationGM3: src.dustConcentrationGM3 as number,
      dustDensityKgM3: src.dustDensityKgM3 as number,
      dMinTargetUm: src.dMinTargetUm ?? null,
      chamberHeightM: src.chamberHeightM ?? null,
      chamberLengthM: src.chamberLengthM ?? null,
      chamberWidthM: src.chamberWidthM ?? null,
      gasVelocityMS: src.gasVelocityMS ?? K.defaultGasVelocityInChamber,
      operatingHoursPerDay: src.operatingHoursPerDay ?? K.defaultOperatingHoursPerDay,
      pipeVelocityMS: src.pipeVelocityMS ?? K.defaultPipeVelocity,
      pipeDiameterM: src.pipeDiameterM ?? null,
      pipeLengthM: src.pipeLengthM ?? K.defaultDuctLengthLd,
      frictionRPaM: src.frictionRPaM ?? K.defaultUnitFrictionLossR,
      roughnessBeta: src.roughnessBeta ?? K.defaultRoughnessFactorBeta,
      localResistanceSum: src.localResistanceSum ?? K.defaultLocalResistanceSum,
      chamberPressureDropPa: src.chamberPressureDropPa ?? K.defaultChamberPressureLoss,
      fanEfficiency: src.fanEfficiency ?? K.defaultFanEfficiency,
    };
  }

  /** Bộ công thức duy nhất; cả preview, lưu mới và sửa đều gọi hàm này */
  private compute(values: InputValues, fractions?: FractionInput[] | null): Calc {
    // Khớp ràng buộc ck_input_mode_data của DB: báo lỗi 400 rõ ràng thay vì lỗi SQL
    const { chamberHeightM: H, chamberLengthM: L, chamberWidthM: B, dMinTargetUm: d } = values;
    const hasAll = !!(H && L && B);
    const hasDminAndOne = !!(d && (H || L || B));
    if (!hasAll && !hasDminAndOne) {
      throw new BadRequestException(
        'Cần nhập đủ H, L, B (chế độ CHECK) hoặc d_min kèm ít nhất một trong H, L, B (chế độ DESIGN).',
      );
    }
    let calc: Calc;
    try {
      calc = calculateDesign({ ...values, fractions: fractions ?? undefined });
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    if (calc.mode === 'CHECK' && values.dMinTargetUm) {
      calc.warnings.push('Chế độ CHECK: d_min nhập vào không được dùng, d_min được tính từ kích thước buồng.');
    }
    return calc;
  }

  /** Vận tốc khí thực trong buồng (= L / τ2) */
  private actualVelocity(calc: Calc): number {
    return calc.result.lM / calc.result.tau2S;
  }

  /** Thiết bị lọc có khoảng cỡ hạt phủ lên dải [dFrom, dTo] (chỉ đọc) */
  private async suggest(runner: SqlRunner, dFrom: number, dTo: number) {
    return runner.query(
      `SELECT c.id, c.code, c.name, c.typical_efficiency AS "typicalEfficiency"
       FROM dust_collectors c
       WHERE c.is_active AND c.min_diameter_um < $2 AND c.max_diameter_um > $1
       ORDER BY c.id`,
      [dFrom, dTo],
    ) as Promise<CollectorSuggestion[]>;
  }

  /** Ghi dust_fractions, fraction_results và gợi ý thiết bị cho từng dải */
  private async saveFractions(manager: EntityManager, projectId: number, calc: Calc) {
    const fractions: FractionWithCollectors[] = [];
    for (const [idx, f] of calc.fractionResults.entries()) {
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
      const collectors: CollectorSuggestion[] =
        f.regime === 'OTHER_DEVICE' ? await this.suggest(manager, f.dFromUm, f.dToUm) : [];
      if (collectors.length) {
        await manager.query(
          `INSERT INTO fraction_collector_suggestions (fraction_id, collector_id)
           SELECT $1, c.id FROM dust_collectors c WHERE c.id = ANY($2)`,
          [row.id, collectors.map((c) => c.id)],
        );
      }
      fractions.push({ id: row.id, ...f, collectors });
    }
    return fractions;
  }
}