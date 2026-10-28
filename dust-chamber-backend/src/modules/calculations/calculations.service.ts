import {
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { CalculateChamberDto } from './dto/calculate-chamber.dto';
import { CalculationEngine } from './calculation.engine';
import { DesignProjects } from '../../entities/DesignProjects';
import { DesignInputs } from '../../entities/DesignInputs';
import { DesignResults } from '../../entities/DesignResults';

@Injectable()
export class CalculationsService {
  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(DesignProjects)
    private readonly projectRepository: Repository<DesignProjects>,

    @InjectRepository(DesignInputs)
    private readonly inputRepository: Repository<DesignInputs>,

    @InjectRepository(DesignResults)
    private readonly resultRepository: Repository<DesignResults>,
  ) {}

  async calculateChamber(
    dto: CalculateChamberDto,
    userId: number,
  ) {
    try {
      // 1. Tính toán các thông số vật lý
      const calculationResult = CalculationEngine.calculate(dto);

      // 2. Lưu dữ liệu trong cùng một transaction
      const projectId = await this.dataSource.transaction(
        async (manager) => {
          // Lưu vào design_projects
          const project = manager.create(DesignProjects, {
            userId,
            name: 'Phương án buồng lắng bụi',
            mode: 'DESIGN',
            formulaVersion: 1,
          });

          const savedProject = await manager.save(
            DesignProjects,
            project,
          );

          // Lưu vào design_inputs
          const input = manager.create(DesignInputs, {
            projectId: savedProject.id,

            flowRateM3H: dto.flowRate,
            temperatureC: dto.temperature,
            dustConcentrationGM3: dto.dustConcentration,
            dustDensityKgM3: dto.particleDensity,

            chamberHeightM: dto.height ?? null,
            chamberLengthM: dto.length ?? null,
            chamberWidthM: dto.width ?? null,

            gasVelocityMS: dto.gasVelocity ?? 0.18,
            pipeVelocityMS: dto.ductVelocity ?? 15,

            pipeLengthM: dto.pipeLength ?? 32,

            // Đúng tên thuộc tính trong DesignInputs Entity
            frictionRPaM: dto.frictionRPAM ?? 4.05,

            roughnessBeta: dto.roughnessBeta ?? 1,
            localResistanceSum: dto.localResistanceSum ?? 0,
            chamberPressureDropPa:
              dto.chamberPressureDropPA ?? 245,
            fanEfficiency: dto.fanEfficiency ?? 0.6,
          });

          await manager.save(DesignInputs, input);

          // Lưu vào design_results
          const resData = calculationResult;

          const result = manager.create(DesignResults, {
            projectId: savedProject.id,

            hM: dto.height ?? resData.input?.height ?? 0,
            lM: dto.length ?? resData.input?.length ?? 0,
            bM: dto.width ?? resData.input?.width ?? 0,

            muPaS: resData.gas?.dynamicViscosityPaS ?? 0,
            rhoGasKgM3: resData.gas?.densityKgM3 ?? 0,
            uMS: resData.gas?.chamberVelocityMS ?? 0,

            tau1S: 0,
            tau2S: 0,
            lMinM: 0,

            blM2:
              (dto.height ?? 0) * (dto.width ?? 0),

            dMinCalcUm:
              resData.particle?.minimumDiameterMicron ?? 0,

            dLimitUm:
              resData.particle?.minimumDiameterMicron ?? 0,

            isRetained: true,

            gvKgH: 0,
            yvPercent: 0,
            gsKgH: 0,

            qsM3H:
              resData.ductAndFan?.cleanGasFlowRateM3H ?? 0,

            gbKgH: 0,
            m1KgH: 0,
            m2KgH: 0,

            mtKgH:
              resData.gradedEfficiency?.capturedDustKgH ?? 0,

            mnKgDay: 0,

            mrKgH:
              resData.gradedEfficiency?.remainingDustKgH ?? 0,

            cbOutMgM3:
              resData.gradedEfficiency?.outletConcentrationMgM3 ??
              0,

            etaTotalPercent:
              resData.gradedEfficiency?.totalEfficiencyPercent ??
              resData.efficiency?.percent ??
              0,

            d0M: resData.ductAndFan?.ductDiameterM ?? 0,

            vtMS: dto.ductVelocity ?? 15,
            alpha: 0.98,

            dpFrictionPa:
              resData.ductAndFan?.frictionLossPa ?? 0,

            pDynamicPa: 0,

            pLocalPa:
              resData.ductAndFan?.localLossPa ?? 0,

            dpPipePa:
              resData.ductAndFan?.totalDuctLossPa ?? 0,

            dpSystemPa:
              resData.ductAndFan?.systemTotalLossPa ?? 0,

            fanPowerKw:
              resData.ductAndFan?.fanPowerKW ?? 0,
          });

          await manager.save(DesignResults, result);

          return savedProject.id;
        },
      );

      // 3. Trả kết quả sau khi lưu thành công
      return {
        success: true,
        projectId,
        data: calculationResult,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to calculate chamber parameters.';

      throw new UnprocessableEntityException({
        success: false,
        message,
      });
    }
  }
}