export type DesignMode = 'CHECK' | 'DESIGN';
import { API_URL } from '../../config';

export type NumericField =
    | 'flow_rate_m3_h'
    | 'temperature_c'
    | 'dust_concentration_g_m3'
    | 'dust_density_kg_m3'
    | 'd_min_target_um'
    | 'chamber_height_m'
    | 'chamber_length_m'
    | 'chamber_width_m'
    | 'gas_velocity_m_s'
    | 'operating_hours_per_day'
    | 'pipe_velocity_m_s'
    | 'pipe_diameter_m'
    | 'pipe_length_m'
    | 'friction_r_pa_m'
    | 'roughness_beta'
    | 'local_resistance_sum'
    | 'chamber_pressure_drop_pa'
    | 'fan_efficiency';

export interface ParticleFractionForm {
    id: number;
    diameterFromMicron: string;
    diameterMicron: string;
    /** Dải không giới hạn trên (vd > 60 µm): chỉ nhập cận dưới */
    openEnded: boolean;
    weightPercent: string;
}

export type CalculationFormValues = { mode: DesignMode; particleFractions: ParticleFractionForm[] } & Record<NumericField, string>;
/** Hiển thị cho mọi mục không có số liệu (API trả null) */
export const NO_DATA = 'Không có số liệu';

/** Hạt < 40 µm không dùng buồng lắng (khớp settlerMinDiameterUm ở backend) */
export const SETTLER_MIN_UM = 40;

export type FractionRowErrors = Partial<Record<'diameterFromMicron' | 'diameterMicron' | 'weightPercent', string>>;
export type CalculationErrors = Partial<Record<NumericField, string>> & {
    fractions?: string;
    fractionRows?: Record<number, FractionRowErrors>;
};

export interface CalculationPayload {
    flowRateM3H: number;
    temperatureC: number;
    /** Bỏ trống được ở chế độ DESIGN */
    dustConcentrationGM3?: number;
    dustDensityKgM3: number;
    dMinTargetUm?: number;
    chamberHeightM?: number;
    chamberLengthM?: number;
    chamberWidthM?: number;
    gasVelocityMS?: number;
    operatingHoursPerDay?: number;
    pipeVelocityMS?: number;
    pipeDiameterM?: number;
    pipeLengthM?: number;
    frictionRPaM?: number;
    roughnessBeta?: number;
    localResistanceSum?: number;
    chamberPressureDropPa?: number;
    fanEfficiency?: number;
    particleFractions: {
        diameterFromMicron?: number;
        diameterMicron?: number;
        openEnded?: boolean;
        weightPercent: number;
    }[];
}

export type FractionRegime = 'FULL' | 'PARTIAL' | 'OTHER_DEVICE';

export interface CollectorSuggestion {
    id: number;
    code: string;
    name: string;
    typicalEfficiency: string;
}

export interface FractionView {
    dFromUm: number;
    /** null = dải không giới hạn trên */
    dToUm: number | null;
    massPercent: number;
    dRepUm: number;
    settlingVelocityMS: number;
    /** null với dải < 40 µm (không tính trong buồng lắng) */
    efficiencyPercent: number | null;
    /** null khi chưa nhập Cb */
    inletConcGM3: number | null;
    outletConcGM3: number | null;
    regime: FractionRegime;
    collectors: CollectorSuggestion[];
}

export interface CalculationApiResponse {
    message: string;
    projectId: number | null;
    mode: DesignMode;
    warnings: string[];
    input: { gasVelocityMS: number };
    result: {
        hM: number;
        lM: number;
        bM: number;
        /** B3: vận tốc khí ngang u = Q/(B·H) */
        uMS: number;
        /** Vận tốc lắng của hạt d_limit */
        vtsLimitMS: number;
        tau1S: number;
        tau2S: number;
        blM2: number;
        dMinCalcUm: number;
        dLimitUm: number;
        isRetained: boolean;
        /* null = không có số liệu (thiếu Cb hoặc phân bố hạt) */
        gbKgH: number | null;
        mtKgH: number | null;
        mnKgDay: number | null;
        mrKgH: number | null;
        qsM3H: number | null;
        cbOutMgM3: number | null;
        etaTotalPercent: number | null;
        d0M: number | null;
        vtMS: number | null;
        dpSystemPa: number | null;
        fanPowerKw: number | null;
    };
    fractions: FractionView[];
}

export class CalculationApiError extends Error {
    readonly status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'CalculationApiError';
        this.status = status;
    }
}

export const initialValues: CalculationFormValues = {
    mode: 'CHECK',
    flow_rate_m3_h: '',
    temperature_c: '',
    dust_concentration_g_m3: '',
    dust_density_kg_m3: '',
    d_min_target_um: '',
    chamber_height_m: '',
    chamber_length_m: '',
    chamber_width_m: '',
    gas_velocity_m_s: '0.18',
    operating_hours_per_day: '16',
    pipe_velocity_m_s: '15',
    pipe_diameter_m: '',
    pipe_length_m: '32',
    friction_r_pa_m: '4.05',
    roughness_beta: '1',
    local_resistance_sum: '0',
    chamber_pressure_drop_pa: '245',
    fan_efficiency: '0.6',
    particleFractions: [{ id: 1, diameterFromMicron: '0', diameterMicron: '', openEnded: false, weightPercent: '' }],
};

type Rule = { label: string; min?: number; max?: number; exclusiveMin?: boolean };

const rules: Record<NumericField, Rule> = {
    flow_rate_m3_h: { label: 'Lưu lượng khí', min: 0, exclusiveMin: true },
    temperature_c: { label: 'Nhiệt độ', min: -50, max: 1000 },
    dust_concentration_g_m3: { label: 'Nồng độ bụi', min: 0 },
    dust_density_kg_m3: { label: 'Khối lượng riêng bụi', min: 0, exclusiveMin: true },
    d_min_target_um: { label: 'Cỡ hạt mục tiêu', min: 0, exclusiveMin: true },
    chamber_height_m: { label: 'Chiều cao H', min: 0, exclusiveMin: true },
    chamber_length_m: { label: 'Chiều dài L', min: 0, exclusiveMin: true },
    chamber_width_m: { label: 'Chiều rộng B', min: 0, exclusiveMin: true },
    gas_velocity_m_s: { label: 'Vận tốc khí trong buồng', min: 0, exclusiveMin: true },
    operating_hours_per_day: { label: 'Giờ vận hành mỗi ngày', min: 0, max: 24 },
    pipe_velocity_m_s: { label: 'Vận tốc khí trong ống', min: 0, exclusiveMin: true },
    pipe_diameter_m: { label: 'Đường kính ống', min: 0, exclusiveMin: true },
    pipe_length_m: { label: 'Chiều dài ống', min: 0 },
    friction_r_pa_m: { label: 'Trở lực ma sát R', min: 0 },
    roughness_beta: { label: 'Hệ số β', min: 0 },
    local_resistance_sum: { label: 'Tổng hệ số trở lực cục bộ', min: 0 },
    chamber_pressure_drop_pa: { label: 'Tổn thất áp suất buồng', min: 0 },
    fan_efficiency: { label: 'Hiệu suất quạt', min: 0, exclusiveMin: true, max: 1 },
};

const optionalFields: NumericField[] = [
    'd_min_target_um', 'chamber_height_m', 'chamber_length_m',
    'chamber_width_m', 'pipe_diameter_m',
];

/** Dải chưa điền gì (không cận trên, không mở, không tỷ lệ). Ở chế độ DESIGN dải như vậy bị bỏ qua. */
export function isBlankFraction(fraction: ParticleFractionForm): boolean {
    return !fraction.openEnded
        && fraction.diameterMicron.trim() === ''
        && fraction.weightPercent.trim() === '';
}

/** Các dải thực sự được gửi đi: DESIGN bỏ dải trống, CHECK giữ nguyên để báo lỗi từng ô. */
function usedFractions(values: CalculationFormValues): ParticleFractionForm[] {
    return values.mode === 'DESIGN'
        ? values.particleFractions.filter((fraction) => !isBlankFraction(fraction))
        : values.particleFractions;
}

/** Cb chỉ bắt buộc ở chế độ CHECK; DESIGN có thể bỏ trống. */
function isOptionalField(key: NumericField, mode: DesignMode): boolean {
    return optionalFields.includes(key) || (mode === 'DESIGN' && key === 'dust_concentration_g_m3');
}

export function validateCalculation(values: CalculationFormValues): CalculationErrors {
    const errors: CalculationErrors = {};
    const fractionRows: Record<number, FractionRowErrors> = {};
    let totalWeightPercent = 0;
    let hasValidWeightPercent = true;

    for (const [key, rule] of Object.entries(rules) as [NumericField, Rule][]) {
        if (values.mode === 'CHECK' && key === 'd_min_target_um') continue;
        const raw = values[key].trim();
        if (!raw) {
            if (!isOptionalField(key, values.mode)) errors[key] = `Vui lòng nhập ${rule.label.toLowerCase()}.`;
            continue;
        }

        const value = Number(raw);
        if (!Number.isFinite(value)) {
            errors[key] = 'Vui lòng nhập một số hợp lệ.';
        } else if (rule.min !== undefined && (rule.exclusiveMin ? value <= rule.min : value < rule.min)) {
            errors[key] = rule.exclusiveMin ? `Giá trị phải lớn hơn ${rule.min}.` : `Giá trị phải từ ${rule.min} trở lên.`;
        } else if (rule.max !== undefined && value > rule.max) {
            errors[key] = `Giá trị không được vượt quá ${rule.max}.`;
        }
    }

    if (values.mode === 'CHECK') {
        for (const key of ['chamber_height_m', 'chamber_length_m', 'chamber_width_m'] as const) {
            if (!values[key].trim()) errors[key] = `Vui lòng nhập ${rules[key].label.toLowerCase()}.`;
        }
    } else {
        if (!values.d_min_target_um.trim()) errors.d_min_target_um = 'Vui lòng nhập cỡ hạt mục tiêu.';
        const dimensions = ['chamber_height_m', 'chamber_length_m', 'chamber_width_m'] as const;
        if (dimensions.every((key) => !values[key].trim())) {
            for (const key of dimensions) errors[key] = 'Nhập ít nhất một kích thước H, L hoặc B.';
        } else if (dimensions.every((key) => values[key].trim())) {
            for (const key of dimensions) errors[key] = 'Để trống ít nhất một kích thước để API tính phần còn lại ở chế độ DESIGN.';
        }
    }

    const fractions = usedFractions(values);
    // DESIGN: phân bố hạt là tùy chọn (không có dải nào thì không tính η tổng và khối lượng thu)
    if (values.mode === 'CHECK' && fractions.length === 0) {
        errors.fractions = 'Thêm ít nhất một dải cỡ hạt.';
    }

    let previousUpper = 0;
    for (const fraction of fractions) {
        const rowErrors: FractionRowErrors = {};
        const fromRaw = fraction.diameterFromMicron.trim();
        const toRaw = fraction.diameterMicron.trim();
        const weightRaw = fraction.weightPercent.trim();
        const from = fromRaw === '' ? undefined : Number(fromRaw);
        const to = toRaw === '' ? undefined : Number(toRaw);
        const weight = weightRaw === '' ? undefined : Number(weightRaw);

        if (fromRaw !== '' && (!Number.isFinite(from) || from! < 0)) {
            rowErrors.diameterFromMicron = 'Cận dưới phải là số từ 0 trở lên.';
        }
        if (fraction.openEnded) {
            if (from === undefined || !Number.isFinite(from) || from <= 0) {
                rowErrors.diameterFromMicron = 'Dải không giới hạn trên cần cận dưới lớn hơn 0.';
            }
        } else if (to === undefined) {
            rowErrors.diameterMicron = 'Vui lòng nhập cận trên.';
        } else if (!Number.isFinite(to) || to <= 0) {
            rowErrors.diameterMicron = 'Cận trên phải lớn hơn 0.';
        } else if (from !== undefined && Number.isFinite(from) && to <= from) {
            rowErrors.diameterMicron = 'Cận trên phải lớn hơn cận dưới.';
        }

        // Dải vắt qua mốc 40 µm: cận dưới suy ra giống backend (bỏ trống thì nối tiếp dải trước)
        const effectiveFrom = fraction.openEnded
            ? (from ?? previousUpper)
            : (from ?? (to !== undefined && previousUpper < to ? previousUpper : 0));
        if (Number.isFinite(effectiveFrom)) {
            if (fraction.openEnded && effectiveFrom > 0 && effectiveFrom < SETTLER_MIN_UM && !rowErrors.diameterFromMicron) {
                rowErrors.diameterFromMicron = `Dải > ${effectiveFrom} µm vắt qua mốc ${SETTLER_MIN_UM} µm. Hãy tách thành "${effectiveFrom}–${SETTLER_MIN_UM}" và "> ${SETTLER_MIN_UM}".`;
            } else if (!fraction.openEnded && to !== undefined && Number.isFinite(to) && !rowErrors.diameterMicron
                && effectiveFrom < SETTLER_MIN_UM && to > SETTLER_MIN_UM) {
                rowErrors.diameterMicron = `Dải ${effectiveFrom}–${to} µm vắt qua mốc ${SETTLER_MIN_UM} µm. Hãy tách thành "${effectiveFrom}–${SETTLER_MIN_UM}" và "${SETTLER_MIN_UM}–${to}".`;
            }
        }
        if (fraction.openEnded) {
            if (Number.isFinite(effectiveFrom)) previousUpper = effectiveFrom;
        } else if (to !== undefined && Number.isFinite(to)) {
            previousUpper = to;
        }

        if (weight === undefined) {
            rowErrors.weightPercent = 'Vui lòng nhập tỷ lệ khối lượng.';
            hasValidWeightPercent = false;
        } else if (!Number.isFinite(weight) || weight < 0 || weight > 100) {
            rowErrors.weightPercent = 'Tỷ lệ phải nằm trong khoảng 0–100%.';
            hasValidWeightPercent = false;
        } else {
            totalWeightPercent += weight;
        }

        if (Object.keys(rowErrors).length > 0) fractionRows[fraction.id] = rowErrors;
    }

    if (Object.keys(fractionRows).length > 0) errors.fractionRows = fractionRows;
    if (fractions.length > 0 && hasValidWeightPercent && Math.abs(totalWeightPercent - 100) > 0.01) {
        errors.fractions = `Tổng tỷ lệ hiện là ${totalWeightPercent.toLocaleString('vi-VN')}%; cần bằng 100%.`;
    }

    return errors;
}

function numericValue(values: CalculationFormValues, key: NumericField): number | undefined {
    const value = values[key].trim();
    return value === '' ? undefined : Number(value);
}

export function toCalculationPayload(values: CalculationFormValues): CalculationPayload {
    const payload: CalculationPayload = {
        flowRateM3H: Number(values.flow_rate_m3_h),
        temperatureC: Number(values.temperature_c),
        dustDensityKgM3: Number(values.dust_density_kg_m3),
        gasVelocityMS: Number(values.gas_velocity_m_s),
        operatingHoursPerDay: Number(values.operating_hours_per_day),
        pipeVelocityMS: Number(values.pipe_velocity_m_s),
        pipeLengthM: Number(values.pipe_length_m),
        frictionRPaM: Number(values.friction_r_pa_m),
        roughnessBeta: Number(values.roughness_beta),
        localResistanceSum: Number(values.local_resistance_sum),
        chamberPressureDropPa: Number(values.chamber_pressure_drop_pa),
        fanEfficiency: Number(values.fan_efficiency),
        particleFractions: [],
    };

    const dustConcentration = numericValue(values, 'dust_concentration_g_m3');
    if (dustConcentration !== undefined) payload.dustConcentrationGM3 = dustConcentration;

    if (values.mode === 'DESIGN') {
        const dMinTargetUm = numericValue(values, 'd_min_target_um');
        if (dMinTargetUm !== undefined) payload.dMinTargetUm = dMinTargetUm;
    }

    const optionalMappings = [
        ['chamber_height_m', 'chamberHeightM'],
        ['chamber_length_m', 'chamberLengthM'],
        ['chamber_width_m', 'chamberWidthM'],
        ['pipe_diameter_m', 'pipeDiameterM'],
    ] as const;

    for (const [formKey, payloadKey] of optionalMappings) {
        const value = numericValue(values, formKey);
        if (value !== undefined) payload[payloadKey] = value;
    }

    payload.particleFractions = usedFractions(values).map((fraction) => {
        const from = fraction.diameterFromMicron.trim();
        return {
            ...(from === '' ? {} : { diameterFromMicron: Number(from) }),
            ...(fraction.openEnded ? { openEnded: true } : { diameterMicron: Number(fraction.diameterMicron) }),
            weightPercent: Number(fraction.weightPercent),
        };
    });

    return payload;
}

function getApiErrorMessage(body: unknown): string | undefined {
    if (!body || typeof body !== 'object' || !('message' in body)) return undefined;
    const message = body.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.filter((item): item is string => typeof item === 'string').join(', ');
    return undefined;
}

/**
 * save = false: gọi /design/preview, chỉ tính, KHÔNG lưu vào lịch sử.
 * save = true: gọi /design, tính và lưu thành phương án mới.
 */
export async function submitCalculation(
    payload: CalculationPayload,
    accessToken: string,
    save = false,
): Promise<CalculationApiResponse> {
    let response: Response;
    try {
        response = await fetch(`${API_URL}/api/calculations/design${save ? '' : '/preview'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(payload),
        });
    } catch {
        throw new CalculationApiError('Không thể kết nối máy chủ. Hãy kiểm tra backend rồi thử lại.', 0);
    }

    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
        const message = getApiErrorMessage(body);
        if (response.status === 401) {
            throw new CalculationApiError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', response.status);
        }
        if (response.status === 400) {
            throw new CalculationApiError(message || 'Thông số chưa hợp lệ. Vui lòng kiểm tra lại form.', response.status);
        }
        throw new CalculationApiError(message || 'Máy chủ không thể tính toán lúc này. Vui lòng thử lại.', response.status);
    }

    if (!body || typeof body !== 'object' || !('result' in body) || !('input' in body)) {
        throw new CalculationApiError('Phản hồi từ máy chủ không đúng định dạng mong đợi.', response.status);
    }

    return body as CalculationApiResponse;
}
