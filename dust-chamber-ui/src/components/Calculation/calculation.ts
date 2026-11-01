export type DesignMode = 'CHECK' | 'DESIGN';

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

export type CalculationFormValues = { mode: DesignMode } & Record<NumericField, string>;
export type CalculationErrors = Partial<Record<NumericField, string>>;

export type CalculationInput = {
    mode: DesignMode;
} & Record<NumericField, number | null>;

export interface CalculationResult {
    h_m: number;
    l_m: number;
    b_m: number;
    gas_velocity_m_s: number;
    settling_velocity_m_s: number;
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

export function validateCalculation(values: CalculationFormValues): CalculationErrors {
    const errors: CalculationErrors = {};

    for (const [key, rule] of Object.entries(rules) as [NumericField, Rule][]) {
        if (values.mode === 'CHECK' && key === 'd_min_target_um') continue;
        const raw = values[key].trim();
        if (!raw) {
            if (!optionalFields.includes(key)) errors[key] = `Vui lòng nhập ${rule.label.toLowerCase()}.`;
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
        }
    }

    return errors;
}

export function toCalculationInput(values: CalculationFormValues): CalculationInput {
    const input = { mode: values.mode } as CalculationInput;
    for (const key of Object.keys(rules) as NumericField[]) {
        input[key] = (values.mode === 'CHECK' && key === 'd_min_target_um') || values[key].trim() === ''
            ? null
            : Number(values[key]);
    }
    return input;
}

// Chỉ là dữ liệu trình diễn. Thay hàm này bằng lời gọi API khi backend hoàn thành.
export async function getMockCalculation(input: CalculationInput): Promise<CalculationResult> {
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    return {
        h_m: input.chamber_height_m ?? 2.5,
        l_m: input.chamber_length_m ?? 8,
        b_m: input.chamber_width_m ?? 3.2,
        gas_velocity_m_s: input.gas_velocity_m_s ?? 0.18,
        settling_velocity_m_s: 0.15,
    };
}
