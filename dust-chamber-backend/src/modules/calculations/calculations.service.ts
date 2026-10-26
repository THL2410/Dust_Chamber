import { BadRequestException, Injectable } from '@nestjs/common';
import { CalculateChamberDto } from './dto/calculate-chamber.dto';

const G = 9.81;
// Bảng 2.1: hệ số hiệu chỉnh nhiệt độ α
const ALPHA_TABLE: [number, number][] = [
  [5, 1.03], [10, 1.02], [15, 1.01], [20, 1.0], [25, 0.99], [30, 0.98],
  [35, 0.97], [40, 0.96], [45, 0.95], [50, 0.94], [60, 0.93], [70, 0.92],
];

const round = (n: number, d = 4) => Number(n.toFixed(d));
const ceil1 = (n: number) => Math.ceil(n * 10) / 10; // làm tròn lên 0.1 m

@Injectable()
export class CalculationsService {
  // B1
  private viscosity(t: number) {
    return 17.17e-6 * (387 / (387 + t)) * Math.pow((273 + t) / 273, 1.5);
  }
  // B2
  private gasDensity(t: number) {
    return 1.293 * (273 / (273 + t));
  }
  // Nội suy α theo Bảng 2.1
  private alpha(t: number) {
    const first = ALPHA_TABLE[0], last = ALPHA_TABLE[ALPHA_TABLE.length - 1];
    if (t <= first[0]) return first[1];
    if (t >= last[0]) return last[1];
    for (let i = 0; i < ALPHA_TABLE.length - 1; i++) {
      const [t1, a1] = ALPHA_TABLE[i];
      const [t2, a2] = ALPHA_TABLE[i + 1];
      if (t >= t1 && t <= t2) return a1 + ((a2 - a1) * (t - t1)) / (t2 - t1);
    }
    return 1;
  }

  calculate(dto: CalculateChamberDto) {
    const { temperature: t, flowRate: Qh, dustConcentration: Cb, dustDensity: rhoB } = dto;
    const Q = Qh / 3600; // m3/s
    const mu = this.viscosity(t);
    const rhoK = this.gasDensity(t);

    // ---------- 1. Kích thước buồng ----------
    let L: number, B: number, H: number;
    let design: Record<string, number> | null = null;

    if (dto.chamberSize) {
      ({ length: L, width: B, height: H } = dto.chamberSize);
    } else {
      const d = dto.targetDiameter! * 1e-6;
      const v = dto.chamberVelocity ?? 0.18;
      const BL = (18 * mu * Q) / (rhoB * G * d * d); // B11
      L = dto.designLength!;
      B = ceil1(BL / L);
      H = ceil1(Q / (B * v)); // từ u = Q/(B·H)
      design = { BxL: round(BL, 3), chamberVelocity: v };
    }

    const u = Q / (B * H); // B3
    const dminCalc =
      Math.sqrt((18 * mu * Q) / ((rhoB - rhoK) * G * B * L)) * 1e6; // B10 (µm)
    const tau1 = H / u;  // B4 (khi v = u)
    const tau2 = L / u;  // B5

    // ---------- 2. Hiệu suất theo phân cấp ----------
    let fractionResults: any[] | null = null;
    let totalEfficiency = 0;

    if (dto.fractions) {
      const sum = dto.fractions.reduce((s, f) => s + f.percent, 0);
      if (Math.abs(sum - 100) > 0.5)
        throw new BadRequestException(`Tổng % khối lượng các phân cấp phải bằng 100 (hiện tại: ${sum})`);
      if (dto.fractions.some((f) => f.dMax <= f.dMin))
        throw new BadRequestException('dMax phải lớn hơn dMin trong mỗi phân cấp');

      fractionResults = dto.fractions.map((f) => {
        const d = f.dMax * 1e-6;
        const vts = (G * d * d * rhoB) / (18 * mu); // B13
        const eta = Math.min(1, (vts * L * B) / Q); // B14, tối đa 100%
        const cIn = (Cb * f.percent) / 100;
        totalEfficiency += (f.percent * eta); // cộng dồn % × η
        return {
          range: `${f.dMin}-${f.dMax}`,
          percent: f.percent,
          settlingVelocity: round(vts, 4),
          efficiency: round(eta * 100, 2),
          inletConcentration: round(cIn, 4),
          outletConcentration: round(cIn * (1 - eta), 4),
        };
      });
    }
    // totalEfficiency hiện đang ở đơn vị "%", vì percent(0-100) × eta(0-1)

    // ---------- 3. Cân bằng khối lượng ----------
    const Gv = rhoK * Qh;                                  // B15 (kg/h)
    const yv = ((Cb / 1000) / rhoK) * 100;                 // B16 (%)
    const Gs = Gv * ((100 - yv) / 100);                    // B17
    const Qs = Gs / rhoK;                                  // B18 (m3/h)
    const Gb = (Qh * Cb) / 1000;                           // B19 (kg/h)

    let dustBalance: any = { Gv, yv, Gs, Qs, Gb };
    if (dto.fractions) {
      const Mt = (Gb * totalEfficiency) / 100;             // B22
      const Mr = Gb - Mt;                                  // B24
      dustBalance = {
        ...dustBalance,
        Mt, Mn: Mt * 16,                                   // B23 (16 h/ngày)
        Mr,
        outletConcentration_mgm3: (Mr * 1e6) / Qs,         // B25
      };
    }
    Object.keys(dustBalance).forEach((k) => (dustBalance[k] = round(dustBalance[k], 3)));

    // ---------- 4. Ống dẫn + quạt ----------
    let ductResult: any = null;
    if (dto.duct) {
      const p = dto.duct;
      const vSel = p.velocity ?? 15;
      const QsS = Qs / 3600;
      const d0 = Math.ceil(2 * Math.sqrt(QsS / (Math.PI * vSel)) * 100) / 100; // B26, làm tròn lên 1 cm
      const vt = (4 * QsS) / (Math.PI * d0 * d0);                              // B27
      const dPms = (p.frictionR ?? 4.05) * (p.length ?? 32) * this.alpha(t) * (p.roughnessBeta ?? 1); // B28
      const Pd = (rhoK * vt * vt) / 2;
      const dPcb = (p.sumLocalResistance ?? 0) * Pd;                           // B29
      const dP = dPms + dPcb;                                                  // B30
      const dPht = (p.chamberPressureDrop ?? 245) + dP;                        // B31
      const Nq = (Qs * dPht) / (3600 * 1000 * (p.fanEfficiency ?? 0.7));      // B32
      ductResult = {
        diameter: round(d0, 3), actualVelocity: round(vt, 2),
        frictionLoss: round(dPms, 2), localLoss: round(dPcb, 2),
        ductLoss: round(dP, 2), systemLoss: round(dPht, 2),
        fanPower_kW: round(Nq, 3),
      };
    }

    return {
      mode: dto.chamberSize ? 'evaluate' : 'design',
      gas: { viscosity: mu, density: round(rhoK, 4) },
      chamber: {
        length: L, width: B, height: H,
        horizontalVelocity: round(u, 4),
        tau1: round(tau1, 2), tau2: round(tau2, 2),
        isSettlingOk: tau1 <= tau2,
        dminCalculated: round(dminCalc, 2),
        design,
      },
      efficiency: dto.fractions
        ? { total: round(totalEfficiency, 2), fractions: fractionResults }
        : null,
      dustBalance,
      duct: ductResult,
    };
  }
}