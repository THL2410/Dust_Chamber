import {
  calculateDesign,
  gasDensity,
  gasDynamicViscosity,
  settlingVelocity,
  type DesignCalcInput,
} from './design-calculation';

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

  it('dải < 40 μm không có η (kể cả dải 30–40), các dải ≥ 40 μm lắng 100 % vì ≥ d_limit', () => {
    const eta = out.fractionResults.map((f) => f.efficiencyPercent);
    expect(eta.slice(0, 5)).toEqual(Array(5).fill(null)); // 0–5 … 30–40
    expect(eta.slice(5)).toEqual(Array(4).fill(100));
  });

  it('dải < 40 μm cũng không có nồng độ ra, nồng độ vào vẫn là Cb × %KL', () => {
    const first = out.fractionResults[0];
    expect(first.outletConcGM3).toBeNull();
    expect(first.inletConcGM3).toBeCloseTo(1.5, 6); // 15 g/m³ × 10 %
  });

  it('hiệu suất tổng = 62 % (chỉ các dải ≥ 40 μm), KHÔNG còn 72,06 % như giáo trình', () => {
    // Giáo trình tính cả hạt < 40 μm nên ra 72,06 %. Đề tài loại các hạt này khỏi buồng lắng,
    // mẫu số vẫn là tổng bụi nên η tổng = 24 + 21 + 10 + 7.
    expect(out.result.etaTotalPercent).toBeCloseTo(62, 6);
  });

  it('khối lượng thu chỉ gồm dải ≥ 40 μm: M1 = 62 % × 300 kg/h, M2 = 0', () => {
    expect(out.result.gbKgH).toBeCloseTo(300, 6); // 20000 m³/h × 15 g/m³
    expect(out.result.m1KgH).toBeCloseTo(186, 6);
    expect(out.result.m2KgH).toBeCloseTo(0, 6);
    expect(out.result.mtKgH).toBeCloseTo(186, 6);
    expect(out.result.mrKgH).toBeCloseTo(114, 6);
    expect(out.result.mnKgDay).toBeCloseTo(186 * 16, 6);
  });

  it('nồng độ bụi ra tính ra mg/m³ (B25), gồm cả bụi < 40 μm đi qua buồng', () => {
    expect(out.result.cbOutMgM3).toBeGreaterThan(5700);
    expect(out.result.cbOutMgM3).toBeLessThan(5850);
  });

  it('dải < 40 μm (kể cả 30–40) -> OTHER_DEVICE, các dải ≥ 40 μm -> FULL theo d_limit', () => {
    const reg = out.fractionResults.map((f) => f.regime);
    expect(reg.slice(0, 5)).toEqual(Array(5).fill('OTHER_DEVICE')); // 0–5 … 30–40
    expect(reg.slice(5)).toEqual(Array(4).fill('FULL'));
    expect(out.warnings.join(' ')).toMatch(/< 40 μm/);
  });
});

describe('calculateDesign – quy tắc 40 μm theo đề tài', () => {
  const partial = calculateDesign({
    ...base, flowRateM3H: 60000, temperatureC: 20, dustConcentrationGM3: 10, dustDensityKgM3: 2000,
    chamberHeightM: 2, chamberLengthM: 5, chamberWidthM: 3,
    fractions: [{ diameterFromMicron: 40, diameterMicron: 45, weightPercent: 100 }],
  });

  it('hạt 45 μm lắng kém vẫn tính theo công thức (PARTIAL), không đẩy sang thiết bị khác', () => {
    expect(partial.fractionResults[0].regime).toBe('PARTIAL');
  });

  it('η của dải PARTIAL đúng B14: η = v_ts × B×L / Q, và M2 = η × khối lượng dải', () => {
    const vts = settlingVelocity(45e-6, 2000, gasDensity(20), gasDynamicViscosity(20));
    const eta = (vts * 15) / (60000 / 3600);
    expect(eta).toBeLessThan(1);
    expect(partial.fractionResults[0].efficiencyPercent).toBeCloseTo(eta * 100, 6);
    expect(partial.result.etaTotalPercent).toBeCloseTo(eta * 100, 6);
    expect(partial.result.m1KgH).toBeCloseTo(0, 6);
    expect(partial.result.m2KgH).toBeCloseTo(eta * 600, 6); // 60000 m³/h × 10 g/m³ = 600 kg/h
  });

  it('hạt 20 μm luôn là OTHER_DEVICE dù buồng rất lớn, không có η', () => {
    const o = calculateDesign({
      ...base, flowRateM3H: 2000, temperatureC: 20, dustConcentrationGM3: 10, dustDensityKgM3: 3000,
      chamberHeightM: 3, chamberLengthM: 20, chamberWidthM: 6,
      fractions: [{ diameterFromMicron: 0, diameterMicron: 20, weightPercent: 100 }],
    });
    expect(o.fractionResults[0].regime).toBe('OTHER_DEVICE');
    expect(o.fractionResults[0].efficiencyPercent).toBeNull();
    expect(o.result.etaTotalPercent).toBeCloseTo(0, 6);
    expect(o.result.mtKgH).toBeCloseTo(0, 6);
    expect(o.result.mrKgH).toBeCloseTo(o.result.gbKgH as number, 6); // toàn bộ bụi đi qua buồng
  });

  it('dải đúng bằng 40 μm (30–40) là OTHER_DEVICE, dải 40–50 liền sau nối tiếp bình thường', () => {
    const o = calculateDesign({
      ...ex2,
      fractions: [
        { diameterFromMicron: 30, diameterMicron: 40, weightPercent: 50 },
        { diameterMicron: 50, weightPercent: 50 }, // cận dưới tự lấy 40
      ],
    });
    expect(o.fractionResults.map((f) => f.regime)).toEqual(['OTHER_DEVICE', 'FULL']);
    expect(o.fractionResults[1].dFromUm).toBe(40);
  });

  it('dải vắt qua mốc 40 μm bị từ chối kèm hướng dẫn tách dải', () => {
    const run = (fractions: NonNullable<DesignCalcInput['fractions']>) => () =>
      calculateDesign({ ...ex2, fractions });
    expect(run([{ diameterFromMicron: 30, diameterMicron: 50, weightPercent: 100 }])).toThrow(
      /vắt qua mốc 40 μm.*"30–40" và "40–50"/,
    );
    // cận dưới suy ra từ dải trước (20–30 rồi đến "30–60")
    expect(
      run([
        { diameterFromMicron: 0, diameterMicron: 30, weightPercent: 50 },
        { diameterMicron: 60, weightPercent: 50 },
      ]),
    ).toThrow(/"30–40" và "40–60"/);
    // dải mở có cận dưới < 40
    expect(run([{ diameterFromMicron: 30, openEnded: true, weightPercent: 100 }])).toThrow(
      /"30–40" và "> 40"/,
    );
  });

  it('dải mở có cận dưới đúng 40 μm là hợp lệ, đại diện 40 μm < d_limit 50 nên PARTIAL', () => {
    const o = calculateDesign({
      ...ex2,
      fractions: [{ diameterFromMicron: 40, openEnded: true, weightPercent: 100 }],
    });
    expect(o.fractionResults[0].regime).toBe('PARTIAL');
  });
});

describe('calculateDesign – Ví dụ 1 (DESIGN) chỉ với dữ liệu bắt buộc', () => {
  // Chỉ Q, t, ρb, d_min và một kích thước (L = 10 m chọn tùy ý, B×L không đổi theo L)
  const out = calculateDesign({
    ...base, flowRateM3H: 5000, temperatureC: 200, dustDensityKgM3: 1000,
    dMinTargetUm: 50, chamberLengthM: 10,
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

  it('B×L không đổi khi chọn L khác (L = 5 m)', () => {
    const o = calculateDesign({
      ...base, flowRateM3H: 5000, temperatureC: 200, dustDensityKgM3: 1000,
      dMinTargetUm: 50, chamberLengthM: 5,
    });
    expect(o.result.blM2).toBeCloseTo(out.result.blM2, 6);
  });

  it('thiếu Cb: Gv, Gs, Qs, Gb, ống và quạt đều null', () => {
    const r = out.result;
    for (const v of [r.gvKgH, r.yvPercent, r.gsKgH, r.qsM3H, r.gbKgH, r.d0M, r.vtMS,
      r.dpFrictionPa, r.pDynamicPa, r.pLocalPa, r.dpPipePa, r.dpSystemPa, r.fanPowerKw]) {
      expect(v).toBeNull();
    }
  });

  it('thiếu phân bố hạt: η tổng, M1, M2, Mt, Mn, Mr, nồng độ ra đều null và không có dải nào', () => {
    const r = out.result;
    for (const v of [r.etaTotalPercent, r.m1KgH, r.m2KgH, r.mtKgH, r.mnKgDay, r.mrKgH, r.cbOutMgM3]) {
      expect(v).toBeNull();
    }
    expect(out.fractionResults).toHaveLength(0);
  });

  it('báo thiếu Cb và thiếu phân bố hạt trong cảnh báo; không cảnh báo ống/quạt', () => {
    const w = out.warnings.join(' | ');
    expect(w).toMatch(/Chưa nhập nồng độ bụi Cb/);
    expect(w).toMatch(/Chưa nhập phân bố cỡ hạt/);
    expect(w).not.toMatch(/Σξ = 0/);
    expect(w).not.toMatch(/trong ống/);
  });

  it('các kết quả hình học và nhiệt động vẫn có số (μ, ρ, d_min, τ, α)', () => {
    const r = out.result;
    for (const v of [r.muPaS, r.rhoGasKgM3, r.dMinCalcUm, r.dLimitUm, r.tau1S, r.tau2S, r.alpha]) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});

describe('calculateDesign – thiếu từng phần dữ liệu tùy chọn', () => {
  const design = {
    ...base, flowRateM3H: 5000, temperatureC: 200, dustDensityKgM3: 1000, dMinTargetUm: 50, chamberLengthM: 10,
  };
  const bands = [{ diameterFromMicron: 40, diameterMicron: 60, weightPercent: 100 }];

  it('có phân bố hạt nhưng thiếu Cb: η tổng và η từng dải có số, khối lượng và nồng độ là null', () => {
    const o = calculateDesign({ ...design, fractions: bands });
    expect(o.result.etaTotalPercent).toBeCloseTo(100, 6); // dải 40–60 đại diện 60 μm ≥ d_limit 50
    expect(o.fractionResults[0].efficiencyPercent).toBeCloseTo(100, 6);
    expect(o.fractionResults[0].inletConcGM3).toBeNull();
    expect(o.fractionResults[0].outletConcGM3).toBeNull();
    for (const v of [o.result.m1KgH, o.result.m2KgH, o.result.mtKgH, o.result.mrKgH, o.result.cbOutMgM3,
      o.result.qsM3H, o.result.fanPowerKw]) {
      expect(v).toBeNull();
    }
    expect(o.warnings.join(' ')).toMatch(/Chưa nhập nồng độ bụi Cb/);
    expect(o.warnings.join(' ')).not.toMatch(/Chưa nhập phân bố/);
  });

  it('có Cb nhưng thiếu phân bố hạt: Gv, Gs, Qs, ống, quạt có số; η tổng, khối lượng thu, nồng độ ra null', () => {
    const o = calculateDesign({ ...design, dustConcentrationGM3: 10 });
    const r = o.result;
    expect(r.gbKgH).toBeCloseTo(50, 6); // 5000 m³/h × 10 g/m³
    for (const v of [r.gvKgH, r.yvPercent, r.gsKgH, r.qsM3H, r.d0M, r.vtMS, r.dpSystemPa, r.fanPowerKw]) {
      expect(Number.isFinite(v as number)).toBe(true);
    }
    for (const v of [r.etaTotalPercent, r.m1KgH, r.m2KgH, r.mtKgH, r.mnKgDay, r.mrKgH, r.cbOutMgM3]) {
      expect(v).toBeNull();
    }
    expect(o.warnings.join(' ')).toMatch(/Chưa nhập phân bố cỡ hạt/);
    expect(o.warnings.join(' ')).not.toMatch(/Chưa nhập nồng độ bụi/);
  });

  it('đủ Cb và phân bố hạt: mọi kết quả đều có số', () => {
    const o = calculateDesign({ ...design, dustConcentrationGM3: 10, fractions: bands });
    for (const v of Object.values(o.result)) {
      if (typeof v === 'number') expect(Number.isFinite(v)).toBe(true);
      else expect(v).not.toBeNull();
    }
  });
});

describe('calculateDesign – d_min mục tiêu < 40 μm', () => {
  const small = calculateDesign({
    ...base, flowRateM3H: 5000, temperatureC: 20, dustDensityKgM3: 2000, dMinTargetUm: 30, chamberLengthM: 10,
  });

  it('vẫn tính B×L bình thường', () => {
    expect(small.mode).toBe('DESIGN');
    expect(small.result.dLimitUm).toBe(30);
    expect(small.result.blM2).toBeGreaterThan(0);
    expect(small.result.uMS).toBeCloseTo(0.18, 3);
  });

  it('kèm cảnh báo buồng rất lớn, nên cân nhắc thiết bị khác', () => {
    expect(small.warnings.join(' ')).toMatch(/d_min mục tiêu 30 μm < 40 μm: buồng rất lớn/);
    expect(small.warnings.join(' ')).toMatch(/thiết bị lọc bụi khác/);
  });

  it('d_min mục tiêu ≥ 40 μm thì không có cảnh báo này', () => {
    const ok = calculateDesign({
      ...base, flowRateM3H: 5000, temperatureC: 20, dustDensityKgM3: 2000, dMinTargetUm: 40, chamberLengthM: 10,
    });
    expect(ok.warnings.join(' ')).not.toMatch(/buồng rất lớn/);
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

describe('calculateDesign – dải không giới hạn trên (> 60 μm)', () => {
  const open = calculateDesign({
    ...base, flowRateM3H: 10500, temperatureC: 20, dustConcentrationGM3: 10, dustDensityKgM3: 700,
    chamberHeightM: 2, chamberLengthM: 8, chamberWidthM: 4,
    fractions: [
      { diameterFromMicron: 0, diameterMicron: 20, weightPercent: 2.5 },
      { diameterFromMicron: 20, diameterMicron: 30, weightPercent: 2.5 },
      { diameterFromMicron: 40, diameterMicron: 60, weightPercent: 70 },
      { diameterFromMicron: 60, openEnded: true, weightPercent: 25 },
    ],
  });

  it('dải mở có dToUm = null, đường kính đại diện = cận dưới', () => {
    const last = open.fractionResults[3];
    expect(last.dToUm).toBeNull();
    expect(last.dFromUm).toBe(60);
    expect(last.dRepUm).toBe(60);
  });

  it('dải > 60 μm không bị xếp vào thiết bị khác', () => {
    expect(open.fractionResults[3].regime).not.toBe('OTHER_DEVICE');
  });

  it('báo lỗi khi dải mở không có cận dưới', () => {
    expect(() =>
      calculateDesign({ ...ex2, fractions: [{ openEnded: true, weightPercent: 100 }] }),
    ).toThrow(/cận dưới/);
  });
});
