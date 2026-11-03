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
  /** Cb (g/m³). Bỏ trống thì không tính được các đại lượng cần lượng bụi (Gv, Gs, Qs, ống, quạt, khối lượng thu) */
  dustConcentrationGM3?: number | null;
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
  fractions?: {
    diameterFromMicron?: number;
    /** Cận trên của dải; bỏ trống khi openEnded */
    diameterMicron?: number;
    /** Dải không giới hạn trên (vd > 60 μm): đường kính đại diện = cận dưới */
    openEnded?: boolean;
    weightPercent: number;
  }[];
}

/** Kết quả tính riêng cho một dải hạt (tương ứng bảng dust_fractions + fraction_results) */
export interface FractionCalcResult {
  dFromUm: number;
  /** null = dải không giới hạn trên (> dFromUm) */
  dToUm: number | null;
  massPercent: number;
  dRepUm: number; // đường kính đại diện = cận trên của dải
  settlingVelocityMS: number; // B13
  /** B14 (100 nếu d >= d_limit). null với dải < 40 μm (không tính trong buồng lắng) */
  efficiencyPercent: number | null;
  /** Cb × % khối lượng. null khi chưa nhập Cb */
  inletConcGM3: number | null;
  /** inlet × (1 − η). null khi chưa nhập Cb hoặc dải < 40 μm */
  outletConcGM3: number | null;
  regime: 'FULL' | 'PARTIAL' | 'OTHER_DEVICE';
}

export interface DesignCalcOutput {
  mode: 'CHECK' | 'DESIGN';
  warnings: string[];
  fractionResults: FractionCalcResult[];
  result: {
    hM: number; lM: number; bM: number;
    muPaS: number; rhoGasKgM3: number;
    /** B3: vận tốc khí chuyển động ngang u = Q/(B·H) (m/s) */
    uMS: number;
    /** Vận tốc lắng cuối cùng của hạt d_limit (m/s), B13 */
    vtsLimitMS: number;
    tau1S: number; tau2S: number; lMinM: number;
    blM2: number; dMinCalcUm: number; dLimitUm: number; isRetained: boolean;
    alpha: number;
    /* Các đại lượng dưới đây là null khi thiếu dữ liệu đầu vào (xem calculateDesign) */
    /** Cần Cb */
    gvKgH: number | null; yvPercent: number | null; gsKgH: number | null; qsM3H: number | null;
    gbKgH: number | null;
    /** Cần Cb và phân bố hạt */
    m1KgH: number | null; m2KgH: number | null; mtKgH: number | null; mnKgDay: number | null;
    mrKgH: number | null; cbOutMgM3: number | null;
    /** Chỉ cần phân bố hạt (η tổng = Σ %KL × η từng dải, không phụ thuộc Cb) */
    etaTotalPercent: number | null;
    /** Cần Cb (qua lưu lượng khí sạch Qs) */
    d0M: number | null; vtMS: number | null;
    dpFrictionPa: number | null; pDynamicPa: number | null; pLocalPa: number | null; dpPipePa: number | null;
    dpSystemPa: number | null; fanPowerKw: number | null;
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
  let isRetained = tau1S <= tau2S * (1 + REL_TOL);
  // Chế độ CHECK có nhập d_min mục tiêu: buồng đạt khi d_min tính được <= d_min mục tiêu.
  // (Nếu không có mục tiêu thì τ1 ≤ τ2 luôn đúng vì d_limit được làm tròn lên từ d_min tính được.)
  if (mode === 'CHECK' && i.dMinTargetUm) {
    isRetained = dMinCalcUm <= i.dMinTargetUm * (1 + REL_TOL);
    if (!isRetained) {
      warnings.push(
        `Buồng hiện tại chỉ giữ được hạt từ ${dMinCalcUm.toFixed(1)} μm, chưa đạt mục tiêu ${i.dMinTargetUm} μm. Cần tăng B×L (hiện ${blM2.toFixed(2)} m²).`,
      );
    }
  }
  if (v > 0.3) warnings.push('Vận tốc khí trong buồng > 0,3 m/s, dễ cuốn bụi trở lại.');

  // d_min mục tiêu < 40 μm: vẫn tính B×L bình thường nhưng báo buồng sẽ rất lớn
  const limitUm = C.settlerMinDiameterUm;
  if (i.dMinTargetUm && i.dMinTargetUm < limitUm) {
    warnings.push(
      `d_min mục tiêu ${i.dMinTargetUm} μm < ${limitUm} μm: buồng rất lớn (B×L = ${blM2.toFixed(1)} m²), nên cân nhắc dùng thiết bị lọc bụi khác.`,
    );
  }

  // Cân bằng khí - bụi: cần Cb, thiếu Cb thì trả null
  const cb = i.dustConcentrationGM3 ?? null;
  const gvKgH = cb !== null ? rho * Qh : null; // B15
  const gbKgH = cb !== null ? (Qh * cb) / 1000 : null; // B19
  const yvPercent = cb !== null ? cb / rho / 10 : null; // B16 (g/kg -> %)
  const gsKgH = gvKgH !== null && yvPercent !== null ? gvKgH * (1 - yvPercent / 100) : null; // B17
  const qsM3H = gsKgH !== null ? gsKgH / rho : null; // B18

  // Kết quả theo từng dải (B13, B14, B20-B21); diameterMicron = cận trên của dải.
  // Quy tắc đề tài: dải nằm hoàn toàn dưới 40 μm -> OTHER_DEVICE, KHÔNG tính η, không cộng vào
  // lượng bụi thu (M1, M2); chúng coi như đi qua buồng nên nằm trong mẫu số của η tổng.
  let m1 = 0;
  let m2 = 0;
  let capturedFraction = 0; // Σ (%KL / 100 × η từng dải); dải < 40 μm có η = 0
  const fr = i.fractions ?? [];
  const hasFractions = fr.length > 0;
  const fractionResults: FractionCalcResult[] = [];
  let prevTo = 0;
  for (const f of fr) {
    let dFrom: number;
    let dTo: number | null;
    let dRep: number;
    if (f.openEnded) {
      dFrom = f.diameterFromMicron ?? prevTo;
      if (!(dFrom > 0)) throw new Error('Dải không giới hạn trên cần có cận dưới lớn hơn 0.');
      dTo = null;
      dRep = dFrom; // lấy cận dưới để tính thiên về an toàn
      prevTo = dFrom;
    } else {
      if (f.diameterMicron === undefined) throw new Error('Mỗi dải hạt cần có cận trên.');
      dTo = f.diameterMicron;
      dFrom = f.diameterFromMicron ?? (prevTo < dTo ? prevTo : 0);
      dRep = dTo;
      prevTo = dTo;
    }
    // Dải vắt qua mốc 40 μm không phân loại được: bắt người dùng tách dải
    if (dFrom < limitUm && (dTo === null || dTo > limitUm)) {
      throw new Error(
        dTo === null
          ? `Dải > ${dFrom} μm có cận dưới nhỏ hơn ${limitUm} μm nên vắt qua mốc ${limitUm} μm. Hãy tách thành "${dFrom}–${limitUm}" và "> ${limitUm}".`
          : `Dải ${dFrom}–${dTo} μm vắt qua mốc ${limitUm} μm. Hãy tách thành "${dFrom}–${limitUm}" và "${limitUm}–${dTo}".`,
      );
    }
    const vts = settle(dRep);
    const inlet = cb !== null ? (cb * f.weightPercent) / 100 : null;
    const belowLimit = dTo !== null && dTo <= limitUm; // cả dải < 40 μm
    let eta: number | null = null; // tỉ lệ 0..1
    let regime: FractionCalcResult['regime'] = 'OTHER_DEVICE';
    if (!belowLimit) {
      // d >= 40 μm: đủ d_limit thì FULL, chưa đủ thì PARTIAL (η theo B14)
      const full = dRep >= dLimit;
      eta = full ? 1 : Math.min(1, (vts * blM2) / Q); // B14
      regime = full ? 'FULL' : 'PARTIAL';
      capturedFraction += (f.weightPercent / 100) * eta;
      if (gbKgH !== null) {
        const mass = (f.weightPercent / 100) * gbKgH;
        if (full) m1 += mass; // lắng 100 %
        else m2 += mass * eta;
      }
    }
    fractionResults.push({
      dFromUm: dFrom,
      dToUm: dTo,
      massPercent: f.weightPercent,
      dRepUm: dRep,
      settlingVelocityMS: vts,
      efficiencyPercent: eta === null ? null : eta * 100,
      inletConcGM3: inlet,
      outletConcGM3: inlet !== null && eta !== null ? inlet * (1 - eta) : null,
      regime,
    });
  }
  const otherDevice = fractionResults.filter((f) => f.regime === 'OTHER_DEVICE');
  if (otherDevice.length) {
    const pct = otherDevice.reduce((s, f) => s + f.massPercent, 0);
    warnings.push(
      `${otherDevice.length} dải hạt < ${limitUm} μm (${pct.toFixed(1)}% khối lượng): không tính hiệu suất và lượng bụi thu trong buồng lắng, nên dùng thiết bị lọc bụi khác, xem phần gợi ý.`,
    );
  }
  if (cb === null) {
    warnings.push(
      'Chưa nhập nồng độ bụi Cb: không tính lượng khí và bụi (Gv, Gs, Qs), lượng bụi thu, ống dẫn và quạt.',
    );
  }
  if (!hasFractions) {
    warnings.push(
      'Chưa nhập phân bố cỡ hạt: không tính hiệu suất tổng, lượng bụi thu (M1, M2) và nồng độ bụi ra.',
    );
  } else {
    const sum = fr.reduce((s, f) => s + f.weightPercent, 0);
    if (Math.abs(sum - 100) > 0.01) {
      warnings.push(`Tổng % khối lượng các dải hạt = ${sum.toFixed(2)}%, khác 100%.`);
    }
  }
  // η tổng = Σ %KL × η từng dải (chia cho tổng bụi, gồm cả dải < 40 μm) nên không cần Cb
  const etaTotalPercent = hasFractions ? capturedFraction * 100 : null;
  const hasMass = gbKgH !== null && hasFractions;
  const mtKgH = hasMass ? m1 + m2 : null;
  const mnKgDay = mtKgH !== null ? mtKgH * i.operatingHoursPerDay : null; // B23
  const mrKgH = mtKgH !== null && gbKgH !== null ? gbKgH - mtKgH : null; // B24
  const cbOutMgM3 =
    mrKgH !== null && qsM3H !== null ? (qsM3H > 0 ? (mrKgH * 1e6) / qsM3H : 0) : null; // B25

  // Ống dẫn và quạt: cần lưu lượng khí sạch Qs nên cần Cb
  const alpha = alphaTemperatureCorrection(i.temperatureC);
  let d0M: number | null = null;
  let vtMS: number | null = null;
  let dpFrictionPa: number | null = null;
  let pDynamicPa: number | null = null;
  let pLocalPa: number | null = null;
  let dpPipePa: number | null = null;
  let dpSystemPa: number | null = null;
  let fanPowerKw: number | null = null;
  if (qsM3H !== null) {
    const Qs = qsM3H / 3600;
    d0M = i.pipeDiameterM ?? 2 * Math.sqrt(Qs / (Math.PI * i.pipeVelocityMS)); // B26
    vtMS = (4 * Qs) / (Math.PI * d0M * d0M); // B27
    if (vtMS < 10 || vtMS > 20) {
      warnings.push(`Vận tốc khí trong ống = ${vtMS.toFixed(1)} m/s, ngoài khoảng khuyến nghị 10–20 m/s.`);
    }
    if (i.localResistanceSum === 0) {
      warnings.push('Σξ = 0: chưa tính tổn thất cục bộ (co, cửa vào/ra), công suất quạt có thể thấp hơn thực tế.');
    }
    const tMin = TEMPERATURE_ALPHA_TABLE[0].temp;
    const tMax = TEMPERATURE_ALPHA_TABLE[TEMPERATURE_ALPHA_TABLE.length - 1].temp;
    if (i.temperatureC < tMin || i.temperatureC > tMax) {
      warnings.push(`Bảng 2.1 chỉ có α cho ${tMin}–${tMax} °C; ngoài khoảng này dùng α = ${alpha}.`);
    }
    dpFrictionPa = i.frictionRPaM * i.pipeLengthM * alpha * i.roughnessBeta; // B28
    pDynamicPa = (rho * vtMS * vtMS) / 2;
    pLocalPa = i.localResistanceSum * pDynamicPa; // B29
    dpPipePa = dpFrictionPa + pLocalPa; // B30
    dpSystemPa = i.chamberPressureDropPa + dpPipePa; // B31
    fanPowerKw = (qsM3H * dpSystemPa) / (3600 * 1000 * i.fanEfficiency); // B32
  }

  return {
    mode,
    warnings,
    fractionResults,
    result: {
      hM: H, lM: L, bM: B, muPaS: mu, rhoGasKgM3: rho, uMS: v, vtsLimitMS: uSettle,
      tau1S, tau2S, lMinM, blM2, dMinCalcUm, dLimitUm: dLimit, isRetained,
      gvKgH, yvPercent, gsKgH, qsM3H, gbKgH,
      m1KgH: hasMass ? m1 : null, m2KgH: hasMass ? m2 : null, mtKgH, mnKgDay, mrKgH, cbOutMgM3, etaTotalPercent,
      d0M, vtMS, alpha, dpFrictionPa, pDynamicPa, pLocalPa, dpPipePa, dpSystemPa, fanPowerKw,
    },
  };
}
