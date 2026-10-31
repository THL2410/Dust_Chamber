import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DesignProjects } from './entities/DesignProjects';
import { DesignInputs } from './entities/DesignInputs';
import { DesignResults } from './entities/DesignResults';
import { CreateCalculationDto } from './dto/create-calculation.dto';
import { calculateDesign } from './design-calculation';
import { CALCULATION_CONSTANTS as K } from './calculations.constants';

@Injectable()
export class CalculationsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(DesignProjects)
    private readonly projectRepo: Repository<DesignProjects>,
  ) {}

  async calculateAndSave(userId: number, dto: CreateCalculationDto) {
    // Khớp ràng buộc ck_input_mode_data của DB: báo lỗi 400 rõ ràng thay vì lỗi SQL
    const { chamberHeightM: H, chamberLengthM: L, chamberWidthM: B, dMinTargetUm: d } = dto;
    const hasAll = !!(H && L && B);
    const hasDminAndOne = !!(d && (H || L || B));
    if (!hasAll && !hasDminAndOne) {
      throw new BadRequestException(
        'Cần nhập đủ H, L, B (chế độ CHECK) hoặc d_min kèm ít nhất một trong H, L, B (chế độ DESIGN).',
      );
    }

    const inputValues = {
      flowRateM3H: dto.flowRateM3H,
      temperatureC: dto.temperatureC,
      dustConcentrationGM3: dto.dustConcentrationGM3,
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

    // Tính trước khi ghi DB: lỗi tính toán thì không tạo project nào
    let calc;
    try {
      calc = calculateDesign({
        ...inputValues,
        fractions: dto.particleFractions,
      });
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }

    // Vận tốc khí thực trong buồng (= L / τ2). Ở chế độ CHECK nó khác giá trị mặc định 0,18.
    const actualGasVelocityMS = calc.result.lM / calc.result.tau2S;

    return this.dataSource.transaction(async (manager) => {
      const project = await manager.save(
        manager.create(DesignProjects, {
          name: dto.name || 'Phương án buồng lắng bụi',
          userId,
          mode: calc.mode,
        }),
      );
      const input = await manager.save(
        manager.create(DesignInputs, {
          projectId: project.id,
          ...inputValues,
          gasVelocityMS: actualGasVelocityMS,
        }),
      );
      const result = await manager.save(
        manager.create(DesignResults, { projectId: project.id, ...calc.result }),
      );
      return {
        message: 'Tính toán và lưu phương án thành công!',
        projectId: project.id,
        mode: calc.mode,
        warnings: calc.warnings,
        input,
        result,
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

  // Lọc theo userId để user này không xem/xóa được phương án của user khác
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