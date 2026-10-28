import {
  CALCULATION_CONSTANTS,
  CALCULATION_WARNINGS,
} from './calculations.constants';
import { CalculateChamberDto } from './dto/calculate-chamber.dto';

export interface ChamberCalculationResult {
  input: {
    flowRate: number;
    temperature: number;
    length: number;
    width: number;
    height: number;
    particleDensity: number;
    particleDiameter: number;
    gasDensity: number;
  };
  gas: {
    dynamicViscosityPaS: number;
    densityKgM3: number;
    chamberVelocityMS: number;
  };
  particle: {
    settlingVelocityMS: number;
    minimumDiameterM: number;
  };
  efficiency: {
    fraction: number;
    percent: number;
  };
  warnings: string[];
}

export class CalculationEngine {
  static gasDynamicViscosity(temperatureC: number): number {
    const c = CALCULATION_CONSTANTS;
    const kelvinRatio = (c.celsiusToKelvinOffset + temperatureC) / c.celsiusToKelvinOffset;
    if (kelvinRatio <= 0) {
      throw new Error('Temperature is outside the valid range for the viscosity relation.');
    }

    // PDF relation: μt = μ0 * 387/(387+t) * ((273+t)/273)^(3/2)
    const denominator = c.viscosityTemperatureConstant + temperatureC;
    if (denominator <= 0) {
      throw new Error('Temperature is outside the valid range for the viscosity relation.');
    }

    return (
      c.referenceGasViscosity *
      (c.viscosityTemperatureConstant / denominator) *
      Math.pow(kelvinRatio, 1.5)
    );
  }

  static gasDensity(temperatureC: number): number {
    const c = CALCULATION_CONSTANTS;
    const kelvin = c.celsiusToKelvinOffset + temperatureC;
    if (kelvin <= 0) {
      throw new Error('Temperature must be above absolute zero.');
    }
    // PDF approximation: rho_g = 1.293 * 273/(273+t)
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
      throw new Error('Particle density must be greater than gas density for this settling model.');
    }
    // Stokes relation as used in the PDF analysis.
    return (
      CALCULATION_CONSTANTS.gravity *
      particleDiameterM ** 2 *
      densityDifference /
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
    if (densityDifference <= 0) {
      throw new Error('Particle density must be greater than gas density for this settling model.');
    }
    // d_min = sqrt(18 μ Q / ((rho_p-rho_g) g W L))
    return Math.sqrt(
      (18 * viscosityPaS * flowRateM3S) /
      (densityDifference * CALCULATION_CONSTANTS.gravity * widthM * lengthM),
    );
  }

  static calculate(input: CalculateChamberDto): ChamberCalculationResult {
    const viscosity = this.gasDynamicViscosity(input.temperature);
    const gasDensity = input.gasDensity ?? this.gasDensity(input.temperature);
    const velocity = this.chamberVelocity(input.flowRate, input.width, input.height);
    const settlingVelocity = this.settlingVelocity(
      input.particleDiameter,
      input.particleDensity,
      gasDensity,
      viscosity,
    );
    const minimumDiameter = this.minimumParticleDiameter(
      input.flowRate,
      input.width,
      input.length,
      input.particleDensity,
      gasDensity,
      viscosity,
    );

    // Idealized PDF relation: η = min(1, v_s * W * L / Q).
    const efficiencyFraction = Math.max(
      0,
      Math.min(1, (settlingVelocity * input.width * input.length) / input.flowRate),
    );

    const warnings = [...CALCULATION_WARNINGS];
    if (input.particleDiameter < minimumDiameter) {
      warnings.push(
        'Particle diameter is below the calculated ideal minimum diameter; idealized collection efficiency is below 100%.',
      );
    }
    if (velocity > 3) {
      warnings.push('Calculated chamber velocity is relatively high; review design assumptions and flow distribution.');
    }

    return {
      input: {
        flowRate: input.flowRate,
        temperature: input.temperature,
        length: input.length,
        width: input.width,
        height: input.height,
        particleDensity: input.particleDensity,
        particleDiameter: input.particleDiameter,
        gasDensity,
      },
      gas: {
        dynamicViscosityPaS: viscosity,
        densityKgM3: gasDensity,
        chamberVelocityMS: velocity,
      },
      particle: {
        settlingVelocityMS: settlingVelocity,
        minimumDiameterM: minimumDiameter,
      },
      efficiency: {
        fraction: efficiencyFraction,
        percent: efficiencyFraction * 100,
      },
      warnings,
    };
  }
}
