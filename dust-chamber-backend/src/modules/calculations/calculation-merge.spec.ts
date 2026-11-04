import { fractionRowToPayload, mergeCalculationUpdate, type InputPatch } from './calculation-merge';

/** Phương án DESIGN đã lưu: Q, t, ρb, d_min, L (H, B, Cb để trống), vận tốc khí 0,18 */
const storedDesign: InputPatch = {
  flowRateM3H: 5000, temperatureC: 200, dustConcentrationGM3: null, dustDensityKgM3: 1000,
  dMinTargetUm: 50, chamberHeightM: null, chamberLengthM: 10, chamberWidthM: null,
  gasVelocityMS: 0.18, operatingHoursPerDay: 16, pipeVelocityMS: 15, pipeDiameterM: null,
  pipeLengthM: 32, frictionRPaM: 4.05, roughnessBeta: 1, localResistanceSum: 0,
  chamberPressureDropPa: 245, fanEfficiency: 0.6,
};
const storedFractions = [
  { diameterFromMicron: 0, diameterMicron: 40, weightPercent: 30 },
  { diameterFromMicron: 40, openEnded: true, weightPercent: 70 },
];

describe('mergeCalculationUpdate', () => {
  it('trường không gửi giữ nguyên, trường gửi giá trị mới thì đổi', () => {
    const m = mergeCalculationUpdate(storedDesign, storedFractions, { flowRateM3H: 22000 });
    expect(m.flowRateM3H).toBe(22000);
    expect(m.temperatureC).toBe(200);
    expect(m.chamberLengthM).toBe(10);
    expect(m.particleFractions).toEqual(storedFractions);
  });

  it('trường gửi null thì xóa (để chuyển DESIGN <-> CHECK), kể cả Cb', () => {
    const m = mergeCalculationUpdate(
      { ...storedDesign, dustConcentrationGM3: 15, chamberHeightM: 2, chamberWidthM: 4 },
      storedFractions,
      { chamberLengthM: null, dMinTargetUm: null, dustConcentrationGM3: null },
    );
    expect(m.chamberLengthM).toBeNull();
    expect(m.dMinTargetUm).toBeNull();
    expect(m.dustConcentrationGM3).toBeNull();
    expect(m.chamberHeightM).toBe(2);
  });

  it('số 0 hợp lệ không bị coi là trống (Σξ = 0)', () => {
    const m = mergeCalculationUpdate({ ...storedDesign, localResistanceSum: 2.5 }, [], { localResistanceSum: 0 });
    expect(m.localResistanceSum).toBe(0);
  });

  it('particleFractions gửi lên thì thay toàn bộ, null hoặc [] thì xóa hết, không gửi thì giữ cũ', () => {
    const replaced = [{ diameterMicron: 60, weightPercent: 100 }];
    expect(mergeCalculationUpdate(storedDesign, storedFractions, { particleFractions: replaced }).particleFractions)
      .toEqual(replaced);
    expect(mergeCalculationUpdate(storedDesign, storedFractions, { particleFractions: null }).particleFractions)
      .toEqual([]);
    expect(mergeCalculationUpdate(storedDesign, storedFractions, { particleFractions: [] }).particleFractions)
      .toEqual([]);
    expect(mergeCalculationUpdate(storedDesign, storedFractions, {}).particleFractions).toEqual(storedFractions);
  });

  it('không cho xóa Q, nhiệt độ, ρb', () => {
    expect(() => mergeCalculationUpdate(storedDesign, [], { flowRateM3H: null })).toThrow(/flowRateM3H/);
    expect(() => mergeCalculationUpdate(storedDesign, [], { dustDensityKgM3: null })).toThrow(/dustDensityKgM3/);
  });
});

describe('fractionRowToPayload', () => {
  it('đọc dải thường từ DB (số có thể là chuỗi do driver pg)', () => {
    expect(fractionRowToPayload({ d_from_um: '40', d_to_um: '50', mass_percent: '24' })).toEqual({
      diameterFromMicron: 40, diameterMicron: 50, weightPercent: 24,
    });
  });

  it('d_to_um = null là dải mở "> d_from", không bị đọc thành cận trên 0', () => {
    expect(fractionRowToPayload({ d_from_um: 60, d_to_um: null, mass_percent: 25 })).toEqual({
      diameterFromMicron: 60, openEnded: true, weightPercent: 25,
    });
  });
});
