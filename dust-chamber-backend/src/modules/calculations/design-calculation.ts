import { CALCULATION_CONSTANTS } from './calculations.constants';
import { CalculationEngine } from './calculation.engine';

export interface DesignCalcInput {
  flowRateM3H: number;
  temperatureC: number;
  dustConcentrationGM3: number;
  dustDensityKgM3: number;
  dMinTargetUm?: number | null;
  chamberHeightM?: number | null;
  chamberLengthM?: number | null;
  chamberWidthM?: number | null;
  gasVelocityMS: number;
  operatingHoursPerDay: number;
  pipeVelocityMS: number;
  pipeDiameterM?: number | null;
  pipeLengthM: number;
  frictionRPaM: number;
  roughnessBeta: number;
  localResistanceSum: number;
  chamberPressureDropPa: number;
  fanEfficiency: number;
  fractions?: { diameterMicron: number; weightPercent: number }[];
}

export interface DesignCalcOutput {
  mode: 'CHECK' | 'DESIGN';
  warnings: string[];
  // khớp 1-1 với cột của entity DesignResults (trừ projectId)
  result: {
    hM: number; lM: number; bM: number;
    muPaS: number; rhoGasKgM3: number; uMS: number;
    tau1S: number; tau2S: number; lMinM: number;
    blM2: number; dMinCalcUm: number; dLimitUm: number; isRetained: boolean;
    gvKgH: number; yvPercent: number; gsKgH: number; qsM3H: number; gbKgH: number;
    m1KgH: number; m2KgH: number; mtKgH: number; mnKgDay: number; mrKgH: number;
    cbOutMgM3: number; etaTotalPercent: number;
    d0M: number; vtMS: number; alpha: number;
    dpFrictionPa: number; pDynamicPa: number; pLocalPa: number; dpPipePa: number;
    dpSystemPa: number; fanPowerKw: number;
  };
}

export function calculateDesign(i: DesignCalcInput): DesignCalcOutput {
  const g = CALCULATION_CONSTANTS.gravity;
  const warnings: string[] = [];

  const Qh = i.flowRateM3H;
  const Q = Qh / 3600; // m3/s
  const mu = CalculationEngine.gasDynamicViscosity(i.temperatureC); // B1
  const rho = CalculationEngine.gasDensity(i.temperatureC); // B2
  const dRho = i.dustDensityKgM3 - rho;
  if (dRho <= 0) throw new Error('Khối lượng riêng của bụi phải lớn hơn của khí.');
  const settle = (dUm: number) =>
    CalculationEngine.settlingVelocity(dUm * 1e-6, i.dustDensityKgM3, rho, mu);

  const hasAll = !!(i.chamberHeightM && i.chamberLengthM && i.chamberWidthM);
  const mode: 'CHECK' | 'DESIGN' = hasAll ? 'CHECK' : 'DESIGN';

  let H = i.chamberHeightM ?? 0;
  let L = i.chamberLengthM ?? 0;
  let B = i.chamberWidthM ?? 0;
  let v = i.gasVelocityMS;
  let dLimit: number;
  let u: number;

  if (mode === 'DESIGN') {
    dLimit = i.dMinTargetUm as number;
    u = settle(dLimit); // vận tốc lắng của hạt d_min
    // B·H = Q/v ; B·L = Q/u
    if (H && L) {
      warnings.push('Chế độ DESIGN: H và L đã được tính lại từ d_min và v, giá trị L bạn nhập không được dùng.');
    }
    if (H) { B = Q / (v * H); L = Q / (u * B); }
    else if (L) { B = Q / (u * L); H = Q / (v * B); }
    else { H = Q / (v * B); L = Q / (u * B); }
  } else {
    v = Q / (B * H); // vận tốc khí thực trong buồng
    const dCalc = Math.sqrt((18 * mu * Q) / (dRho * g * B * L)) * 1e6;
    dLimit = Math.ceil(dCalc / 5) * 5; // làm tròn lên bội số 5
    u = settle(dLimit);
  }

  const blM2 = B * L; // B11
  const dMinCalcUm = Math.sqrt((18 * mu * Q) / (dRho * g * blM2)) * 1e6; // B10
  const tau1S = H / u; // B4: thời gian lắng
  const tau2S = L / v; // B5: thời gian lưu
  const lMinM = v * tau1S; // B6
  const isRetained = tau1S <= tau2S;
  if (v > 0.3) warnings.push('Vận tốc khí trong buồng > 0,3 m/s, dễ cuốn bụi trở lại.');

  // Cân bằng khí - bụi
  const gvKgH = rho * Qh; // B15
  const gbKgH = (Qh * i.dustConcentrationGM3) / 1000; // B19
  const yvPercent = i.dustConcentrationGM3 / rho / 10; // B16 (g/kg -> %)
  const gsKgH = gvKgH * (1 - yvPercent / 100); // B17
  const qsM3H = gsKgH / rho; // B18

  // Bụi thu được theo từng dải (B20-B22)
  let m1 = 0, m2 = 0;
  const fr = i.fractions ?? [];
  for (const f of fr) {
    const mass = (f.weightPercent / 100) * gbKgH;
    if (f.diameterMicron >= dLimit) m1 += mass; // lắng 100 %
    else {
      const eta = Math.min(1, (settle(f.diameterMicron) * blM2) / Q);
      m2 += mass * eta;
    }
  }
  if (!fr.length) warnings.push('Chưa nhập phân bố cỡ hạt nên lượng bụi thu và hiệu suất tổng = 0.');
  const mtKgH = m1 + m2;
  const mnKgDay = mtKgH * i.operatingHoursPerDay; // B23
  const mrKgH = gbKgH - mtKgH; // B24
  const cbOutMgM3 = qsM3H > 0 ? (mrKgH * 1e6) / qsM3H : 0; // B25
  const etaTotalPercent = gbKgH > 0 ? (mtKgH / gbKgH) * 100 : 0;

  // Ống dẫn và quạt
  const Qs = qsM3H / 3600;
  const d0M = i.pipeDiameterM ?? 2 * Math.sqrt(Qs / (Math.PI * i.pipeVelocityMS)); // B26
  const vtMS = (4 * Qs) / (Math.PI * d0M * d0M); // B27
  const alpha = CalculationEngine.getAlphaTemperatureCorrection(i.temperatureC);
  const dpFrictionPa = i.frictionRPaM * i.pipeLengthM * alpha * i.roughnessBeta; // B28
  const pDynamicPa = (rho * vtMS * vtMS) / 2;
  const pLocalPa = i.localResistanceSum * pDynamicPa; // B29
  const dpPipePa = dpFrictionPa + pLocalPa; // B30
  const dpSystemPa = i.chamberPressureDropPa + dpPipePa; // B31
  const fanPowerKw = (qsM3H * dpSystemPa) / (3600 * 1000 * i.fanEfficiency); // B32

  return {
    mode,
    warnings,
    result: {
      hM: H, lM: L, bM: B, muPaS: mu, rhoGasKgM3: rho, uMS: u,
      tau1S, tau2S, lMinM, blM2, dMinCalcUm, dLimitUm: dLimit, isRetained,
      gvKgH, yvPercent, gsKgH, qsM3H, gbKgH,
      m1KgH: m1, m2KgH: m2, mtKgH, mnKgDay, mrKgH, cbOutMgM3, etaTotalPercent,
      d0M, vtMS, alpha, dpFrictionPa, pDynamicPa, pLocalPa, dpPipePa, dpSystemPa, fanPowerKw,
    },
  };
}