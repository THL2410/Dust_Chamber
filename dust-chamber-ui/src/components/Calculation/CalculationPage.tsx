import { useCallback, useEffect, useState, type SubmitEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import DustMotionModal from './DustMotionModal';
import {
    CalculationApiError,
    NO_DATA,
    SETTLER_MIN_UM,
    initialValues,
    fetchSavedCalculation,
    isBlankFraction,
    submitCalculation,
    toCalculationPayload,
    toUpdatePayload,
    validateCalculation,
    type CalculationFormValues,
    type CalculationApiResponse,
    type DesignMode,
    type FractionRegime,
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
    { key: 'dust_concentration_g_m3', label: 'Nồng độ bụi Cb', unit: 'g/m³', hint: 'Bắt buộc ở chế độ kiểm tra; chế độ thiết kế có thể bỏ trống' },
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
    if (key === 'dust_concentration_g_m3') return mode === 'CHECK';
    if (key === 'd_min_target_um') return mode === 'DESIGN';
    if (key === 'chamber_height_m' || key === 'chamber_length_m' || key === 'chamber_width_m') {
        return mode === 'CHECK';
    }
    return true;
}

const REGIME_LABEL: Record<FractionRegime, { text: string; className: string }> = {
    FULL: { text: 'Lắng 100 %', className: 'bg-emerald-100 text-emerald-900' },
    PARTIAL: { text: 'Lắng một phần', className: 'bg-amber-100 text-amber-900' },
    OTHER_DEVICE: { text: 'Dùng thiết bị khác', className: 'bg-rose-100 text-rose-900' },
};

function fmt(value: number, digits = 2) {
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: digits }).format(value);
}

/** Ô trong bảng: null/undefined hiển thị "Không có số liệu" thay vì 0 */
function NoData() {
    return <span className="text-xs italic text-slate-400">{NO_DATA}</span>;
}

function ResultCard({ label, value, unit, accent, digits = 2 }: { label: string; value: number | null; unit: string; accent: string; digits?: number }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`mb-4 h-1.5 w-12 rounded-full ${accent}`} />
            <p className="text-sm font-medium text-slate-500">{label}</p>
            {value == null ? (
                <p className="mt-2 text-base font-medium italic text-slate-400">{NO_DATA}</p>
            ) : (
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                    {fmt(value, digits)}
                    <span className="ml-2 text-base font-medium text-slate-500">{unit}</span>
                </p>
            )}
        </div>
    );
}

export default function CalculationPage() {
    // /calculate?editId=12: mở phương án đã lưu để sửa (lưu sẽ ghi đè phương án đó, giữ nguyên ID)
    const [searchParams] = useSearchParams();
    const editId = searchParams.get('editId');
    const [loadingSaved, setLoadingSaved] = useState(!!editId);
    const [motionOpen, setMotionOpen] = useState(false);
    const [values, setValues] = useState<CalculationFormValues>(initialValues);
    const [touched, setTouched] = useState<Partial<Record<NumericField, boolean>>>({});
    const [submitted, setSubmitted] = useState(false);
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [result, setResult] = useState<CalculationApiResponse | null>(null);
    const [requestError, setRequestError] = useState('');
    const [loginRequired, setLoginRequired] = useState(false);
    const [nextFractionId, setNextFractionId] = useState(2);
    const errors = validateCalculation(values);
    const fractionTotal = values.particleFractions.reduce(
        (total, fraction) => total + (Number(fraction.weightPercent) || 0),
        0,
    );
    // Chế độ thiết kế: chưa điền dải nào thì phân bố hạt coi như bỏ qua
    const fractionsOptionalAndEmpty = values.mode === 'DESIGN' && values.particleFractions.every(isBlankFraction);

    const closeMotion = useCallback(() => setMotionOpen(false), []);
    const clearResult = () => {
        setResult(null);
        setMotionOpen(false);
    };

    useEffect(() => {
        if (!editId) return;
        const accessToken = sessionStorage.getItem('accessToken');
        if (!accessToken) {
            setRequestError('Bạn cần đăng nhập để sửa phương án.');
            setLoginRequired(true);
            setLoadingSaved(false);
            return;
        }
        let cancelled = false;
        fetchSavedCalculation(editId, accessToken)
            .then((saved) => {
                if (cancelled) return;
                setValues(saved);
                setNextFractionId(saved.particleFractions.length + 1);
            })
            .catch((error: unknown) => {
                if (cancelled) return;
                setRequestError(error instanceof CalculationApiError ? error.message : 'Không thể lấy thông số cũ.');
                setLoginRequired(error instanceof CalculationApiError && error.status === 401);
            })
            .finally(() => { if (!cancelled) setLoadingSaved(false); });
        return () => { cancelled = true; };
    }, [editId]);

    const changeField = (key: NumericField, value: string) => {
        setValues((current) => ({ ...current, [key]: value }));
        clearResult();
        setRequestError('');
        setLoginRequired(false);
    };

    const changeMode = (mode: DesignMode) => {
        setValues((current) => ({ ...current, mode }));
        setTouched({});
        setSubmitted(false);
        clearResult();
        setRequestError('');
        setLoginRequired(false);
    };

    const changeFraction = (id: number, field: 'diameterFromMicron' | 'diameterMicron' | 'weightPercent', value: string) => {
        setValues((current) => ({
            ...current,
            particleFractions: current.particleFractions.map((fraction) =>
                fraction.id === id ? { ...fraction, [field]: value } : fraction,
            ),
        }));
        clearResult();
        setRequestError('');
        setLoginRequired(false);
    };

    const toggleOpenEnded = (id: number, openEnded: boolean) => {
        setValues((current) => ({
            ...current,
            particleFractions: current.particleFractions.map((fraction) =>
                fraction.id === id ? { ...fraction, openEnded, diameterMicron: openEnded ? '' : fraction.diameterMicron } : fraction,
            ),
        }));
        clearResult();
        setRequestError('');
        setLoginRequired(false);
    };

    const addFraction = () => {
        const id = nextFractionId;
        setNextFractionId((current) => current + 1);
        setValues((current) => {
            const previousUpper = current.particleFractions.at(-1)?.diameterMicron ?? '';
            return {
                ...current,
                particleFractions: [
                    ...current.particleFractions,
                    { id, diameterFromMicron: previousUpper, diameterMicron: '', openEnded: false, weightPercent: '' },
                ],
            };
        });
        clearResult();
        setRequestError('');
        setLoginRequired(false);
    };

    const removeFraction = (id: number) => {
        setValues((current) => ({
            ...current,
            particleFractions: current.particleFractions.filter((fraction) => fraction.id !== id),
        }));
        clearResult();
        setRequestError('');
        setLoginRequired(false);
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

    const getToken = () => {
        const accessToken = sessionStorage.getItem('accessToken');
        if (!accessToken) {
            setRequestError('Bạn cần đăng nhập để gửi yêu cầu tính toán.');
            setLoginRequired(true);
        }
        return accessToken;
    };

    const handleError = (error: unknown) => {
        if (error instanceof CalculationApiError) {
            setRequestError(error.message);
            setLoginRequired(error.status === 401);
        } else {
            setRequestError('Đã xảy ra lỗi khi tính toán. Vui lòng thử lại.');
        }
    };

    /** Lưu phương án đang xem: gọi lại API với cùng dữ liệu form nhưng ở chế độ lưu. */
    const handleSave = async () => {
        if (Object.keys(errors).length > 0) return;
        const accessToken = getToken();
        if (!accessToken) return;
        setSaving(true);
        setRequestError('');
        try {
            setResult(editId
                ? await submitCalculation(toUpdatePayload(values), accessToken, true, editId)
                : await submitCalculation(toCalculationPayload(values), accessToken, true));
        } catch (error) {
            handleError(error);
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmitted(true);
        clearResult();
        setRequestError('');
        setLoginRequired(false);

        if (Object.keys(errors).length > 0) {
            if (advancedFields.some(({ key }) => errors[key])) setAdvancedOpen(true);
            return;
        }

        const accessToken = getToken();
        if (!accessToken) return;

        setLoading(true);
        try {
            const payload = toCalculationPayload(values);
            // Chỉ tính để xem trước, không tạo phương án trong lịch sử. Lưu bằng nút "Lưu phương án".
            setResult(await submitCalculation(payload, accessToken, false));
        } catch (error) {
            handleError(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="mx-auto max-w-7xl space-y-6 px-2 py-4 sm:px-4 lg:py-8">
            <header className="rounded-2xl bg-slate-900 px-6 py-7 text-white sm:px-8">
                <p className="text-sm font-semibold uppercase tracking-widest text-sky-300">Buồng lắng bụi</p>
                <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{editId ? `Sửa phương án #${editId}` : 'Nhập thông số thiết kế'}</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
                    Chọn chế độ, điền thông số và gửi yêu cầu tính toán đến máy chủ.
                </p>
            </header>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)] lg:items-start">
                <form onSubmit={handleSubmit} noValidate className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                    <fieldset disabled={loading || loadingSaved} className="space-y-8 disabled:opacity-70">
                        <section aria-labelledby="mode-title">
                            <h2 id="mode-title" className="text-lg font-bold text-slate-900">Chế độ tính toán</h2>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                {([
                                    { mode: 'CHECK', title: 'Kiểm tra', description: 'Đã biết H, L và B; cần nồng độ bụi và phân bố hạt.' },
                                    { mode: 'DESIGN', title: 'Thiết kế', description: 'Đã biết d_min và ít nhất một kích thước. Nồng độ bụi và phân bố hạt không bắt buộc.' },
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

                        <section aria-labelledby="fractions-title" className="border-t border-slate-200 pt-6">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <h2 id="fractions-title" className="text-lg font-bold text-slate-900">Phân bố cỡ hạt bụi</h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Nhập cận trên và tỷ lệ khối lượng từng dải. Tổng tỷ lệ cần bằng 100%; cận dưới có thể để trống để nối tiếp dải trước.
                                        {values.mode === 'DESIGN' && ' Ở chế độ thiết kế có thể bỏ trống toàn bộ phần này.'}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Dải nằm hoàn toàn dưới {SETTLER_MIN_UM} µm không tính trong buồng lắng (chỉ gợi ý thiết bị khác). Dải vắt qua mốc {SETTLER_MIN_UM} µm cần tách thành hai dải.
                                    </p>
                                </div>
                                {fractionsOptionalAndEmpty ? (
                                    <p className="shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600">Không bắt buộc</p>
                                ) : (
                                    <p className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold ${Math.abs(fractionTotal - 100) <= 0.01 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                                        Tổng: {fractionTotal.toLocaleString('vi-VN')}%
                                    </p>
                                )}
                            </div>

                            <div className="mt-4 space-y-4">
                                {values.particleFractions.map((fraction, index) => {
                                    const rowErrors = submitted ? errors.fractionRows?.[fraction.id] : undefined;
                                    const fieldClass = (hasError: boolean) => `w-full rounded-xl border bg-white px-3 py-2.5 text-slate-900 outline-none focus:ring-2 ${hasError ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'}`;
                                    return (
                                        <div key={fraction.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                            <div className="mb-3 flex items-center justify-between gap-3">
                                                <h3 className="text-sm font-semibold text-slate-800">Dải hạt {index + 1}</h3>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFraction(fraction.id)}
                                                    className="rounded-lg px-2 py-1 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-600"
                                                    aria-label={`Xóa dải hạt ${index + 1}`}
                                                >
                                                    Xóa dải
                                                </button>
                                            </div>
                                            <div className="grid gap-3 sm:grid-cols-3">
                                                <div>
                                                    <label htmlFor={`fraction-${fraction.id}-from`} className="mb-1 block text-xs font-semibold text-slate-700">Cận dưới (µm)</label>
                                                    <input
                                                        id={`fraction-${fraction.id}-from`}
                                                        type="number"
                                                        min="0"
                                                        step="any"
                                                        inputMode="decimal"
                                                        value={fraction.diameterFromMicron}
                                                        onChange={(event) => changeFraction(fraction.id, 'diameterFromMicron', event.target.value)}
                                                        aria-invalid={Boolean(rowErrors?.diameterFromMicron)}
                                                        className={fieldClass(Boolean(rowErrors?.diameterFromMicron))}
                                                        placeholder={index === 0 ? '0' : 'Nối dải trước'}
                                                    />
                                                    {rowErrors?.diameterFromMicron && <p className="mt-1 text-xs text-red-700" role="alert">{rowErrors.diameterFromMicron}</p>}
                                                </div>
                                                <div>
                                                    <label htmlFor={`fraction-${fraction.id}-to`} className="mb-1 block text-xs font-semibold text-slate-700">Cận trên (µm){fraction.openEnded ? '' : ' *'}</label>
                                                    <input
                                                        id={`fraction-${fraction.id}-to`}
                                                        type="number"
                                                        min="0"
                                                        step="any"
                                                        inputMode="decimal"
                                                        value={fraction.diameterMicron}
                                                        disabled={fraction.openEnded}
                                                        onChange={(event) => changeFraction(fraction.id, 'diameterMicron', event.target.value)}
                                                        aria-invalid={Boolean(rowErrors?.diameterMicron)}
                                                        className={fieldClass(Boolean(rowErrors?.diameterMicron))}
                                                        placeholder={fraction.openEnded ? 'Không giới hạn' : 'Ví dụ: 20'}
                                                    />
                                                    <label className="mt-2 flex items-center gap-2 text-xs text-slate-700">
                                                        <input
                                                            type="checkbox"
                                                            checked={fraction.openEnded}
                                                            onChange={(event) => toggleOpenEnded(fraction.id, event.target.checked)}
                                                            className="accent-blue-600"
                                                        />
                                                        Không giới hạn trên (vd &gt; 60 µm)
                                                    </label>
                                                    {rowErrors?.diameterMicron && <p className="mt-1 text-xs text-red-700" role="alert">{rowErrors.diameterMicron}</p>}
                                                </div>
                                                <div>
                                                    <label htmlFor={`fraction-${fraction.id}-weight`} className="mb-1 block text-xs font-semibold text-slate-700">Tỷ lệ khối lượng (%) *</label>
                                                    <input
                                                        id={`fraction-${fraction.id}-weight`}
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        step="any"
                                                        inputMode="decimal"
                                                        value={fraction.weightPercent}
                                                        onChange={(event) => changeFraction(fraction.id, 'weightPercent', event.target.value)}
                                                        aria-invalid={Boolean(rowErrors?.weightPercent)}
                                                        className={fieldClass(Boolean(rowErrors?.weightPercent))}
                                                        placeholder="Ví dụ: 40"
                                                    />
                                                    {rowErrors?.weightPercent && <p className="mt-1 text-xs text-red-700" role="alert">{rowErrors.weightPercent}</p>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {submitted && errors.fractions && <p className="mt-3 text-sm text-red-700" role="alert">{errors.fractions}</p>}
                            <button
                                type="button"
                                onClick={addFraction}
                                className="mt-4 rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 transition hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                            >
                                + Thêm dải hạt
                            </button>
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
                                {loading ? 'Đang tính toán...' : 'Tính toán'}
                            </button>
                        </div>
                    </fieldset>
                </form>

                <section aria-labelledby="result-title" aria-live="polite" className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm sm:p-7">
                    <div className="flex flex-wrap items-center gap-3">
                        <h2 id="result-title" className="text-xl font-bold text-slate-900">Kết quả</h2>
                        {result && (result.projectId != null
                            ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">Đã tính và lưu</span>
                            : <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">Xem trước, chưa lưu</span>)}
                    </div>
                    <p className="mt-2 text-sm text-slate-600">Kết quả được trả về từ API tính toán.</p>

                    {loading ? (
                        <div role="status" className="mt-6 rounded-xl border border-blue-100 bg-white p-8 text-center">
                            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" aria-hidden="true" />
                            <p className="mt-4 font-medium text-slate-700">Đang gửi dữ liệu và tính toán...</p>
                        </div>
                    ) : requestError ? (
                        <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">
                            <p>{requestError}</p>
                            {loginRequired && <Link className="mt-2 inline-block font-semibold underline" to="/login">Đến trang đăng nhập</Link>}
                        </div>
                    ) : result ? (
                        <div className="mt-6 space-y-5">
                            {result.projectId == null && (
                                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                                    <span className="flex-1">{editId ? `Kết quả xem trước, chưa ghi đè phương án #${editId}.` : 'Kết quả xem trước, chưa được lưu vào lịch sử.'}</span>
                                    <button
                                        type="button"
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
                                    >
                                        {saving ? 'Đang lưu...' : editId ? 'Lưu thay đổi' : 'Lưu phương án'}
                                    </button>
                                </div>
                            )}
                            <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                                {result.projectId != null && <>Đã lưu phương án <strong>#{result.projectId}</strong> · </>}Chế độ {result.mode === 'CHECK' ? 'Kiểm tra' : 'Thiết kế'}
                            </p>
                            <p className={`rounded-lg px-4 py-3 text-sm font-medium ${result.result.isRetained ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-900'}`}>
                                {result.result.isRetained
                                    ? `Đạt: buồng giữ lại hoàn toàn hạt từ ${fmt(result.result.dMinCalcUm, 1)} µm trở lên (chọn d_min = ${fmt(result.result.dLimitUm, 0)} µm).`
                                    : `Chưa đạt: buồng chỉ giữ được hạt từ ${fmt(result.result.dMinCalcUm, 1)} µm trở lên.`}
                            </p>
                            <button
                                type="button"
                                onClick={() => setMotionOpen(true)}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-300 bg-sky-50 px-5 py-3 font-semibold text-sky-800 transition hover:border-sky-400 hover:bg-sky-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 sm:w-auto"
                            >
                                <span aria-hidden="true">↗</span>
                                Xem mô tả chuyển động
                            </button>
                            <div>
                                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600">Kích thước buồng</h3>
                                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                                    <ResultCard label="Chiều cao H" value={result.result.hM} unit="m" accent="bg-sky-500" />
                                    <ResultCard label="Chiều dài L" value={result.result.lM} unit="m" accent="bg-blue-500" />
                                    <ResultCard label="Chiều rộng B" value={result.result.bM} unit="m" accent="bg-indigo-500" />
                                </div>
                            </div>
                            <div>
                                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600">Vận tốc và cỡ hạt giới hạn</h3>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                                    <ResultCard label="Khí trong buồng u = Q/(B·H)" value={result.result.uMS} unit="m/s" accent="bg-emerald-500" digits={3} />
                                    <ResultCard label={`Lắng của hạt ${fmt(result.result.dLimitUm, 0)} µm`} value={result.result.vtsLimitMS} unit="m/s" accent="bg-teal-500" digits={4} />
                                    <ResultCard label="Cỡ hạt nhỏ nhất giữ 100 % (d_min)" value={result.result.dMinCalcUm} unit="µm" accent="bg-cyan-500" />
                                    <ResultCard label="Diện tích đáy B × L" value={result.result.blM2} unit="m²" accent="bg-sky-500" />
                                </div>
                            </div>
                            <div>
                                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600">Hiệu quả lọc bụi</h3>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                                    <ResultCard label="Hiệu suất tổng" value={result.result.etaTotalPercent} unit="%" accent="bg-emerald-500" />
                                    <ResultCard label="Nồng độ bụi sau lọc" value={result.result.cbOutMgM3} unit="mg/m³" accent="bg-rose-500" digits={0} />
                                    <ResultCard label="Tải lượng bụi vào" value={result.result.gbKgH} unit="kg/h" accent="bg-amber-500" />
                                    <ResultCard label="Bụi thu được" value={result.result.mtKgH} unit="kg/h" accent="bg-lime-500" />
                                    <ResultCard label="Bụi thu mỗi ngày" value={result.result.mnKgDay} unit="kg/ngày" accent="bg-lime-600" />
                                    <ResultCard label="Bụi còn lại theo khí" value={result.result.mrKgH} unit="kg/h" accent="bg-orange-500" />
                                </div>
                            </div>
                            <div>
                                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600">Ống dẫn và quạt hút</h3>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                                    <ResultCard label="Lưu lượng khí sạch Qs" value={result.result.qsM3H} unit="m³/h" accent="bg-sky-500" digits={0} />
                                    <ResultCard label="Đường kính ống d0" value={result.result.d0M} unit="m" accent="bg-blue-500" digits={3} />
                                    <ResultCard label="Vận tốc trong ống" value={result.result.vtMS} unit="m/s" accent="bg-indigo-500" />
                                    <ResultCard label="Tổn thất áp suất hệ thống" value={result.result.dpSystemPa} unit="Pa" accent="bg-violet-500" digits={1} />
                                    <ResultCard label="Công suất quạt" value={result.result.fanPowerKw} unit="kW" accent="bg-fuchsia-500" />
                                </div>
                            </div>
                            <div>
                                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600">Hiệu suất theo cỡ hạt</h3>
                                {result.fractions.length === 0 ? (
                                    <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-center text-sm text-slate-500">
                                        {NO_DATA}: chưa nhập phân bố cỡ hạt.
                                    </p>
                                ) : (
                                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                                    <table className="w-full min-w-[640px] text-left text-sm">
                                        <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                                            <tr>
                                                <th className="px-3 py-2">Cỡ hạt (µm)</th>
                                                <th className="px-3 py-2 text-right">% KL</th>
                                                <th className="px-3 py-2 text-right">v<sub>ts</sub> (m/s)</th>
                                                <th className="px-3 py-2 text-right">η (%)</th>
                                                <th className="px-3 py-2 text-right">Cb ra (g/m³)</th>
                                                <th className="px-3 py-2">Phân loại</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {result.fractions.map((f, index) => (
                                                <tr key={index} className="align-top">
                                                    <td className="px-3 py-2 font-medium">{f.dToUm == null ? `> ${fmt(f.dFromUm, 0)}` : `${fmt(f.dFromUm, 0)} – ${fmt(f.dToUm, 0)}`}</td>
                                                    <td className="px-3 py-2 text-right">{fmt(f.massPercent, 1)}</td>
                                                    <td className="px-3 py-2 text-right">{fmt(f.settlingVelocityMS, 4)}</td>
                                                    <td className="px-3 py-2 text-right">{f.efficiencyPercent == null ? <NoData /> : fmt(f.efficiencyPercent, 1)}</td>
                                                    <td className="px-3 py-2 text-right">{f.outletConcGM3 == null ? <NoData /> : fmt(f.outletConcGM3, 3)}</td>
                                                    <td className="px-3 py-2">
                                                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${REGIME_LABEL[f.regime].className}`}>
                                                            {REGIME_LABEL[f.regime].text}
                                                        </span>
                                                        {f.collectors.length > 0 && (
                                                            <p className="mt-1 text-xs text-slate-600">
                                                                Gợi ý: {f.collectors.map((c) => c.name).join(', ')}
                                                            </p>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                )}
                                <p className="mt-2 text-xs text-slate-500">
                                    Hạt nhỏ hơn {SETTLER_MIN_UM} µm không phù hợp buồng lắng nên không tính hiệu suất, chỉ gợi ý thiết bị lọc bụi khác.
                                </p>
                            </div>
                            {result.warnings.length > 0 && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                                    <h3 className="font-semibold">Lưu ý từ API</h3>
                                    <ul className="mt-2 list-disc space-y-1 pl-5">
                                        {result.warnings.map((warning, index) => <li key={`${index}-${warning}`}>{warning}</li>)}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-sm text-slate-500">
                            Điền form và bấm “Tính toán” để xem kết quả từ API.
                        </div>
                    )}
                </section>
            </div>
            {result && motionOpen && <DustMotionModal result={result} onClose={closeMotion} />}
        </main>
    );
}
