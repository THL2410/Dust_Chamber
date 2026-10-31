import {
  CALCULATION_CONSTANTS,
  CALCULATION_WARNINGS,
  TEMPERATURE_ALPHA_TABLE,
} from './calculations.constants';
import { CalculateChamberDto, ParticleFractionDto } from './dto/calculate-chamber.dto';

export interface ChamberCalculationResult {
  input: any;
  gas: {
    dynamicViscosityPaS: number;
    densityKgM3: number;
    chamberVelocityMS: number;
  };
  particle: {
    settlingVelocityMS: number;
    minimumDiameterM: number;
    minimumDiameterMicron: number;
  };
  efficiency: {
    fraction: number;
    percent: number;
  };
  gradedEfficiency?: {
    fractionResults: {
      diameterMicron: number;
      weightPercent: number;
      settlingVelocityMS: number;
      efficiencyPercent: number;
      capturedMassKgH: number;
    }[];
    totalEfficiencyPercent: number;
    outletConcentrationMgM3: number;
    capturedDustKgH: number;
    remainingDustKgH: number;
  };
  ductAndFan?: {
    cleanGasFlowRateM3H: number;
    cleanGasFlowRateM3S: number;
    ductDiameterM: number;
    actualDuctVelocityMS: number;
    frictionLossPa: number;
    localLossPa: number;
    totalDuctLossPa: number;
    systemTotalLossPa: number;
    fanPowerKW: number;
  };
  warnings: string[];
}

export class CalculationEngine {
  static gasDynamicViscosity(temperatureC: number): number {
    const c = CALCULATION_CONSTANTS;
    const kelvinRatio = (c.celsiusToKelvinOffset + temperatureC) / c.celsiusToKelvinOffset;
    if (kelvinRatio <= 0) throw new Error('Temperature is outside valid range.');

    const denominator = c.viscosityTemperatureConstant + temperatureC;
    if (denominator <= 0) throw new Error('Temperature is outside valid range.');

    return (
      c.referenceGasViscosity *
      (c.viscosityTemperatureConstant / denominator) *
      Math.pow(kelvinRatio, 1.5)
    );
  }

  static gasDensity(temperatureC: number): number {
    const c = CALCULATION_CONSTANTS;
    const kelvin = c.celsiusToKelvinOffset + temperatureC;
    if (kelvin <= 0) throw new Error('Temperature must be above absolute zero.');
    return c.referenceGasDensity * (c.celsiusToKelvinOffset / kelvin);
  }

  static chamberVelocity(flowRateM3S: number, widthM: number, heightM: number): number {
    return flowRateM3S / (widthM * heightM);
  }

  static settlingVelocity(
    particleDiameterM: number,
    particleDensityKgM3: number,
    gasDensityKgM3: number,
    viscosityPaS: number,
  ): number {
    const densityDifference = particleDensityKgM3 - gasDensityKgM3;
    if (densityDifference <= 0) {
      throw new Error('Particle density must be greater than gas density.');
    }
    return (
      (CALCULATION_CONSTANTS.gravity * Math.pow(particleDiameterM, 2) * densityDifference) /
      (18 * viscosityPaS)
    );
  }

  static minimumParticleDiameter(
    flowRateM3S: number,
    widthM: number,
    lengthM: number,
    particleDensityKgM3: number,
    gasDensityKgM3: number,
    viscosityPaS: number,
  ): number {
    const densityDifference = particleDensityKgM3 - gasDensityKgM3;
    if (densityDifference <= 0) throw new Error('Particle density must be greater than gas density.');
    return Math.sqrt(
      (18 * viscosityPaS * flowRateM3S) /
      (densityDifference * CALCULATION_CONSTANTS.gravity * widthM * lengthM),
    );
  }

  // Nội suy hệ số α theo nhiệt độ (Bảng 2.1)
  static getAlphaTemperatureCorrection(temperatureC: number): number {
    const table = TEMPERATURE_ALPHA_TABLE;
    if (temperatureC <= table[0].temp) return table[0].alpha;
    if (temperatureC >= table[table.length - 1].temp) return table[table.length - 1].alpha;

    for (let i = 0; i < table.length - 1; i++) {
      if (temperatureC >= table[i].temp && temperatureC <= table[i + 1].temp) {
        const t1 = table[i].temp, a1 = table[i].alpha;
        const t2 = table[i + 1].temp, a2 = table[i + 1].alpha;
        return a1 + ((temperatureC - t1) * (a2 - a1)) / (t2 - t1);
      }
    }
    return 1.0;
  }

  static calculate(input: CalculateChamberDto): ChamberCalculationResult {
    // 1. Quy đổi lưu lượng Q ra m³/s nếu người dùng nhập m³/h (Q > 100 coi như m³/h)
    const flowRateM3H = input.flowRate > 100 ? input.flowRate : input.flowRate * 3600;
    const flowRateM3S = flowRateM3H / 3600;

    const viscosity = this.gasDynamicViscosity(input.temperature);
    const gasDensity = this.gasDensity(input.temperature);
    const velocity = this.chamberVelocity(flowRateM3S, input.width, input.height);

    const minimumDiameterM = this.minimumParticleDiameter(
      flowRateM3S,
      input.width,
      input.length,
      input.particleDensity,
      gasDensity,
      viscosity,
    );
    const minimumDiameterMicron = minimumDiameterM * 1e6;

    // Tính vận tốc lắng & hiệu suất cơ bản cho hạt đơn lẻ (nếu có)
    const singleDiameterM = input.particleDiameter ?? minimumDiameterM;
    const settlingVelocity = this.settlingVelocity(
      singleDiameterM,
      input.particleDensity,
      gasDensity,
      viscosity,
    );

    const efficiencyFraction = Math.max(
      0,
      Math.min(1, (settlingVelocity * input.width * input.length) / flowRateM3S),
    );

    // 2. Tính toán phân cấp hạt (Ví dụ 2 & 3)
    let gradedEfficiency: ChamberCalculationResult['gradedEfficiency'];
    let cleanGasFlowRateM3H = flowRateM3H;

    if (input.particleFractions && input.particleFractions.length > 0) {
      const C_b = input.dustConcentration ?? 10; // g/m³
      const G_b = (flowRateM3H * C_b) / 1000; // Tải lượng bụi kg/h (Công thức B19)
      const G_v = gasDensity * flowRateM3H; // Lưu lượng trọng lượng khí vào (B15)
      const y_v = C_b / gasDensity; // % bụi theo khối lượng (B16)
      const G_s = G_v * ((100 - y_v / 10) / 100); // Khối lượng khí sạch (B17)
      cleanGasFlowRateM3H = G_s / gasDensity; // Q_s (m³/h) (B18)

      let totalCapturedDustKgH = 0;
      const fractionResults = input.particleFractions.map((item) => {
        const dM = item.diameterMicron * 1e-6;
        const v_ts = this.settlingVelocity(dM, input.particleDensity, gasDensity, viscosity);
        
        // Hiệu suất từng dải: η = min(100%, (v_ts * L * B / Q) * 100)
        let eta = ((v_ts * input.length * input.width) / flowRateM3S) * 100;
        eta = Math.max(0, Math.min(100, eta));

        const capturedMass = (item.weightPercent / 100) * G_b * (eta / 100); // (B20, B21)
        totalCapturedDustKgH += capturedMass;

        return {
          diameterMicron: item.diameterMicron,
          weightPercent: item.weightPercent,
          settlingVelocityMS: v_ts,
          efficiencyPercent: eta,
          capturedMassKgH: capturedMass,
        };
      });

      const remainingDustKgH = G_b - totalCapturedDustKgH; // (B24)
      const totalEfficiencyPercent = (totalCapturedDustKgH / G_b) * 100;
      const outletConcentrationMgM3 = (remainingDustKgH * 1e6) / cleanGasFlowRateM3H; // mg/m³ (B25)

      gradedEfficiency = {
        fractionResults,
        totalEfficiencyPercent,
        outletConcentrationMgM3,
        capturedDustKgH: totalCapturedDustKgH,
        remainingDustKgH,
      };
    }

    // 3. Tính toán đường ống dẫn và quạt hút (Mục 2.4 & 2.5 - Ví dụ 3)
    let ductAndFan: ChamberCalculationResult['ductAndFan'];
    if (input.ductVelocity || input.localResistanceSum) {
      const v_duct = input.ductVelocity ?? 15; // Mặc định 15 m/s
      const cleanGasFlowRateM3S = cleanGasFlowRateM3H / 3600;

      // Công thức B26: Đường kính ống dẫn d0 = 2 * sqrt(Qs / (pi * v))
      const ductDiameterM = 2 * Math.sqrt(cleanGasFlowRateM3S / (Math.PI * v_duct));
      const actualDuctVelocityMS = (4 * cleanGasFlowRateM3S) / (Math.PI * Math.pow(ductDiameterM, 2)); // B27

      // Công thức B28: Tổn thất ma sát ΔP_ms = R * ld * α * β
      const alpha = this.getAlphaTemperatureCorrection(input.temperature);
      const frictionLossPa =
        CALCULATION_CONSTANTS.defaultUnitFrictionLossR *
        CALCULATION_CONSTANTS.defaultDuctLengthLd *
        alpha *
        CALCULATION_CONSTANTS.defaultRoughnessFactorBeta;

      // Công thức B29: Tổn thất cục bộ P_cb = ∑ξ_i * (ρ * v² / 2)
      const sumXi = input.localResistanceSum ?? 2.5; // Giả định trở lực cục bộ
      const dynamicPressure = (gasDensity * Math.pow(actualDuctVelocityMS, 2)) / 2;
      const localLossPa = sumXi * dynamicPressure;

      // Công thức B30: Tổng tổn thất ống dẫn ΔP = ΔP_ms + ΔP_cb
      const totalDuctLossPa = frictionLossPa + localLossPa;

      // Công thức B31: Tổn thất toàn hệ thống ΔP_ht = ΔP_bl + ΔP
      const systemTotalLossPa = CALCULATION_CONSTANTS.defaultChamberPressureLoss + totalDuctLossPa;

      // Công thức B32: Công suất quạt N_q = (Q_s * ΔP_ht) / (3600 * 1000 * η)  (kW)
      const fanEfficiency = input.fanEfficiency ?? CALCULATION_CONSTANTS.defaultFanEfficiency;
      const fanPowerKW = (cleanGasFlowRateM3H * systemTotalLossPa) / (3600 * 1000 * fanEfficiency);

      ductAndFan = {
        cleanGasFlowRateM3H,
        cleanGasFlowRateM3S,
        ductDiameterM,
        actualDuctVelocityMS,
        frictionLossPa,
        localLossPa,
        totalDuctLossPa,
        systemTotalLossPa,
        fanPowerKW,
      };
    }

    const warnings = [...CALCULATION_WARNINGS];
    if (velocity > 0.3) {
      warnings.push('Vận tốc dòng khí trong buồng lắng lớn hơn 0.3 m/s, nên hạ thấp vận tốc để đạt hiệu quả lắng tối ưu.');
    }

    return {
      input: { ...input, flowRateM3H, flowRateM3S },
      gas: {
        dynamicViscosityPaS: viscosity,
        densityKgM3: gasDensity,
        chamberVelocityMS: velocity,
      },
      particle: {
        settlingVelocityMS: settlingVelocity,
        minimumDiameterM: minimumDiameterM,
        minimumDiameterMicron: minimumDiameterMicron,
      },
      efficiency: {
        fraction: efficiencyFraction,
        percent: efficiencyFraction * 100,
      },
      gradedEfficiency,
      ductAndFan,
      warnings,
    };
  }
}