import {
  CALCULATION_CONSTANTS as C,
  TEMPERATURE_ALPHA_TABLE,
} from './calculations.constants';

/* ------------------------------------------------------------------ */
/* Kiểu dữ liệu                                                        */
/* ------------------------------------------------------------------ */

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
    muPaS: number; rhoGasKgM3: number;
    /** Vận tốc lắng của hạt d_limit (m/s). Lưu ý: KHÔNG phải vận tốc ngang u trong PDF. */
    uMS: number;
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

/* ------------------------------------------------------------------ */
/* Các hàm vật lý cơ bản (trước đây nằm trong calculation.engine.ts)   */
/* ------------------------------------------------------------------ */

/** B1: hệ số nhớt động lực của khí ở t °C (Pa·s) */
export function gasDynamicViscosity(tC: number): number {
  const kelvinRatio = (C.celsiusToKelvinOffset + tC) / C.celsiusToKelvinOffset;
  const denominator = C.viscosityTemperatureConstant + tC;
  if (kelvinRatio <= 0 || denominator <= 0) {
    throw new Error('Nhiệt độ nằm ngoài khoảng cho phép.');
  }
  return (
    C.referenceGasViscosity *
    (C.viscosityTemperatureConstant / denominator) *
    Math.pow(kelvinRatio, 1.5)
  );
}

/** B2: khối lượng riêng của khí thải ở t °C (kg/m³) */
export function gasDensity(tC: number): number {
  const kelvin = C.celsiusToKelvinOffset + tC;
  if (kelvin <= 0) throw new Error('Nhiệt độ phải lớn hơn độ không tuyệt đối.');
  return C.referenceGasDensity * (C.celsiusToKelvinOffset / kelvin);
}

/** B12/B13: vận tốc lắng cuối cùng (Stokes), d tính bằng m */
export function settlingVelocity(dM: number, rhoB: number, rhoK: number, mu: number): number {
  return (C.gravity * dM * dM * (rhoB - rhoK)) / (18 * mu);
}

/** Bảng 2.1: hệ số hiệu chỉnh α theo nhiệt độ (nội suy tuyến tính, chặn ở hai đầu bảng) */
export function alphaTemperatureCorrection(tC: number): number {
  const t = TEMPERATURE_ALPHA_TABLE;
  if (tC <= t[0].temp) return t[0].alpha;
  if (tC >= t[t.length - 1].temp) return t[t.length - 1].alpha;
  for (let k = 0; k < t.length - 1; k++) {
    if (tC >= t[k].temp && tC <= t[k + 1].temp) {
      const r = (tC - t[k].temp) / (t[k + 1].temp - t[k].temp);
      return t[k].alpha + r * (t[k + 1].alpha - t[k].alpha);
    }
  }
  return 1;
}

/* ------------------------------------------------------------------ */
/* Tính toán chính                                                      */
/* ------------------------------------------------------------------ */

const REL_TOL = 1e-6; // sai số tương đối khi so sánh số thực

export function calculateDesign(i: DesignCalcInput): DesignCalcOutput {
  const g = C.gravity;
  const warnings: string[] = [];

  const Qh = i.flowRateM3H;
  const Q = Qh / 3600; // m³/s
  const mu = gasDynamicViscosity(i.temperatureC); // B1
  const rho = gasDensity(i.temperatureC); // B2
  const dRho = i.dustDensityKgM3 - rho;
  if (dRho <= 0) throw new Error('Khối lượng riêng của bụi phải lớn hơn của khí.');
  const settle = (dUm: number) => settlingVelocity(dUm * 1e-6, i.dustDensityKgM3, rho, mu);

  const hasAll = !!(i.chamberHeightM && i.chamberLengthM && i.chamberWidthM);
  const mode: 'CHECK' | 'DESIGN' = hasAll ? 'CHECK' : 'DESIGN';

  let H = i.chamberHeightM ?? 0;
  let L = i.chamberLengthM ?? 0;
  let B = i.chamberWidthM ?? 0;
  let v = i.gasVelocityMS; // vận tốc khí ngang trong buồng
  let dLimit: number;
  let uSettle: number; // vận tốc lắng của hạt d_limit

  if (mode === 'DESIGN') {
    dLimit = i.dMinTargetUm as number;
    uSettle = settle(dLimit);
    const differs = (a: number, b: number) => Math.abs(a - b) > REL_TOL * Math.max(a, b);

    if (H && B) {
      // Người dùng đã chốt H và B: vận tốc khí là hệ quả, L suy ra từ d_min (B11)
      v = Q / (B * H);
      L = Q / (uSettle * B);
      if (differs(v, i.gasVelocityMS)) {
        warnings.push(
          `Chế độ DESIGN: H và B đã cho nên vận tốc khí trong buồng được tính lại = ${v.toFixed(3)} m/s (không dùng ${i.gasVelocityMS} m/s).`,
        );
      }
      if (i.chamberLengthM) warnings.push('Chế độ DESIGN: L được tính lại từ d_min, giá trị L nhập vào không được dùng.');
    } else if (B) {
      // B (có thể kèm L): B·H = Q/v, B·L = Q/u
      H = Q / (v * B);
      L = Q / (uSettle * B);
      if (i.chamberLengthM && differs(L, i.chamberLengthM)) {
        warnings.push('Chế độ DESIGN: L được tính lại từ d_min, giá trị L nhập vào không được dùng.');
      }
    } else if (H) {
      B = Q / (v * H);
      L = Q / (uSettle * B);
      if (i.chamberLengthM) warnings.push('Chế độ DESIGN: L được tính lại từ d_min, giá trị L nhập vào không được dùng.');
    } else if (L) {
      B = Q / (uSettle * L);
      H = Q / (v * B);
    } else {
      throw new Error('Chế độ DESIGN cần ít nhất một trong H, L, B.');
    }
  } else {
    v = Q / (B * H); // B3
    const dCalc = Math.sqrt((18 * mu * Q) / (dRho * g * B * L)) * 1e6;
    dLimit = Math.ceil(dCalc / 5) * 5; // làm tròn lên bội số 5 μm
    uSettle = settle(dLimit);
  }

  const blM2 = B * L; // B11
  const dMinCalcUm = Math.sqrt((18 * mu * Q) / (dRho * g * blM2)) * 1e6; // B10
  const tau1S = H / uSettle; // B4: thời gian hạt rơi chạm đáy
  const tau2S = L / v; // B5: thời gian lưu
  const lMinM = v * tau1S; // B6
  // Cho phép sai số số thực: ở DESIGN, τ1 = τ2 theo cấu trúc
  const isRetained = tau1S <= tau2S * (1 + REL_TOL);
  if (v > 0.3) warnings.push('Vận tốc khí trong buồng > 0,3 m/s, dễ cuốn bụi trở lại.');

  // Cân bằng khí - bụi
  const gvKgH = rho * Qh; // B15
  const gbKgH = (Qh * i.dustConcentrationGM3) / 1000; // B19
  const yvPercent = i.dustConcentrationGM3 / rho / 10; // B16 (g/kg -> %)
  const gsKgH = gvKgH * (1 - yvPercent / 100); // B17
  const qsM3H = gsKgH / rho; // B18

  // Bụi thu được theo từng dải (B20-B22); diameterMicron = cận trên của dải
  let m1 = 0;
  let m2 = 0;
  const fr = i.fractions ?? [];
  for (const f of fr) {
    const mass = (f.weightPercent / 100) * gbKgH;
    if (f.diameterMicron >= dLimit) {
      m1 += mass; // lắng 100 %
    } else {
      const eta = Math.min(1, (settle(f.diameterMicron) * blM2) / Q); // B14
      m2 += mass * eta;
    }
  }
  if (!fr.length) {
    warnings.push('Chưa nhập phân bố cỡ hạt nên lượng bụi thu và hiệu suất tổng = 0.');
  } else {
    const sum = fr.reduce((s, f) => s + f.weightPercent, 0);
    if (Math.abs(sum - 100) > 0.01) {
      warnings.push(`Tổng % khối lượng các dải hạt = ${sum.toFixed(2)}%, khác 100%.`);
    }
  }
  const mtKgH = m1 + m2;
  const mnKgDay = mtKgH * i.operatingHoursPerDay; // B23
  const mrKgH = gbKgH - mtKgH; // B24
  const cbOutMgM3 = qsM3H > 0 ? (mrKgH * 1e6) / qsM3H : 0; // B25
  const etaTotalPercent = gbKgH > 0 ? (mtKgH / gbKgH) * 100 : 0;

  // Ống dẫn và quạt
  const Qs = qsM3H / 3600;
  const d0M = i.pipeDiameterM ?? 2 * Math.sqrt(Qs / (Math.PI * i.pipeVelocityMS)); // B26
  const vtMS = (4 * Qs) / (Math.PI * d0M * d0M); // B27
  if (vtMS < 10 || vtMS > 20) {
    warnings.push(`Vận tốc khí trong ống = ${vtMS.toFixed(1)} m/s, ngoài khoảng khuyến nghị 10–20 m/s.`);
  }
  const alpha = alphaTemperatureCorrection(i.temperatureC);
  const tMin = TEMPERATURE_ALPHA_TABLE[0].temp;
  const tMax = TEMPERATURE_ALPHA_TABLE[TEMPERATURE_ALPHA_TABLE.length - 1].temp;
  if (i.temperatureC < tMin || i.temperatureC > tMax) {
    warnings.push(`Bảng 2.1 chỉ có α cho ${tMin}–${tMax} °C; ngoài khoảng này dùng α = ${alpha}.`);
  }
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
      hM: H, lM: L, bM: B, muPaS: mu, rhoGasKgM3: rho, uMS: uSettle,
      tau1S, tau2S, lMinM, blM2, dMinCalcUm, dLimitUm: dLimit, isRetained,
      gvKgH, yvPercent, gsKgH, qsM3H, gbKgH,
      m1KgH: m1, m2KgH: m2, mtKgH, mnKgDay, mrKgH, cbOutMgM3, etaTotalPercent,
      d0M, vtMS, alpha, dpFrictionPa, pDynamicPa, pLocalPa, dpPipePa, dpSystemPa, fanPowerKw,
    },
  };
}