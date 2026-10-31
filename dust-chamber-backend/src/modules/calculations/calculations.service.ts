import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DesignProjects } from './entities/DesignProjects';
import { DesignInputs } from './entities/DesignInputs';
import { DesignResults } from './entities/DesignResults';
import { CreateCalculationDto } from './dto/create-calculation.dto';
import { calculateDesign } from './design-calculation';

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
      gasVelocityMS: dto.gasVelocityMS ?? 0.18,
      operatingHoursPerDay: dto.operatingHoursPerDay ?? 16,
      pipeVelocityMS: dto.pipeVelocityMS ?? 15,
      pipeDiameterM: dto.pipeDiameterM ?? null,
      pipeLengthM: dto.pipeLengthM ?? 32,
      frictionRPaM: dto.frictionRPaM ?? 4.05,
      roughnessBeta: dto.roughnessBeta ?? 1,
      localResistanceSum: dto.localResistanceSum ?? 0,
      chamberPressureDropPa: dto.chamberPressureDropPa ?? 245,
      fanEfficiency: dto.fanEfficiency ?? 0.6,
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

    return this.dataSource.transaction(async (manager) => {
      const project = await manager.save(
        manager.create(DesignProjects, {
          name: dto.name || 'Phương án buồng lắng bụi',
          userId,
          mode: calc.mode,
        }),
      );
      const input = await manager.save(
        manager.create(DesignInputs, { projectId: project.id, ...inputValues }),
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