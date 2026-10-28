export const CALCULATION_CONSTANTS = {
  gravity: 9.81, // m/s²
  referenceGasViscosity: 17.17e-6, // Pa·s, ở 0 °C
  referenceGasDensity: 1.293, // kg/m³, ở 0 °C
  viscosityTemperatureConstant: 387, // °C
  celsiusToKelvinOffset: 273,

  // Các hằng số mặc định cho đường ống & quạt (Theo mục 2.4 & 2.5 trong tài liệu)
  defaultUnitFrictionLossR: 4.05, // Pa/m (Tổn thất áp suất trên 1m ống)
  defaultDuctLengthLd: 32, // m (Chiều dài toàn bộ ống dẫn và ống khói)
  defaultChamberPressureLoss: 245, // Pa (Tổn thất áp suất trong buồng lắng)
  defaultRoughnessFactorBeta: 1.0, // Hệ số nhám thành ống
  defaultFanEfficiency: 0.7, // Hiệu suất quạt hút mặc định (70%)
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

export const CALCULATION_WARNINGS: string[] = [
  'Stokes settling velocity assumes the particle is in the applicable low-Reynolds-number regime.',
  'The gas-property relations are approximations transcribed from the analyzed PDF and require technical review.',
  'Collection efficiency uses the idealized settling-chamber relation and does not model turbulence, re-entrainment, or non-uniform flow.',
  'This calculation is an educational estimate, not a certified engineering design.',
];