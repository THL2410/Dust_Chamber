/**
 * Trộn dữ liệu đang lưu với phần người dùng sửa (PATCH). Hàm thuần, không đụng DB.
 *
 * Quy ước (giống hợp đồng PATCH của nhóm trưởng):
 * - trường không gửi (undefined) -> giữ giá trị đang lưu
 * - trường gửi giá trị mới       -> dùng giá trị mới
 * - trường gửi null              -> xóa giá trị (chỉ với trường được phép trống)
 * - particleFractions            -> gửi thì thay TOÀN BỘ phân bố hạt (null hoặc [] = xóa hết), không gửi thì giữ cũ
 */

export const INPUT_KEYS = [
  'flowRateM3H', 'temperatureC', 'dustConcentrationGM3', 'dustDensityKgM3',
  'dMinTargetUm', 'chamberHeightM', 'chamberLengthM', 'chamberWidthM',
  'gasVelocityMS', 'operatingHoursPerDay', 'pipeVelocityMS', 'pipeDiameterM',
  'pipeLengthM', 'frictionRPaM', 'roughnessBeta', 'localResistanceSum',
  'chamberPressureDropPa', 'fanEfficiency',
] as const;

export type InputKey = (typeof INPUT_KEYS)[number];

/** Các trường không thể để trống (cột NOT NULL không có giá trị mặc định ở DB) */
export const REQUIRED_INPUT_KEYS: readonly InputKey[] = ['flowRateM3H', 'temperatureC', 'dustDensityKgM3'];

export interface FractionPayload {
  diameterFromMicron?: number;
  diameterMicron?: number;
  openEnded?: boolean;
  weightPercent: number;
}

export type InputPatch = Partial<Record<InputKey, number | null>>;

export interface MergedCalcRequest extends Partial<Record<InputKey, number | null>> {
  particleFractions: FractionPayload[];
}

/** Dòng dust_fractions đọc từ DB -> dạng gửi vào hàm tính. d_to_um = null nghĩa là dải "> d_from". */
export function fractionRowToPayload(row: {
  d_from_um: number | string;
  d_to_um: number | string | null;
  mass_percent: number | string;
}): FractionPayload {
  const base = { diameterFromMicron: Number(row.d_from_um), weightPercent: Number(row.mass_percent) };
  return row.d_to_um === null || row.d_to_um === undefined
    ? { ...base, openEnded: true }
    : { ...base, diameterMicron: Number(row.d_to_um) };
}

export function mergeCalculationUpdate(
  stored: InputPatch,
  storedFractions: FractionPayload[],
  patch: InputPatch & { particleFractions?: FractionPayload[] | null },
): MergedCalcRequest {
  const merged: MergedCalcRequest = { particleFractions: storedFractions };
  for (const key of INPUT_KEYS) {
    const incoming = patch[key];
    const value = incoming !== undefined ? incoming : stored[key];
    if (value === null || value === undefined) {
      if (REQUIRED_INPUT_KEYS.includes(key)) {
        throw new Error(`Không được để trống ${key}.`);
      }
      merged[key] = null;
    } else {
      merged[key] = value;
    }
  }
  if (patch.particleFractions !== undefined) {
    merged.particleFractions = patch.particleFractions ?? [];
  }
  return merged;
}
