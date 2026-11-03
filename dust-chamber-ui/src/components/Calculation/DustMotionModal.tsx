import { useEffect, useRef, useState } from 'react';
import type { CalculationApiResponse } from './calculation';
import './DustMotionModal.css';

interface DustMotionModalProps {
    result: CalculationApiResponse;
    onClose: () => void;
}

const numberFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 });

function particleCountForMass(weightPercent: number) {
    return Math.min(10, Math.max(1, Math.round(Math.min(100, Math.max(0, weightPercent)) / 10)));
}

export default function DustMotionModal({ result, onClose }: DustMotionModalProps) {
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const [reducedMotion, setReducedMotion] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const updateMotionPreference = () => setReducedMotion(mediaQuery.matches);
        const previousOverflow = document.body.style.overflow;

        updateMotionPreference();
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

    const validFractions = (Array.isArray(result.fractions) ? result.fractions : []).filter((fraction) =>
        Number.isFinite(fraction.dRepUm)
        && Number.isFinite(fraction.massPercent)
        && Number.isFinite(fraction.settlingVelocityMS)
        && Number.isFinite(fraction.efficiencyPercent),
    );
    const gasSpeed = Math.max(0, result.input.gasVelocityMS);
    const gasDuration = Math.min(10, Math.max(3, 5 / Math.sqrt(Math.max(gasSpeed, 0.25))));

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
                            {result.projectId ? `Phương án #${result.projectId}` : 'Kết quả xem trước'} · {result.mode === 'CHECK' ? 'Kiểm tra' : 'Thiết kế'}
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
                        {[
                            ['H', result.result.hM, 'm'],
                            ['L', result.result.lM, 'm'],
                            ['B', result.result.bM, 'm'],
                            ['Vận tốc khí', gasSpeed, 'm/s'],
                            ['Vận tốc lắng mục tiêu', result.result.uMS, 'm/s'],
                            ['Hiệu suất tổng', result.result.etaTotalPercent, '%'],
                        ].map(([label, value, unit]) => (
                            <div key={String(label)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                                <p className="text-xs font-medium text-slate-500">{label}</p>
                                <p className="mt-1 font-bold text-slate-900">{numberFormat.format(Number(value))} <span className="text-xs font-medium text-slate-500">{unit}</span></p>
                            </div>
                        ))}
                    </div>

                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-b from-sky-50 to-white p-2 sm:p-4">
                        <svg
                            className="h-auto w-full"
                            viewBox="0 0 860 420"
                            role="img"
                            aria-label="Sơ đồ dòng khí đi ngang qua buồng lắng và các hạt bụi lắng xuống đáy theo kết quả API"
                        >
                            <defs>
                                <linearGradient id="chamber-fill" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#e0f2fe" />
                                    <stop offset="100%" stopColor="#f8fafc" />
                                </linearGradient>
                                <marker id="gas-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="6" refY="4">
                                    <path d="M0 0 L8 4 L0 8 z" fill="#0284c7" />
                                </marker>
                                <clipPath id="chamber-clip"><rect x="165" y="96" width="525" height="220" rx="5" /></clipPath>
                            </defs>

                            <text x="427" y="34" textAnchor="middle" fill="#334155" fontSize="16" fontWeight="700">Mặt cắt dọc · L = {numberFormat.format(result.result.lM)} m</text>
                            <path d="M135 96 H165 M135 316 H165 M142 101 V311" fill="none" stroke="#64748b" strokeWidth="2" />
                            <path d="M136 101 l6 -8 l6 8 M136 311 l6 8 l6 -8" fill="none" stroke="#64748b" strokeWidth="2" />
                            <text x="122" y="210" textAnchor="middle" fill="#475569" fontSize="14" fontWeight="700" transform="rotate(-90 122 210)">H = {numberFormat.format(result.result.hM)} m</text>

                            <rect x="165" y="96" width="525" height="220" rx="5" fill="url(#chamber-fill)" stroke="#334155" strokeWidth="4" />
                            <path d="M35 176 H165 V236 H35 Z" fill="#e2e8f0" stroke="#64748b" strokeWidth="3" />
                            <path d="M690 176 H825 V236 H690 Z" fill="#e2e8f0" stroke="#64748b" strokeWidth="3" />
                            <text x="92" y="164" textAnchor="middle" fill="#475569" fontSize="13" fontWeight="700">Khí vào</text>
                            <text x="758" y="164" textAnchor="middle" fill="#475569" fontSize="13" fontWeight="700">Khí ra</text>

                            <g className="gas-flow" clipPath="url(#chamber-clip)" style={{ animationDuration: `${gasDuration}s` }}>
                                {[145, 205, 265].map((y) => (
                                    <path key={y} d={`M170 ${y} H680`} fill="none" stroke="#0ea5e9" strokeDasharray="14 11" strokeWidth="3" markerEnd="url(#gas-arrow)" opacity="0.75" />
                                ))}
                            </g>
                            <text x="425" y="79" textAnchor="middle" fill="#0369a1" fontSize="13" fontWeight="700">Dòng khí ngang · {numberFormat.format(gasSpeed)} m/s</text>

                            <path d="M280 316 L310 382 H545 L575 316" fill="#fef3c7" stroke="#a16207" strokeWidth="3" />
                            <path d="M317 350 H538" stroke="#ca8a04" strokeWidth="5" strokeLinecap="round" />
                            <text x="427" y="405" textAnchor="middle" fill="#854d0e" fontSize="13" fontWeight="700">B = {numberFormat.format(result.result.bM)} m · Bụi thu ở đáy</text>

                            <g clipPath="url(#chamber-clip)">
                                {validFractions.flatMap((fraction, fractionIndex) => {
                                    const particleCount = particleCountForMass(fraction.massPercent);
                                    const capturedCount = Math.round(particleCount * Math.min(100, Math.max(0, fraction.efficiencyPercent)) / 100);
                                    const radius = Math.min(8, Math.max(4, 3 + Math.log10(Math.max(fraction.dRepUm, 1))));
                                    const rowY = 125 + (fractionIndex % 4) * 42;
                                    return Array.from({ length: particleCount }, (_, particleIndex) => {
                                        const captured = particleIndex < capturedCount;
                                        const startX = 185 + (particleIndex % 5) * 8;
                                        const startY = rowY + Math.floor(particleIndex / 5) * 9;
                                        const endX = 190 + ((particleIndex * 47 + fractionIndex * 61) % 450);
                                        const endY = 302 - ((particleIndex * 13 + fractionIndex * 29) % 22);
                                        const duration = Math.min(14, Math.max(3, 2.5 / Math.sqrt(Math.max(fraction.settlingVelocityMS, 0.04))));
                                        const path = captured
                                            ? `M 0 0 C ${endX - startX} 4 ${endX - startX} ${endY - startY - 10} ${endX - startX} ${endY - startY}`
                                            : `M 0 0 C 135 -12 330 15 520 ${startY - 210}`;
                                        return (
                                            <circle
                                                key={`${fraction.id ?? fractionIndex}-${particleIndex}`}
                                                cx={reducedMotion ? (captured ? endX : 680) : startX}
                                                cy={reducedMotion ? (captured ? endY : startY) : startY}
                                                r={radius}
                                                fill={captured ? '#d97706' : '#94a3b8'}
                                                opacity="0.9"
                                            >
                                                {!reducedMotion && <animateMotion dur={`${duration}s`} path={path} repeatCount="indefinite" begin={`${-(particleIndex * 0.29 + fractionIndex * 0.41)}s`} />}
                                            </circle>
                                        );
                                    });
                                })}
                            </g>
                        </svg>
                    </div>

                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-700" aria-label="Chú giải">
                        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-sky-500" />Khí chuyển động ngang</span>
                        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-600" />Hạt được giữ lại</span>
                        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-slate-400" />Phần hạt còn theo dòng khí ra</span>
                    </div>

                    {validFractions.length > 0 ? (
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
                                    {validFractions.map((fraction, index) => (
                                        <tr key={fraction.id ?? `${fraction.dFromUm}-${fraction.dToUm}-${index}`}>
                                            <td className="px-4 py-3">{numberFormat.format(fraction.dFromUm)}–{numberFormat.format(fraction.dToUm)} µm</td>
                                            <td className="px-4 py-3">{numberFormat.format(fraction.massPercent)}%</td>
                                            <td className="px-4 py-3">{numberFormat.format(fraction.settlingVelocityMS)} m/s</td>
                                            <td className="px-4 py-3">{numberFormat.format(fraction.efficiencyPercent)}%</td>
                                            <td className="px-4 py-3">{fraction.regime === 'FULL' ? 'Giữ hoàn toàn' : fraction.regime === 'PARTIAL' ? 'Giữ một phần' : 'Cần thiết bị khác'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                            API không trả phân bố cỡ hạt cho phương án này. Sơ đồ chỉ minh họa dòng khí và kích thước buồng; không biểu diễn tỷ lệ bụi được thu giữ.
                        </p>
                    )}

                    <p className="text-xs leading-relaxed text-slate-500">
                        Sơ đồ minh họa dựa trên kết quả tính toán của API, không theo tỷ lệ và không mô phỏng chính xác quỹ đạo từng hạt. Số chấm biểu tượng xấp xỉ tỷ lệ khối lượng từng dải; màu hạt phản ánh hiệu suất API. B = chiều rộng buồng (chiều sâu trên mặt cắt này).
                    </p>
                </div>
            </section>
        </div>
    );
}
