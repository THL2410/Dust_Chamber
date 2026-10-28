/**
 * Constants and assumptions from the settling-chamber PDF analysis.
 * Review these against the exact edition/page before engineering use.
 */
export const CALCULATION_CONSTANTS = {
  gravity: 9.81, // m/s²
  referenceGasViscosity: 17.17e-6, // Pa·s, at 0 °C per the analyzed PDF
  referenceGasDensity: 1.293, // kg/m³, at 0 °C per the analyzed PDF
  viscosityTemperatureConstant: 387, // °C, empirical relation used in PDF
  celsiusToKelvinOffset: 273,
} as const;

export const CALCULATION_WARNINGS: string[] = [
  'Stokes settling velocity assumes the particle is in the applicable low-Reynolds-number regime.',
  'The gas-property relations are approximations transcribed from the analyzed PDF and require technical review.',
  'Collection efficiency uses the idealized settling-chamber relation and does not model turbulence, re-entrainment, or non-uniform flow.',
  'This calculation is an educational estimate, not a certified engineering design.',
];