export const CALCULATION_CONSTANTS = {
  gravity: 9.81, // m/s²
  referenceGasViscosity: 17.17e-6, // Pa·s, ở 0 °C
  referenceGasDensity: 1.293, // kg/m³, ở 0 °C
  viscosityTemperatureConstant: 387, // °C
  celsiusToKelvinOffset: 273,

  // Giá trị mặc định cho buồng lắng, đường ống và quạt (mục 2.1, 2.4 và 2.5 trong tài liệu)
  defaultGasVelocityInChamber: 0.18, // m/s (vận tốc khí trong buồng, B7)
  defaultOperatingHoursPerDay: 16, // giờ/ngày (B23)
  defaultPipeVelocity: 15, // m/s (khoảng 10 – 20 m/s)
  defaultUnitFrictionLossR: 4.05, // Pa/m (tổn thất áp suất trên 1 m ống)
  defaultDuctLengthLd: 32, // m (chiều dài toàn bộ ống dẫn và ống khói)
  defaultChamberPressureLoss: 245, // Pa (tổn thất áp suất trong buồng lắng)
  defaultRoughnessFactorBeta: 1.0, // hệ số nhám thành ống
  defaultLocalResistanceSum: 0, // Σξ; PDF không cho giá trị, người dùng tự nhập
  defaultFanEfficiency: 0.6, // hiệu suất quạt hút mặc định (60%); PDF không quy định
} as const;

// Bảng tra hệ số α theo nhiệt độ (Bảng 2.1 trong tài liệu)
export const TEMPERATURE_ALPHA_TABLE: { temp: number; alpha: number }[] = [
  { temp: 5, alpha: 1.03 },
  { temp: 10, alpha: 1.02 },
  { temp: 15, alpha: 1.01 },
  { temp: 20, alpha: 1.00 },
  { temp: 25, alpha: 0.99 },
  { temp: 30, alpha: 0.98 },
  { temp: 35, alpha: 0.97 },
  { temp: 40, alpha: 0.96 },
  { temp: 45, alpha: 0.95 },
  { temp: 50, alpha: 0.94 },
  { temp: 60, alpha: 0.93 },
  { temp: 70, alpha: 0.92 },
];