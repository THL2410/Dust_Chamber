import { useState, type SubmitEvent } from 'react';
import {
    getMockCalculation,
    initialValues,
    toCalculationInput,
    validateCalculation,
    type CalculationFormValues,
    type CalculationResult,
    type DesignMode,
    type NumericField,
} from './calculation';

interface FieldConfig {
    key: NumericField;
    label: string;
    unit?: string;
    hint?: string;
}

const gasFields: FieldConfig[] = [
    { key: 'flow_rate_m3_h', label: 'Lưu lượng khí Q', unit: 'm³/h' },
    { key: 'temperature_c', label: 'Nhiệt độ khí t', unit: '°C', hint: 'Từ -50 đến 1000 °C' },
    { key: 'dust_concentration_g_m3', label: 'Nồng độ bụi Cb', unit: 'g/m³' },
    { key: 'dust_density_kg_m3', label: 'Khối lượng riêng của bụi ρb', unit: 'kg/m³' },
];

const chamberFields: FieldConfig[] = [
    { key: 'd_min_target_um', label: 'Cỡ hạt mục tiêu d_min', unit: 'µm', hint: 'Bắt buộc ở chế độ thiết kế' },
    { key: 'chamber_height_m', label: 'Chiều cao H', unit: 'm' },
    { key: 'chamber_length_m', label: 'Chiều dài L', unit: 'm' },
    { key: 'chamber_width_m', label: 'Chiều rộng B', unit: 'm' },
];

const advancedFields: FieldConfig[] = [
    { key: 'gas_velocity_m_s', label: 'Vận tốc khí trong buồng', unit: 'm/s' },
    { key: 'operating_hours_per_day', label: 'Thời gian vận hành', unit: 'giờ/ngày' },
    { key: 'pipe_velocity_m_s', label: 'Vận tốc khí trong ống', unit: 'm/s' },
    { key: 'pipe_diameter_m', label: 'Đường kính ống d0', unit: 'm', hint: 'Để trống nếu muốn API tự tính' },
    { key: 'pipe_length_m', label: 'Chiều dài ống', unit: 'm' },
    { key: 'friction_r_pa_m', label: 'Trở lực ma sát R', unit: 'Pa/m' },
    { key: 'roughness_beta', label: 'Hệ số độ nhám β' },
    { key: 'local_resistance_sum', label: 'Tổng hệ số trở lực cục bộ Σξ' },
    { key: 'chamber_pressure_drop_pa', label: 'Tổn thất áp suất buồng', unit: 'Pa' },
    { key: 'fan_efficiency', label: 'Hiệu suất quạt η', hint: 'Giá trị lớn hơn 0 và không vượt quá 1' },
];

function isRequired(key: NumericField, mode: DesignMode) {
    if (key === 'pipe_diameter_m') return false;
    if (key === 'd_min_target_um') return mode === 'DESIGN';
    if (key === 'chamber_height_m' || key === 'chamber_length_m' || key === 'chamber_width_m') {
        return mode === 'CHECK';
    }
    return true;
}

function ResultCard({ label, value, unit, accent }: { label: string; value: number; unit: string; accent: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`mb-4 h-1.5 w-12 rounded-full ${accent}`} />
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                {new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value)}
                <span className="ml-2 text-base font-medium text-slate-500">{unit}</span>
            </p>
        </div>
    );
}

export default function CalculationPage() {
    const [values, setValues] = useState<CalculationFormValues>(initialValues);
    const [touched, setTouched] = useState<Partial<Record<NumericField, boolean>>>({});
    const [submitted, setSubmitted] = useState(false);
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<CalculationResult | null>(null);
    const [requestError, setRequestError] = useState('');
    const errors = validateCalculation(values);

    const changeField = (key: NumericField, value: string) => {
        setValues((current) => ({ ...current, [key]: value }));
        setResult(null);
        setRequestError('');
    };

    const changeMode = (mode: DesignMode) => {
        setValues((current) => ({ ...current, mode }));
        setTouched({});
        setSubmitted(false);
        setResult(null);
        setRequestError('');
    };

    const renderFields = (fields: FieldConfig[]) => fields.map(({ key, label, unit, hint }) => {
        const error = (submitted || touched[key]) ? errors[key] : undefined;
        return (
            <div key={key} className="min-w-0">
                <label htmlFor={key} className="mb-1.5 block text-sm font-semibold text-slate-700">
                    {label}{isRequired(key, values.mode) && <span className="ml-1 text-red-600" aria-hidden="true">*</span>}
                    {unit && <span className="ml-1 font-normal text-slate-500">({unit})</span>}
                </label>
                <input
                    id={key}
                    name={key}
                    type="number"
                    step="any"
                    inputMode="decimal"
                    value={values[key]}
                    onChange={(event) => changeField(key, event.target.value)}
                    onBlur={() => setTouched((current) => ({ ...current, [key]: true }))}
                    aria-invalid={Boolean(error)}
                    aria-required={isRequired(key, values.mode)}
                    aria-describedby={error ? `${key}-error` : hint ? `${key}-hint` : undefined}
                    className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-slate-900 outline-none transition focus:ring-2 ${error ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'}`}
                    placeholder="Nhập giá trị"
                />
                {error ? (
                    <p id={`${key}-error`} className="mt-1 text-sm text-red-700" role="alert">{error}</p>
                ) : hint ? (
                    <p id={`${key}-hint`} className="mt-1 text-xs text-slate-500">{hint}</p>
                ) : null}
            </div>
        );
    });

    const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmitted(true);
        setResult(null);
        setRequestError('');

        if (Object.keys(errors).length > 0) {
            if (advancedFields.some(({ key }) => errors[key])) setAdvancedOpen(true);
            return;
        }

        setLoading(true);
        try {
            const input = toCalculationInput(values);
            setResult(await getMockCalculation(input));
        } catch {
            setRequestError('Không thể tải kết quả minh họa. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="mx-auto max-w-7xl space-y-6 px-2 py-4 sm:px-4 lg:py-8">
            <header className="rounded-2xl bg-slate-900 px-6 py-7 text-white sm:px-8">
                <p className="text-sm font-semibold uppercase tracking-widest text-sky-300">Buồng lắng bụi</p>
                <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Nhập thông số thiết kế</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
                    Chọn chế độ, điền thông số và xem giao diện kết quả. Kết quả hiện tại chỉ là dữ liệu minh họa.
                </p>
            </header>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)] lg:items-start">
                <form onSubmit={handleSubmit} noValidate className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                    <fieldset disabled={loading} className="space-y-8 disabled:opacity-70">
                        <section aria-labelledby="mode-title">
                            <h2 id="mode-title" className="text-lg font-bold text-slate-900">Chế độ tính toán</h2>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                {([
                                    { mode: 'CHECK', title: 'Kiểm tra', description: 'Đã biết H, L và B.' },
                                    { mode: 'DESIGN', title: 'Thiết kế', description: 'Đã biết d_min và ít nhất một kích thước.' },
                                ] as const).map((option) => (
                                    <label key={option.mode} className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${values.mode === option.mode ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-400'}`}>
                                        <input
                                            type="radio"
                                            name="mode"
                                            value={option.mode}
                                            checked={values.mode === option.mode}
                                            onChange={() => changeMode(option.mode)}
                                            className="mt-1 accent-blue-600"
                                        />
                                        <span><strong className="block text-slate-900">{option.title}</strong><span className="text-sm text-slate-600">{option.description}</span></span>
                                    </label>
                                ))}
                            </div>
                        </section>

                        <section aria-labelledby="gas-title" className="border-t border-slate-200 pt-6">
                            <h2 id="gas-title" className="text-lg font-bold text-slate-900">Khí và bụi</h2>
                            <p className="mt-1 text-sm text-slate-500">Thông số của dòng khí đầu vào.</p>
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">{renderFields(gasFields)}</div>
                        </section>

                        <section aria-labelledby="chamber-title" className="border-t border-slate-200 pt-6">
                            <h2 id="chamber-title" className="text-lg font-bold text-slate-900">Buồng lắng</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                {values.mode === 'CHECK'
                                    ? 'Nhập đầy đủ ba kích thước của buồng.'
                                    : 'Nhập cỡ hạt mục tiêu và ít nhất một kích thước đã biết.'}
                            </p>
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                {renderFields(values.mode === 'CHECK' ? chamberFields.slice(1) : chamberFields)}
                            </div>
                        </section>

                        <section className="border-t border-slate-200 pt-6">
                            <button
                                type="button"
                                aria-expanded={advancedOpen}
                                aria-controls="advanced-fields"
                                onClick={() => setAdvancedOpen((open) => !open)}
                                className="flex w-full items-center justify-between text-left text-lg font-bold text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
                            >
                                <span>Thông số nâng cao</span>
                                <span aria-hidden="true" className="text-blue-600">{advancedOpen ? '−' : '+'}</span>
                            </button>
                            <p className="mt-1 text-sm text-slate-500">Đã điền giá trị mặc định theo tài liệu thiết kế; có thể chỉnh trước khi gửi.</p>
                            {advancedOpen && <div id="advanced-fields" className="mt-4 grid gap-4 sm:grid-cols-2">{renderFields(advancedFields)}</div>}
                        </section>

                        <div className="border-t border-slate-200 pt-6">
                            {submitted && Object.keys(errors).length > 0 && (
                                <p className="mb-3 text-sm font-medium text-red-700" role="alert">Vui lòng sửa các trường được đánh dấu trước khi xem kết quả.</p>
                            )}
                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
                            >
                                {loading ? 'Đang xử lý...' : 'Xem kết quả minh họa'}
                            </button>
                        </div>
                    </fieldset>
                </form>

                <section aria-labelledby="result-title" aria-live="polite" className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm sm:p-7">
                    <div className="flex flex-wrap items-center gap-3">
                        <h2 id="result-title" className="text-xl font-bold text-slate-900">Kết quả</h2>
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">Dữ liệu minh họa</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">Các giá trị dưới đây dùng để xem trước giao diện, chưa phải kết quả tính toán kỹ thuật.</p>

                    {loading ? (
                        <div role="status" className="mt-6 rounded-xl border border-blue-100 bg-white p-8 text-center">
                            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" aria-hidden="true" />
                            <p className="mt-4 font-medium text-slate-700">Đang chuẩn bị kết quả minh họa...</p>
                        </div>
                    ) : requestError ? (
                        <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">{requestError}</p>
                    ) : result ? (
                        <div className="mt-6 space-y-5">
                            <div>
                                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600">Kích thước buồng</h3>
                                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                                    <ResultCard label="Chiều cao H" value={result.h_m} unit="m" accent="bg-sky-500" />
                                    <ResultCard label="Chiều dài L" value={result.l_m} unit="m" accent="bg-blue-500" />
                                    <ResultCard label="Chiều rộng B" value={result.b_m} unit="m" accent="bg-indigo-500" />
                                </div>
                            </div>
                            <div>
                                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600">Vận tốc</h3>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                                    <ResultCard label="Khí trong buồng" value={result.gas_velocity_m_s} unit="m/s" accent="bg-emerald-500" />
                                    <ResultCard label="Lắng của hạt" value={result.settling_velocity_m_s} unit="m/s" accent="bg-teal-500" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-sm text-slate-500">
                            Điền form và chọn “Xem kết quả minh họa” để xem các Card.
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
