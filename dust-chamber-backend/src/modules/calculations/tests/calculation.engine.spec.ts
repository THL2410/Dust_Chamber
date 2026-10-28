import { CalculationEngine } from '../calculation.engine';

describe('CalculationEngine', () => {
  it('calculates gas density using the analyzed PDF approximation', () => {
    expect(CalculationEngine.gasDensity(0)).toBeCloseTo(1.293, 6);
  });

  it('calculates chamber velocity Q/(W*H)', () => {
    expect(CalculationEngine.chamberVelocity(2, 2, 1)).toBeCloseTo(1, 8);
  });

  it('calculates a positive Stokes settling velocity', () => {
    const mu = CalculationEngine.gasDynamicViscosity(20);
    const v = CalculationEngine.settlingVelocity(50e-6, 1800, 1.2, mu);
    expect(v).toBeGreaterThan(0);
  });

  it('calculates minimum particle diameter as a positive value', () => {
    const d = CalculationEngine.minimumParticleDiameter(
      2.5, 2, 4, 1800, 1.2, CalculationEngine.gasDynamicViscosity(40),
    );
    expect(d).toBeGreaterThan(0);
  });

  it('limits idealized efficiency to 0–100 percent', () => {
    const result = CalculationEngine.calculate({
      flowRate: 2.5,
      temperature: 40,
      length: 4,
      width: 2,
      height: 1.5,
      particleDensity: 1800,
      particleDiameter: 500e-6,
    });
    expect(result.efficiency.percent).toBeGreaterThanOrEqual(0);
    expect(result.efficiency.percent).toBeLessThanOrEqual(100);
  });

  it('rejects particles that are not denser than the gas', () => {
    expect(() =>
      CalculationEngine.settlingVelocity(50e-6, 1, 1.2, 1.8e-5),
    ).toThrow(/Particle density must be greater than gas density/);
  });
});
