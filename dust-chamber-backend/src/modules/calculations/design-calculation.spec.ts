import { calculateDesign, type DesignCalcInput } from './design-calculation';

/** Giá trị mặc định giống calculations.constants.ts */
const base = {
  gasVelocityMS: 0.18, operatingHoursPerDay: 16, pipeVelocityMS: 15, pipeLengthM: 32,
  frictionRPaM: 4.05, roughnessBeta: 1, localResistanceSum: 0, chamberPressureDropPa: 245, fanEfficiency: 0.6,
};

const ex2Fractions = [
  [0, 5, 10], [5, 10, 6.5], [10, 20, 9.5], [20, 30, 5], [30, 40, 7],
  [40, 50, 24], [50, 60, 21], [60, 70, 10], [70, 80, 7],
].map(([a, b, c]) => ({ diameterFromMicron: a, diameterMicron: b, weightPercent: c }));

const ex2: DesignCalcInput = {
  ...base, flowRateM3H: 20000, temperatureC: 40, dustConcentrationGM3: 15, dustDensityKgM3: 3000,
  chamberHeightM: 2, chamberLengthM: 8, chamberWidthM: 4, fractions: ex2Fractions,
};

describe('calculateDesign – Ví dụ 2 giáo trình (CHECK)', () => {
  const out = calculateDesign(ex2);

  it('nhận đúng chế độ và tính μ, ρk (B1, B2)', () => {
    expect(out.mode).toBe('CHECK');
    expect(out.result.muPaS * 1e6).toBeCloseTo(19.1, 1);
    expect(out.result.rhoGasKgM3).toBeCloseTo(1.127, 2);
  });

  it('d_min ≈ 45,04 μm và chọn 50 μm (B10)', () => {
    expect(out.result.dMinCalcUm).toBeCloseTo(45.04, 1);
    expect(out.result.dLimitUm).toBe(50);
  });

  it('uMS là vận tốc khí ngang Q/(B·H) = 0,694 m/s (B3), không phải vận tốc lắng', () => {
    expect(out.result.uMS).toBeCloseTo(20000 / 3600 / (4 * 2), 3);
    expect(out.result.vtsLimitMS).toBeCloseTo(0.214, 2);
  });

  it('hiệu suất từng dải (B14) khớp bảng giáo trình', () => {
    const eta = out.fractionResults.map((f) => f.efficiencyPercent);
    [1.21, 4.95, 19.7, 44.35, 78.91, 100, 100, 100, 100].forEach((e, i) => {
      expect(eta[i]).toBeCloseTo(e, 0);
    });
  });

  it('hiệu suất tổng ≈ 72,06 % (sai số < 0,1)', () => {
    expect(Math.abs(out.result.etaTotalPercent - 72.06)).toBeLessThan(0.1);
  });

  it('nồng độ bụi ra tính ra mg/m³ (B25)', () => {
    expect(out.result.cbOutMgM3).toBeGreaterThan(4000);
    expect(out.result.cbOutMgM3).toBeLessThan(4500);
  });

  it('dải < 40 μm -> OTHER_DEVICE, 40–50 -> PARTIAL/FULL theo d_limit', () => {
    const reg = out.fractionResults.map((f) => f.regime);
    expect(reg.slice(0, 4)).toEqual(Array(4).fill('OTHER_DEVICE')); // 0–5 … 20–30
    expect(reg[4]).toBe('PARTIAL'); // 30–40: đại diện 40 μm, chưa đủ d_limit 50
    expect(reg.slice(5)).toEqual(Array(4).fill('FULL'));
    expect(out.warnings.join(' ')).toMatch(/< 40 μm/);
  });
});

describe('calculateDesign – quy tắc 40 μm theo đề tài', () => {
  it('hạt 45 μm lắng kém vẫn tính theo công thức (PARTIAL), không đẩy sang thiết bị khác', () => {
    const o = calculateDesign({
      ...base, flowRateM3H: 60000, temperatureC: 20, dustConcentrationGM3: 10, dustDensityKgM3: 2000,
      chamberHeightM: 2, chamberLengthM: 5, chamberWidthM: 3,
      fractions: [{ diameterFromMicron: 40, diameterMicron: 45, weightPercent: 100 }],
    });
    expect(o.fractionResults[0].regime).toBe('PARTIAL');
  });

  it('hạt 20 μm luôn là OTHER_DEVICE dù buồng rất lớn', () => {
    const o = calculateDesign({
      ...base, flowRateM3H: 2000, temperatureC: 20, dustConcentrationGM3: 10, dustDensityKgM3: 3000,
      chamberHeightM: 3, chamberLengthM: 20, chamberWidthM: 6,
      fractions: [{ diameterFromMicron: 0, diameterMicron: 20, weightPercent: 100 }],
    });
    expect(o.fractionResults[0].regime).toBe('OTHER_DEVICE');
  });
});

describe('calculateDesign – Ví dụ 1 (DESIGN)', () => {
  const out = calculateDesign({
    ...base, flowRateM3H: 5000, temperatureC: 200, dustConcentrationGM3: 10, dustDensityKgM3: 1000,
    dMinTargetUm: 50, chamberLengthM: 10, fractions: [{ diameterMicron: 60, weightPercent: 100 }],
  });

  it('B×L ≈ 26,2–26,4 m² và B ≈ 2,6 m khi L = 10 m', () => {
    expect(out.mode).toBe('DESIGN');
    expect(out.result.blM2).toBeGreaterThan(26.0);
    expect(out.result.blM2).toBeLessThan(26.5);
    expect(out.result.bM).toBeCloseTo(2.63, 1);
  });

  it('vận tốc khí ngang giữ đúng 0,18 m/s', () => {
    expect(out.result.uMS).toBeCloseTo(0.18, 3);
  });
});

describe('calculateDesign – isRetained ở chế độ CHECK có d_min mục tiêu', () => {
  it('đạt khi d_min tính được <= mục tiêu', () => {
    const o = calculateDesign({ ...ex2, dMinTargetUm: 50 });
    expect(o.result.isRetained).toBe(true);
  });
  it('không đạt + cảnh báo khi mục tiêu nhỏ hơn d_min tính được', () => {
    const o = calculateDesign({ ...ex2, dMinTargetUm: 30 });
    expect(o.result.isRetained).toBe(false);
    expect(o.warnings.join(' ')).toMatch(/chưa đạt mục tiêu/);
  });
});

describe('calculateDesign – cảnh báo', () => {
  it('cảnh báo khi Σξ = 0', () => {
    expect(calculateDesign(ex2).warnings.join(' ')).toMatch(/Σξ = 0/);
  });
  it('không cảnh báo Σξ khi đã nhập', () => {
    expect(calculateDesign({ ...ex2, localResistanceSum: 2.5 }).warnings.join(' ')).not.toMatch(/Σξ = 0/);
  });
});
