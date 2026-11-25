import React, { useState, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { API_URL } from '../../config';
import { NO_DATA } from '../Calculation/calculation';

export interface FractionData {
    d_from_um: number;
    d_to_um?: number | null;
    mass_percent: number;
    result?: Record<string, string | number | null>;
    collectors?: { name: string }[];
}

export interface DetailResponse {
    project?: { name: string; mode: string };
    input?: Record<string, number | string | null>;
    result?: Record<string, number | string | boolean | null>;
    fractions?: FractionData[];
}

const fixedOrNoData = (value: string | number | null | undefined, digits: number, suffix = '') =>
    value === null || value === undefined
        ? <span className="text-xs italic text-gray-400">{NO_DATA}</span>
        : `${Number(value).toFixed(digits)}${suffix}`;

const formatNumber = (val: number | string | boolean) =>
    typeof val === 'number' ? Number(val).toLocaleString('vi-VN', { maximumFractionDigits: 4 }) : String(val);

// ==========================================
// 1. COMPONENT: THÔNG SỐ ĐẦU VÀO
// ==========================================
const InputSection = ({
    data,
    isExporting,
}: {
    data?: Record<string, number | string | null>;
    isExporting?: boolean;
}) => {
    if (!data) return <div className="p-4 text-center text-gray-500">Không có dữ liệu thông số đầu vào.</div>;

    const fields = [
        { label: 'Lưu lượng khí (Q)', value: data.flow_rate_m3_h, unit: 'm³/h' },
        { label: 'Nhiệt độ (T)', value: data.temperature_c, unit: '°C' },
        { label: 'Nồng độ bụi vào (Cb)', value: data.dust_concentration_g_m3, unit: 'g/m³', showWhenNull: true },
        { label: 'Khối lượng riêng của bụi', value: data.dust_density_kg_m3, unit: 'kg/m³' },
        { label: 'Đường kính hạt mục tiêu (d_min)', value: data.d_min_target_um, unit: 'µm' },
        { label: 'Chiều cao buồng (H)', value: data.chamber_height_m, unit: 'm' },
        { label: 'Chiều dài buồng (L)', value: data.chamber_length_m, unit: 'm' },
        { label: 'Chiều rộng buồng (B)', value: data.chamber_width_m, unit: 'm' },
        { label: 'Vận tốc khí trong thiết bị', value: data.gas_velocity_m_s, unit: 'm/s' },
        { label: 'Số giờ hoạt động/ngày', value: data.operating_hours_per_day, unit: 'h' },
        { label: 'Vận tốc khí trong ống dẫn', value: data.pipe_velocity_m_s, unit: 'm/s' },
        { label: 'Đường kính ống dẫn', value: data.pipe_diameter_m, unit: 'm' },
        { label: 'Chiều dài ống dẫn', value: data.pipe_length_m, unit: 'm' },
        { label: 'Hệ số ma sát đường ống', value: data.friction_r_pa_m, unit: 'Pa/m' },
        { label: 'Độ nhám thành ống (β)', value: data.roughness_beta, unit: '-' },
        { label: 'Tổng hệ số trở lực cục bộ', value: data.local_resistance_sum, unit: '-' },
        { label: 'Tổn thất áp suất của thiết bị lọc bụi', value: data.chamber_pressure_drop_pa, unit: 'Pa' },
        { label: 'Hiệu suất quạt', value: data.fan_efficiency, unit: '-' },
    ].filter((f) => f.value !== undefined && (f.value !== null || 'showWhenNull' in f));

    if (isExporting) {
        return (
            <table className="w-full border-collapse border border-gray-400 text-xs text-gray-900">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-gray-400 py-2 px-3 w-12 text-center font-semibold">STT</th>
                        <th className="border border-gray-400 py-2 px-3 text-left font-semibold">Thông số đầu vào</th>
                        <th className="border border-gray-400 py-2 px-3 w-36 text-right font-semibold">Giá trị</th>
                        <th className="border border-gray-400 py-2 px-3 w-24 text-center font-semibold">Đơn vị</th>
                    </tr>
                </thead>
                <tbody>
                    {fields.map((field, idx) => (
                        <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}>
                            <td className="border border-gray-300 py-1.5 px-3 text-center text-gray-600">{idx + 1}</td>
                            <td className="border border-gray-300 py-1.5 px-3">{field.label}</td>
                            <td className="border border-gray-300 py-1.5 px-3 text-right font-medium tabular-nums">
                                {field.value === null ? (
                                    <span className="italic text-gray-400 font-normal">{NO_DATA}</span>
                                ) : (
                                    formatNumber(field.value)
                                )}
                            </td>
                            <td className="border border-gray-300 py-1.5 px-3 text-center text-gray-600">{field.unit}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <span className="text-gray-600 font-medium text-sm">{field.label}</span>
                    {field.value === null ? (
                        <span className="text-sm italic text-gray-400">{NO_DATA}</span>
                    ) : (
                        <span className="text-gray-900 font-semibold">
                            {formatNumber(field.value)}
                            {field.unit !== '-' && <span className="text-xs text-gray-500 ml-1">{field.unit}</span>}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
};

// ==========================================
// 2. COMPONENT: KẾT QUẢ TÍNH TOÁN
// ==========================================
const ResultSection = ({
    data,
    isExporting,
}: {
    data?: Record<string, number | string | boolean | null>;
    isExporting?: boolean;
}) => {
    if (!data) return <div className="p-4 text-center text-gray-500">Không có dữ liệu kết quả.</div>;

    const fields = [
        { label: 'Hiệu suất tổng (η)', value: data.eta_total_percent, unit: '%', highlight: true },
        { label: "Nồng độ bụi sau lọc (Cb')", value: data.cb_out_mg_m3, unit: 'mg/m³', highlight: true },
        { label: 'Công suất quạt (N)', value: data.fan_power_kw, unit: 'kW', highlight: true },
        { label: 'Tổn thất áp suất toàn hệ thống', value: data.dp_system_pa, unit: 'Pa', highlight: true },
        { label: 'Chiều cao (H)', value: data.h_m, unit: 'm' },
        { label: 'Chiều dài (L)', value: data.l_m, unit: 'm' },
        { label: 'Chiều rộng (B)', value: data.b_m, unit: 'm' },
        { label: 'Độ nhớt động lực học (μ)', value: data.mu_pa_s != null ? Number(data.mu_pa_s) * 1e6 : null, unit: '× 10⁻⁶ Pa.s' },
        { label: 'Khối lượng riêng của khí', value: data.rho_gas_kg_m3, unit: 'kg/m³' },
        { label: 'Vận tốc khí ngang trong buồng (u)', value: data.u_m_s, unit: 'm/s' },
        { label: 'Vận tốc lắng của hạt d_limit', value: data.settling_velocity_limit_m_s, unit: 'm/s' },
        { label: 'Thời gian hạt rơi chạm đáy (τ1)', value: data.tau1_s, unit: 's' },
        { label: 'Thời gian lưu trong buồng (τ2)', value: data.tau2_s, unit: 's' },
        { label: 'Chiều dài tối thiểu (L_min)', value: data.l_min_m, unit: 'm' },
        { label: 'Diện tích đáy buồng (B × L)', value: data.bl_m2, unit: 'm²' },
        { label: 'Đường kính hạt tối thiểu (d_min)', value: data.d_min_calc_um, unit: 'µm' },
        { label: 'Đường kính hạt giới hạn (d_limit)', value: data.d_limit_um, unit: 'µm' },
        { label: 'Kết quả giữ lại hạt', value: data.is_retained ? 'Đạt (Có)' : 'Không đạt', unit: '-' },
        { label: 'Lưu lượng khối lượng khí vào (Gv)', value: data.gv_kg_h, unit: 'kg/h' },
        { label: '% bụi theo khối lượng trong khí vào (yv)', value: data.yv_percent, unit: '%' },
        { label: 'Lưu lượng khối lượng khí sạch ra (Gs)', value: data.gs_kg_h, unit: 'kg/h' },
        { label: 'Lưu lượng khí qua thiết bị (Qs)', value: data.qs_m3_h, unit: 'm³/h' },
        { label: 'Tải lượng bụi vào buồng lắng (Gb)', value: data.gb_kg_h, unit: 'kg/h' },
        { label: 'Bụi thu được, hạt d ≥ d_limit (M1)', value: data.m1_kg_h, unit: 'kg/h' },
        { label: 'Bụi thu được, hạt d < d_limit (M2)', value: data.m2_kg_h, unit: 'kg/h' },
        { label: 'Tổng lượng bụi thu hồi (Mt)', value: data.mt_kg_h, unit: 'kg/h' },
        { label: 'Bụi thu được mỗi ngày (Mn)', value: data.mn_kg_day, unit: 'kg/ngày' },
        { label: 'Bụi còn lại trong khí ra (Mr)', value: data.mr_kg_h, unit: 'kg/h' },
        { label: 'Đường kính ống (Φ0)', value: data.d0_m, unit: 'm' },
        { label: 'Vận tốc ống hút (Vt)', value: data.vt_m_s, unit: 'm/s' },
        { label: 'Hệ số (α)', value: data.alpha, unit: '-' },
        { label: 'Tổn thất áp suất ma sát', value: data.dp_friction_pa, unit: 'Pa' },
        { label: 'Áp suất động (Pđ)', value: data.p_dynamic_pa, unit: 'Pa' },
        { label: 'Tổn thất áp suất cục bộ', value: data.p_local_pa, unit: 'Pa' },
        { label: 'Tổn thất áp suất trong ống', value: data.dp_pipe_pa, unit: 'Pa' },
    ].filter((f) => f.value !== undefined);

    if (isExporting) {
        return (
            <table className="w-full border-collapse border border-gray-400 text-xs text-gray-900">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-gray-400 py-2 px-3 w-12 text-center font-semibold">STT</th>
                        <th className="border border-gray-400 py-2 px-3 text-left font-semibold">Đại lượng tính toán</th>
                        <th className="border border-gray-400 py-2 px-3 w-36 text-right font-semibold">Kết quả</th>
                        <th className="border border-gray-400 py-2 px-3 w-24 text-center font-semibold">Đơn vị</th>
                    </tr>
                </thead>
                <tbody>
                    {fields.map((field, idx) => (
                        <tr key={idx} className={field.highlight ? 'bg-gray-100/70 font-semibold' : idx % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}>
                            <td className="border border-gray-300 py-1.5 px-3 text-center text-gray-600 font-normal">{idx + 1}</td>
                            <td className="border border-gray-300 py-1.5 px-3">{field.label}</td>
                            <td className="border border-gray-300 py-1.5 px-3 text-right tabular-nums">
                                {field.value === null ? (
                                    <span className="italic text-gray-400 font-normal">{NO_DATA}</span>
                                ) : (
                                    formatNumber(field.value)
                                )}
                            </td>
                            <td className="border border-gray-300 py-1.5 px-3 text-center text-gray-600 font-normal">{field.unit}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-100">
                    <span className="text-gray-700 font-medium text-sm">{field.label}</span>
                    {field.value === null ? (
                        <span className="text-sm italic text-gray-400">{NO_DATA}</span>
                    ) : (
                        <span className="text-green-700 font-bold">
                            {formatNumber(field.value)}
                            {field.unit !== '-' && <span className="text-xs text-green-600 ml-1">{field.unit}</span>}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
};

// ==========================================
// 3. COMPONENT: KẾT QUẢ DẢI BỤI
// ==========================================
const FractionSection = ({
    fractions,
    isExporting,
}: {
    fractions?: FractionData[];
    isExporting?: boolean;
}) => {
    if (!fractions || fractions.length === 0) {
        return <div className="p-4 text-center text-gray-500">Không có dữ liệu dải bụi.</div>;
    }

    const translateRegime = (regime?: string | number | null) => {
        if (isExporting) {
            switch (String(regime)) {
                case 'FULL': return 'Hoàn toàn';
                case 'PARTIAL': return 'Một phần';
                case 'OTHER_DEVICE': return 'Cần TB khác';
                default: return regime || '-';
            }
        }
        switch (String(regime)) {
            case 'FULL': return <span className="text-green-600 font-semibold">Hoàn toàn</span>;
            case 'PARTIAL': return <span className="text-yellow-600 font-semibold">Một phần</span>;
            case 'OTHER_DEVICE': return <span className="text-red-500 font-semibold">Cần thiết bị khác</span>;
            default: return regime || '-';
        }
    };

    if (isExporting) {
        return (
            <table className="w-full border-collapse border border-gray-400 text-xs text-gray-900">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-gray-400 py-2 px-2 text-center font-semibold">Cỡ hạt (µm)</th>
                        <th className="border border-gray-400 py-2 px-2 text-right font-semibold">% KL</th>
                        <th className="border border-gray-400 py-2 px-2 text-right font-semibold">d đ.diện (µm)</th>
                        <th className="border border-gray-400 py-2 px-2 text-right font-semibold">v lắng (m/s)</th>
                        <th className="border border-gray-400 py-2 px-2 text-right font-semibold">Hiệu suất (%)</th>
                        <th className="border border-gray-400 py-2 px-2 text-right font-semibold">C vào (g/m³)</th>
                        <th className="border border-gray-400 py-2 px-2 text-right font-semibold">C ra (g/m³)</th>
                        <th className="border border-gray-400 py-2 px-2 text-center font-semibold">Chế độ</th>
                        <th className="border border-gray-400 py-2 px-2 text-left font-semibold">TB đề xuất</th>
                    </tr>
                </thead>
                <tbody>
                    {fractions.map((f, index) => (
                        <tr key={index} className={index % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}>
                            <td className="border border-gray-300 py-1.5 px-2 text-center font-medium tabular-nums">
                                {f.d_from_um} – {f.d_to_um ?? '∞'}
                            </td>
                            <td className="border border-gray-300 py-1.5 px-2 text-right tabular-nums">{Number(f.mass_percent).toFixed(2)}%</td>
                            <td className="border border-gray-300 py-1.5 px-2 text-right tabular-nums">{fixedOrNoData(f.result?.d_rep_um, 2)}</td>
                            <td className="border border-gray-300 py-1.5 px-2 text-right tabular-nums">{fixedOrNoData(f.result?.settling_velocity_m_s, 4)}</td>
                            <td className="border border-gray-300 py-1.5 px-2 text-right font-semibold tabular-nums">{fixedOrNoData(f.result?.efficiency_percent, 2, '%')}</td>
                            <td className="border border-gray-300 py-1.5 px-2 text-right tabular-nums">{fixedOrNoData(f.result?.inlet_conc_g_m3, 4)}</td>
                            <td className="border border-gray-300 py-1.5 px-2 text-right tabular-nums">{fixedOrNoData(f.result?.outlet_conc_g_m3, 4)}</td>
                            <td className="border border-gray-300 py-1.5 px-2 text-center">{translateRegime(f.result?.regime)}</td>
                            <td className="border border-gray-300 py-1.5 px-2">
                                {f.collectors && f.collectors.length > 0 ? f.collectors.map((c) => c.name).join(', ') : '-'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                    <tr className="bg-amber-100 text-amber-800 text-xs uppercase tracking-wider">
                        <th className="py-3 px-4 border-b">Kích thước hạt (µm)</th>
                        <th className="py-3 px-4 border-b">% Khối lượng</th>
                        <th className="py-3 px-4 border-b">d đại diện (µm)</th>
                        <th className="py-3 px-4 border-b">Tốc độ lắng (m/s)</th>
                        <th className="py-3 px-4 border-b">Hiệu suất (%)</th>
                        <th className="py-3 px-4 border-b">C bụi vào (g/m³)</th>
                        <th className="py-3 px-4 border-b">C bụi ra (g/m³)</th>
                        <th className="py-3 px-4 border-b text-center">Chế độ</th>
                        <th className="py-3 px-4 border-b">TB Đề xuất</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {fractions.map((f, index) => (
                        <tr key={index} className="border-b border-gray-200 hover:bg-amber-50/50">
                            <td className="py-3 px-4 font-medium text-gray-800">
                                {f.d_from_um} – {f.d_to_um ?? '∞'}
                            </td>
                            <td className="py-3 px-4">{Number(f.mass_percent).toFixed(2)}%</td>
                            <td className="py-3 px-4">{fixedOrNoData(f.result?.d_rep_um, 2)}</td>
                            <td className="py-3 px-4">{fixedOrNoData(f.result?.settling_velocity_m_s, 4)}</td>
                            <td className="py-3 px-4 font-semibold text-green-600">{fixedOrNoData(f.result?.efficiency_percent, 2, '%')}</td>
                            <td className="py-3 px-4">{fixedOrNoData(f.result?.inlet_conc_g_m3, 4)}</td>
                            <td className="py-3 px-4">{fixedOrNoData(f.result?.outlet_conc_g_m3, 4)}</td>
                            <td className="py-3 px-4 text-center">{translateRegime(f.result?.regime)}</td>
                            <td className="py-3 px-4 text-xs">
                                {f.collectors && f.collectors.length > 0
                                    ? f.collectors.map((c) => c.name).join(', ')
                                    : '-'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export interface HistoryDetailModalProps {
    id: number | string | null;
    initialTab?: 'input' | 'result' | 'fraction';
    onClose: () => void;
}

const HistoryDetailModal: React.FC<HistoryDetailModalProps> = ({ id, initialTab = 'input', onClose }) => {
    const [activeTab, setActiveTab] = useState<'input' | 'result' | 'fraction'>(initialTab);
    const [data, setData] = useState<DetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        if (!id) return;

        const fetchDetail = async () => {
            setLoading(true);
            try {
                const token = sessionStorage.getItem('accessToken');
                const response = await fetch(`${API_URL}/api/history/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!response.ok) throw new Error('Lỗi tải chi tiết');

                const result = await response.json();
                setData(result);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchDetail();
    }, [id]);

    const handleExportPDF = () => {
        setIsExporting(true);

        setTimeout(async () => {
            const element = document.getElementById('pdf-content');
            if (element) {
                try {
                    const imgData = await toPng(element, {
                        pixelRatio: 2,
                        backgroundColor: '#ffffff',
                        style: {
                            background: '#ffffff',
                            margin: '0',
                        },
                    });

                    const pdf = new jsPDF('p', 'mm', 'a4');
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pageHeight = pdf.internal.pageSize.getHeight();

                    const elWidth = element.offsetWidth;
                    const elHeight = element.offsetHeight;
                    const imgHeight = (elHeight * pdfWidth) / elWidth;

                    let heightLeft = imgHeight;
                    let position = 0;

                    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                    heightLeft -= pageHeight;

                    while (heightLeft > 0) {
                        position = heightLeft - imgHeight;
                        pdf.addPage();
                        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                        heightLeft -= pageHeight;
                    }

                    const tabNames: Record<string, string> = {
                        input: 'Thong_So_Dau_Vao',
                        result: 'Ket_Qua_Tinh_Toan',
                        fraction: 'Ket_Qua_Dai_Bui',
                    };

                    pdf.save(`Bao_Cao_Du_An_${id}_${tabNames[activeTab]}.pdf`);
                } catch (error) {
                    console.error('Lỗi khi tạo PDF:', error);
                    alert('Lỗi xuất PDF. Vui lòng thử lại sau.');
                }
            }
            setIsExporting(false);
        }, 400);
    };

    if (!id) return null;

    const exportDateStr = new Date().toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });

    const reportTitles: Record<string, string> = {
        input: 'BẢNG THÔNG SỐ ĐẦU VÀO',
        result: 'BẢNG KẾT QUẢ TÍNH TOÁN',
        fraction: 'BẢNG PHÂN BỐ VÀ HIỆU SUẤT THEO DẢI BỤI',
    };

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm transition-opacity ${isExporting ? 'overflow-y-auto items-start py-10' : ''}`}>
            <div className={`bg-white rounded-xl shadow-2xl w-11/12 max-w-5xl flex flex-col transition-all ${isExporting ? 'h-auto' : 'h-[85vh] overflow-hidden animate-fade-in-up'}`}>

                {!isExporting && (
                    <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">
                                {data?.project?.name || 'Chi tiết dự án'}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Mã dự án: #{id} | Chế độ: <span className="font-semibold text-blue-600">{data?.project?.mode}</span>
                            </p>
                        </div>
                        <div className="flex space-x-3 items-center">
                            <button
                                onClick={handleExportPDF}
                                disabled={loading || !data}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition flex items-center shadow-sm disabled:opacity-50"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Xuất PDF
                            </button>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-red-500 transition-colors p-2 bg-gray-100 rounded"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                {!isExporting && (
                    <div className="flex px-6 border-b border-gray-200 bg-white">
                        <button
                            onClick={() => setActiveTab('input')}
                            className={`py-3 px-5 font-semibold text-sm border-b-2 transition-colors ${
                                activeTab === 'input' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            📥 THÔNG SỐ ĐẦU VÀO
                        </button>
                        <button
                            onClick={() => setActiveTab('result')}
                            className={`py-3 px-5 font-semibold text-sm border-b-2 transition-colors ${
                                activeTab === 'result' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            📊 KẾT QUẢ TÍNH TOÁN
                        </button>
                        <button
                            onClick={() => setActiveTab('fraction')}
                            className={`py-3 px-5 font-semibold text-sm border-b-2 transition-colors ${
                                activeTab === 'fraction' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            🌫️ KẾT QUẢ DẢI BỤI
                        </button>
                    </div>
                )}

                <div id="pdf-content" className={`bg-white box-border ${isExporting ? 'h-auto p-8 select-none' : 'flex-1 overflow-y-auto'}`}>
                    {isExporting && data && (
                        <div className="mb-5 pb-3 border-b-2 border-gray-800">
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <p className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold">
                                        Báo cáo tính toán buồng lắng bụi
                                    </p>
                                    <h2 className="text-xl font-bold text-gray-900 mt-1">
                                        {reportTitles[activeTab]}
                                    </h2>
                                </div>
                                <div className="text-right text-xs text-gray-600 space-y-0.5 shrink-0">
                                    <div>Mã phương án: <span className="font-semibold text-gray-900">#{id}</span></div>
                                    <div>Chế độ: <span className="font-semibold text-gray-900">{data.project?.mode}</span></div>
                                    <div>Ngày xuất: {exportDateStr}</div>
                                </div>
                            </div>
                            <div className="mt-3 pt-2 border-t border-gray-200 text-sm text-gray-800">
                                <span className="text-gray-500">Tên dự án: </span>
                                <span className="font-semibold">{data.project?.name}</span>
                            </div>
                        </div>
                    )}

                    <div className={isExporting ? '' : 'p-6'}>
                        {loading ? (
                            <div className="flex justify-center items-center h-full">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                <span className="ml-3 text-gray-600">Đang tải dữ liệu...</span>
                            </div>
                        ) : !data ? (
                            <div className="text-center text-red-500 mt-10">Không tìm thấy dữ liệu cho dự án này.</div>
                        ) : (
                            <div>
                                {activeTab === 'input' && <InputSection data={data.input} isExporting={isExporting} />}
                                {activeTab === 'result' && <ResultSection data={data.result} isExporting={isExporting} />}
                                {activeTab === 'fraction' && <FractionSection fractions={data.fractions} isExporting={isExporting} />}
                            </div>
                        )}
                    </div>

                    {isExporting && data && (
                        <div className="mt-6 pt-3 border-t border-gray-300 flex justify-between text-[11px] text-gray-500">
                            <span>Dự án: {data.project?.name} (#{id})</span>
                            <span>Xuất lúc {exportDateStr}</span>
                        </div>
                    )}
                </div>

                {!isExporting && (
                    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-gray-200 text-gray-800 font-medium rounded hover:bg-gray-300 transition"
                        >
                            Đóng
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HistoryDetailModal;