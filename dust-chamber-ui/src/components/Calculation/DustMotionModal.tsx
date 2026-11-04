import { useEffect, useMemo, useRef, useState } from 'react';
import { NO_DATA, SETTLER_MIN_UM, type CalculationApiResponse, type FractionView } from './calculation';
import './DustMotionModal.css';

interface DustMotionModalProps {
    result: CalculationApiResponse;
    onClose: () => void;
}

const numberFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 });
const fmt = (value: number | null | undefined, digits = 3) =>
    value == null || !Number.isFinite(value)
        ? NO_DATA
        : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: digits }).format(value);

/* Khung buồng trong hệ tọa độ SVG (viewBox 860 × 420) */
const X0 = 165;
const X1 = 690;
const Y_TOP = 96;
const Y_BOTTOM = 316;
/** Thời gian (s) để dòng khí đi hết chiều dài buồng trong hoạt hình; hạt rơi nhanh hơn thì đến sớm hơn theo đúng tỷ lệ */
const TRAVERSE_S = 7;

/** Tọa độ chuẩn hóa: nx = x/L (0 = cửa vào, 1 = cửa ra), h = y/H (0 = đáy, 1 = nóc) */
const px = (nx: number) => X0 + nx * (X1 - X0);
const py = (h: number) => Y_BOTTOM - h * (Y_BOTTOM - Y_TOP);

type Outcome = 'captured' | 'escaped' | 'other';

interface Track {
    key: string;
    fractionIndex: number;
    outcome: Outcome;
    radius: number;
    /** điểm đầu và cuối (chuẩn hóa) */
    from: { nx: number; h: number };
    to: { nx: number; h: number };
}

const OUTCOME_COLOR: Record<Outcome, string> = { captured: '#d97706', escaped: '#64748b', other: '#8b5cf6' };

function radiusFor(dUm: number) {
    return Math.min(8, Math.max(3.5, 2.2 + 2.2 * Math.log10(Math.max(dUm, 1))));
}

/**
 * Hạt thả ở độ cao h (tỷ lệ so với H) tại cửa vào, vận tốc ngang bằng vận tốc khí, vận tốc rơi không đổi (Stokes):
 * đường đi là đoạn thẳng. Hạt chạm đáy trước cửa ra khi h ≤ η, với η = v_ts·B·L/Q (B14); vị trí chạm = h/η.
 * Nếu h > η hạt ra khỏi buồng ở độ cao h − η. Dải < 40 µm không tính trong buồng lắng (η = null) nên chỉ vẽ trôi theo dòng khí.
 */
function buildTracks(fractions: FractionView[], focus: number | 'all'): Track[] {
    const heights = focus === 'all' ? [1 / 6, 3 / 6, 5 / 6] : [1 / 12, 3 / 12, 5 / 12, 7 / 12, 9 / 12, 11 / 12];
    const tracks: Track[] = [];
    fractions.forEach((fraction, fractionIndex) => {
        if (focus !== 'all' && focus !== fractionIndex) return;
        const eta = fraction.efficiencyPercent == null ? null : Math.min(1, Math.max(0, fraction.efficiencyPercent / 100));
        heights.forEach((h, k) => {
            let outcome: Outcome;
            let to: Track['to'];
            if (eta === null) {
                outcome = 'other';
                to = { nx: 1, h };
            } else if (eta > 0 && h <= eta + 1e-9) {
                outcome = 'captured';
                to = { nx: Math.min(1, h / eta), h: 0 };
            } else {
                outcome = 'escaped';
                to = { nx: 1, h: Math.max(0, h - eta) };
            }
            tracks.push({
                key: `${fractionIndex}-${k}`,
                fractionIndex,
                outcome,
                radius: radiusFor(fraction.dRepUm),
                from: { nx: 0, h },
                to,
            });
        });
    });
    return tracks;
}

function rangeLabel(fraction: FractionView) {
    return fraction.dToUm == null
        ? `> ${numberFormat.format(fraction.dFromUm)} µm`
        : `${numberFormat.format(fraction.dFromUm)}–${numberFormat.format(fraction.dToUm)} µm`;
}

const REGIME_TEXT: Record<FractionView['regime'], string> = {
    FULL: 'Giữ hoàn toàn',
    PARTIAL: 'Giữ một phần',
    OTHER_DEVICE: 'Dùng thiết bị khác',
};

export default function DustMotionModal({ result, onClose }: DustMotionModalProps) {
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const [reducedMotion, setReducedMotion] = useState(
        () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
    const [focus, setFocus] = useState<number | 'all'>('all');

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const updateMotionPreference = () => setReducedMotion(mediaQuery.matches);
        const previousOverflow = document.body.style.overflow;

        document.body.style.overflow = 'hidden';
        closeButtonRef.current?.focus();
        mediaQuery.addEventListener('change', updateMotionPreference);

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            mediaQuery.removeEventListener('change', updateMotionPreference);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    const r = result.result;
    const fractions = result.fractions;
    const tracks = useMemo(() => buildTracks(fractions, focus), [fractions, focus]);

    // Tốc độ dòng khí vẽ theo u = Q/(B·H) trong kết quả (không dùng vận tốc người dùng nhập vì ở DESIGN có thể bị tính lại)
    const gasSpeed = Math.max(0, r.uMS);
    const gasDuration = Math.min(10, Math.max(3, 5 / Math.sqrt(Math.max(gasSpeed, 0.25))));

    // Quỹ đạo giới hạn: hạt d_limit thả ở sát nóc chạm đáy tại x/L = τ1/τ2 (B4, B5)
    const ratio = r.tau2S > 0 ? r.tau1S / r.tau2S : 1;
    const limitTo = ratio <= 1 ? { nx: ratio, h: 0 } : { nx: 1, h: 1 - 1 / ratio };

    const otherDeviceCount = fractions.filter((f) => f.regime === 'OTHER_DEVICE').length;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                aria-labelledby="dust-motion-title"
                aria-modal="true"
                className="my-auto w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl"
                role="dialog"
            >
                <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-7">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Buồng lắng bụi</p>
                        <h2 id="dust-motion-title" className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">Mô tả chuyển động</h2>
                        <p className="mt-1 text-sm text-slate-600">
                            {result.projectId != null ? `Phương án #${result.projectId}` : 'Kết quả xem trước'} · {result.mode === 'CHECK' ? 'Kiểm tra' : 'Thiết kế'}
                        </p>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Đóng mô tả chuyển động"
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-2xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    >
                        ×
                    </button>
                </header>

                <div className="space-y-5 p-4 sm:p-7">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                        {([
                            ['H', r.hM, 'm', 3],
                            ['L', r.lM, 'm', 3],
                            ['B', r.bM, 'm', 3],
                            ['Vận tốc khí u = Q/(B·H)', r.uMS, 'm/s', 3],
                            [`Vận tốc lắng hạt ${fmt(r.dLimitUm, 0)} µm`, r.vtsLimitMS, 'm/s', 4],
                            ['Hiệu suất tổng', r.etaTotalPercent, '%', 2],
                        ] as const).map(([label, value, unit, digits]) => (
                            <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                                <p className="text-xs font-medium text-slate-500">{label}</p>
                                {value == null ? (
                                    <p className="mt-1 text-xs italic text-slate-400">{NO_DATA}</p>
                                ) : (
                                    <p className="mt-1 font-bold text-slate-900">{fmt(value, digits)} <span className="text-xs font-medium text-slate-500">{unit}</span></p>
                                )}
                            </div>
                        ))}
                    </div>

                    {fractions.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Chọn dải hạt để vẽ">
                            <span className="text-sm font-medium text-slate-600">Hiển thị:</span>
                            {(['all', ...fractions.map((_, index) => index)] as const).map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    aria-pressed={focus === option}
                                    onClick={() => setFocus(option)}
                                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${focus === option ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-sky-400'}`}
                                >
                                    {option === 'all' ? 'Tất cả các dải' : rangeLabel(fractions[option])}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-b from-sky-50 to-white p-2 sm:p-4">
                        <svg
                            className="h-auto w-full"
                            viewBox="0 0 860 420"
                            role="img"
                            aria-label="Mặt cắt dọc buồng lắng bụi: dòng khí đi ngang, hạt bụi rơi chạm đáy hoặc theo khí ra ngoài"
                        >
                            <defs>
                                <linearGradient id="chamber-fill" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#e0f2fe" />
                                    <stop offset="100%" stopColor="#f8fafc" />
                                </linearGradient>
                                <marker id="gas-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="6" refY="4">
                                    <path d="M0 0 L8 4 L0 8 z" fill="#0284c7" />
                                </marker>
                                <clipPath id="chamber-clip"><rect x={X0} y={Y_TOP} width={X1 - X0} height={Y_BOTTOM - Y_TOP} rx="5" /></clipPath>
                            </defs>

                            <text x="427" y="34" textAnchor="middle" fill="#334155" fontSize="16" fontWeight="700">Mặt cắt dọc · L = {fmt(r.lM)} m</text>
                            <path d="M135 96 H165 M135 316 H165 M142 101 V311" fill="none" stroke="#64748b" strokeWidth="2" />
                            <path d="M136 101 l6 -8 l6 8 M136 311 l6 8 l6 -8" fill="none" stroke="#64748b" strokeWidth="2" />
                            <text x="122" y="210" textAnchor="middle" fill="#475569" fontSize="14" fontWeight="700" transform="rotate(-90 122 210)">H = {fmt(r.hM)} m</text>

                            <rect x={X0} y={Y_TOP} width={X1 - X0} height={Y_BOTTOM - Y_TOP} rx="5" fill="url(#chamber-fill)" stroke="#334155" strokeWidth="4" />
                            <path d="M35 176 H165 V236 H35 Z" fill="#e2e8f0" stroke="#64748b" strokeWidth="3" />
                            <path d="M690 176 H825 V236 H690 Z" fill="#e2e8f0" stroke="#64748b" strokeWidth="3" />
                            <text x="92" y="164" textAnchor="middle" fill="#475569" fontSize="13" fontWeight="700">Khí vào</text>
                            <text x="758" y="164" textAnchor="middle" fill="#475569" fontSize="13" fontWeight="700">Khí ra</text>

                            <g className="gas-flow" clipPath="url(#chamber-clip)" style={{ animationDuration: `${gasDuration}s` }}>
                                {[145, 205, 265].map((y) => (
                                    <path key={y} d={`M170 ${y} H680`} fill="none" stroke="#0ea5e9" strokeDasharray="14 11" strokeWidth="3" markerEnd="url(#gas-arrow)" opacity="0.5" />
                                ))}
                            </g>
                            <text x="427" y="79" textAnchor="middle" fill="#0369a1" fontSize="13" fontWeight="700">Dòng khí ngang · u = {fmt(gasSpeed)} m/s</text>

                            <path d="M280 316 L310 382 H545 L575 316" fill="#fef3c7" stroke="#a16207" strokeWidth="3" />
                            <path d="M317 350 H538" stroke="#ca8a04" strokeWidth="5" strokeLinecap="round" />
                            <text x="427" y="405" textAnchor="middle" fill="#854d0e" fontSize="13" fontWeight="700">B = {fmt(r.bM)} m · Bụi thu ở đáy</text>

                            {/* Quỹ đạo giới hạn của hạt d_limit (hạt thả từ nóc buồng) */}
                            <line
                                x1={px(0)} y1={py(1)} x2={px(limitTo.nx)} y2={py(limitTo.h)}
                                stroke="#b91c1c" strokeWidth="2" strokeDasharray="7 5"
                            />
                            <circle cx={px(limitTo.nx)} cy={py(limitTo.h)} r="5" fill="#b91c1c" />
                            <text
                                x={Math.min(px(limitTo.nx) + 8, X1 - 6)} y={py(limitTo.h) - 8}
                                textAnchor={px(limitTo.nx) > X1 - 150 ? 'end' : 'start'}
                                fill="#b91c1c" fontSize="12" fontWeight="700"
                            >
                                Hạt {fmt(r.dLimitUm, 0)} µm rơi tới đáy tại x = {fmt(limitTo.nx * r.lM, 2)} m
                            </text>

                            <g clipPath="url(#chamber-clip)">
                                {tracks.map((track, index) => {
                                    const color = OUTCOME_COLOR[track.outcome];
                                    const x1 = px(track.from.nx);
                                    const y1 = py(track.from.h);
                                    const x2 = px(track.to.nx);
                                    const y2 = py(track.to.h);
                                    if (reducedMotion) {
                                        return (
                                            <g key={track.key}>
                                                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.5" opacity="0.6" />
                                                <circle cx={x2} cy={y2} r={track.radius} fill={color} opacity="0.9" />
                                            </g>
                                        );
                                    }
                                    // Vận tốc không đổi theo đường thẳng; hạt chạm đáy sớm hơn thì thời gian bay ngắn hơn theo x/L
                                    const duration = Math.max(0.8, TRAVERSE_S * track.to.nx);
                                    return (
                                        <g key={track.key}>
                                            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1" opacity="0.25" />
                                            <circle cx={x1} cy={y1} r={track.radius} fill={color} opacity="0.9">
                                                <animateMotion
                                                    dur={`${duration}s`}
                                                    path={`M 0 0 L ${x2 - x1} ${y2 - y1}`}
                                                    repeatCount="indefinite"
                                                    begin={`${-((index * 0.83) % duration)}s`}
                                                />
                                            </circle>
                                        </g>
                                    );
                                })}
                            </g>
                        </svg>
                    </div>

                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-700" aria-label="Chú giải">
                        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-600" />Hạt chạm đáy trong buồng</span>
                        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-slate-500" />Hạt theo khí ra ngoài</span>
                        {otherDeviceCount > 0 && (
                            <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-violet-500" />Hạt &lt; {SETTLER_MIN_UM} µm: không tính trong buồng lắng</span>
                        )}
                        <span className="inline-flex items-center gap-2"><span className="h-0 w-5 border-t-2 border-dashed border-red-700" />Quỹ đạo giới hạn</span>
                    </div>

                    {fractions.length > 0 ? (
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full min-w-[620px] text-left text-sm">
                                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">Dải hạt</th>
                                        <th className="px-4 py-3">Khối lượng</th>
                                        <th className="px-4 py-3">Vận tốc lắng</th>
                                        <th className="px-4 py-3">Hiệu suất giữ</th>
                                        <th className="px-4 py-3">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {fractions.map((fraction, index) => (
                                        <tr key={`${fraction.dFromUm}-${fraction.dToUm ?? 'open'}-${index}`}>
                                            <td className="px-4 py-3">{rangeLabel(fraction)}</td>
                                            <td className="px-4 py-3">{fmt(fraction.massPercent, 2)}%</td>
                                            <td className="px-4 py-3">{fmt(fraction.settlingVelocityMS, 4)} m/s</td>
                                            <td className="px-4 py-3">
                                                {fraction.efficiencyPercent == null
                                                    ? <span className="text-xs italic text-slate-400">{NO_DATA}</span>
                                                    : `${fmt(fraction.efficiencyPercent, 2)}%`}
                                            </td>
                                            <td className="px-4 py-3">{REGIME_TEXT[fraction.regime]}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                            Chưa nhập phân bố cỡ hạt nên sơ đồ chỉ vẽ dòng khí, kích thước buồng và quỹ đạo giới hạn của hạt {fmt(r.dLimitUm, 0)} µm.
                        </p>
                    )}

                    <p className="text-xs leading-relaxed text-slate-500">
                        Sơ đồ không theo tỷ lệ. Mỗi hạt được thả ở cửa vào, bay ngang với vận tốc khí và rơi đều với vận tốc lắng (Stokes) nên đường đi là đoạn thẳng.
                        Hạt thả ở độ cao h (tính theo H) chạm đáy trước cửa ra khi h ≤ η, với η là hiệu suất của dải theo B14, nên tỷ lệ hạt chạm đáy khớp với bảng bên trên.
                        Mỗi dải vẽ vài hạt đại diện, kích thước chấm tăng theo cỡ hạt, không biểu diễn khối lượng.
                    </p>
                </div>
            </section>
        </div>
    );
}
