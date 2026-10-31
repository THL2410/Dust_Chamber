import React, { useState, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

export interface FractionData {
    d_from_um: number;
    d_to_um?: number;
    mass_percent: number;
    result?: Record<string, string | number>;
    collectors?: { name: string }[];
}

export interface DetailResponse {
    project?: { name: string; mode: string };
    input?: Record<string, number | string>;
    result?: Record<string, number | string | boolean>;
    fractions?: FractionData[];
}

// ==========================================
// 1. COMPONENT: THÔNG SỐ ĐẦU VÀO
// ==========================================
const InputSection = ({ data }: { data?: Record<string, number | string> }) => {
    if (!data) return <div className="p-4 text-center text-gray-500">Không có dữ liệu thông số đầu vào.</div>;

    const fields = [
        { label: 'Lưu lượng khí (L)', value: data.flow_rate_m3_h, unit: 'm³/h' },
        { label: 'Nhiệt độ (T)', value: data.temperature_c, unit: '°C' },
        { label: 'Nồng độ bụi (Cv)', value: data.dust_concentration_g_m3, unit: 'g/m³' },
        { label: 'Khối lượng riêng của bụi', value: data.dust_density_kg_m3, unit: 'kg/m³' },
        { label: 'Đường kính hạt mục tiêu (d_min)', value: data.d_min_target_um, unit: 'µm' },
        { label: 'Chiều cao buồng', value: data.chamber_height_m, unit: 'm' },
        { label: 'Chiều dài buồng', value: data.chamber_length_m, unit: 'm' },
        { label: 'Chiều rộng buồng', value: data.chamber_width_m, unit: 'm' },
        { label: 'Vận tốc khí trong thiết bị', value: data.gas_velocity_m_s, unit: 'm/s' },
        { label: 'Số giờ hoạt động/ngày', value: data.operating_hours_per_day, unit: 'h' },
        { label: 'Vận tốc khí trong ống dẫn', value: data.pipe_velocity_m_s, unit: 'm/s' },
        { label: 'Đường kính ống dẫn', value: data.pipe_diameter_m, unit: 'm' },
        { label: 'Chiều dài ống dẫn', value: data.pipe_length_m, unit: 'm' },
        { label: 'Hệ số ma sát đường ống', value: data.friction_r_pa_m, unit: 'Pa/m' },
        { label: 'Độ nhám thành ống (β)', value: data.roughness_beta, unit: '' },
        { label: 'Tổng hệ số trở lực cục bộ', value: data.local_resistance_sum, unit: '' },
        { label: 'Tổn thất áp suất của thiết bị lọc bụi', value: data.chamber_pressure_drop_pa, unit: 'Pa' },
        { label: 'Hiệu suất quạt', value: data.fan_efficiency, unit: '' },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field, idx) => (
                field.value !== null && field.value !== undefined && (
                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <span className="text-gray-600 font-medium text-sm">{field.label}</span>
                        <span className="text-gray-900 font-semibold">
                            {typeof field.value === 'number' ? Number(field.value).toLocaleString('vi-VN') : field.value}
                            <span className="text-xs text-gray-500 ml-1">{field.unit}</span>
                        </span>
                    </div>
                )
            ))}
        </div>
    );
};

// ==========================================
// 2. COMPONENT: KẾT QUẢ TÍNH TOÁN
// ==========================================
const ResultSection = ({ data }: { data?: Record<string, number | string | boolean> }) => {
    if (!data) return <div className="p-4 text-center text-gray-500">Không có dữ liệu kết quả.</div>;

    const fields = [
        { label: 'Hiệu suất tổng (η)', value: data.eta_total_percent, unit: '%' },
        { label: 'Nồng độ bụi đầu ra (Cr)', value: data.cb_out_mg_m3, unit: 'mg/m³' },
        { label: 'Công suất quạt (N)', value: data.fan_power_kw, unit: 'kW' },
        { label: 'Tổn thất áp suất toàn hệ thống', value: data.dp_system_pa, unit: 'Pa' },
        { label: 'Chiều cao (H)', value: data.h_m, unit: 'm' },
        { label: 'Chiều dài (L)', value: data.l_m, unit: 'm' },
        { label: 'Chiều rộng (B)', value: data.b_m, unit: 'm' },
        { label: 'Độ nhớt động lực học (μ)', value: data.mu_pa_s, unit: 'Pa.s' },
        { label: 'Khối lượng riêng của khí', value: data.rho_gas_kg_m3, unit: 'kg/m³' },
        { label: 'Vận tốc khí (U)', value: data.u_m_s, unit: 'm/s' },
        { label: 'Thời gian lưu (τ1)', value: data.tau1_s, unit: 's' },
        { label: 'Thời gian lắng (τ2)', value: data.tau2_s, unit: 's' },
        { label: 'Chiều dài tối thiểu (L_min)', value: data.l_min_m, unit: 'm' },
        { label: 'Diện tích tiết diện (B x L)', value: data.bl_m2, unit: 'm²' },
        { label: 'Đường kính hạt tối thiểu (d_min_calc)', value: data.d_min_calc_um, unit: 'µm' },
        { label: 'Đường kính hạt giới hạn (d_limit)', value: data.d_limit_um, unit: 'µm' },
        { label: 'Kết quả giữ lại hạt', value: data.is_retained ? 'Có' : 'Không', unit: '' },
        { label: 'Lượng bụi đi vào buồng lắng (Gv)', value: data.gv_kg_h, unit: 'kg/h' },
        { label: 'Hiệu suất (Yv)', value: data.yv_percent, unit: '%' },
        { label: 'Lượng bụi ra khỏi buồng lắng (Gs)', value: data.gs_kg_h, unit: 'kg/h' },
        { label: 'Lưu lượng khí qua thiết bị (Qs)', value: data.qs_m3_h, unit: 'm³/h' },
        { label: 'Lượng bụi lắng được (Gb)', value: data.gb_kg_h, unit: 'kg/h' },
        { label: 'Lượng bụi lắng lại 1 (M1)', value: data.m1_kg_h, unit: 'kg/h' },
        { label: 'Lượng bụi lắng lại 2 (M2)', value: data.m2_kg_h, unit: 'kg/h' },
        { label: 'Tổng lượng bụi thu hồi (Mt)', value: data.mt_kg_h, unit: 'kg/h' },
        { label: 'Lượng bụi thải ra môi trường (Mr)', value: data.mr_kg_h, unit: 'kg/h' },
        { label: 'Đường kính ống (Φ0)', value: data.d0_m, unit: 'm' },
        { label: 'Vận tốc ống hút (Vt)', value: data.vt_m_s, unit: 'm/s' },
        { label: 'Hệ số (α)', value: data.alpha, unit: '' },
        { label: 'Tổn thất áp suất ma sát', value: data.dp_friction_pa, unit: 'Pa' },
        { label: 'Áp suất động (Pđ)', value: data.p_dynamic_pa, unit: 'Pa' },
        { label: 'Tổn thất áp suất cục bộ', value: data.p_local_pa, unit: 'Pa' },
        { label: 'Tổn thất áp suất trong ống', value: data.dp_pipe_pa, unit: 'Pa' },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field, idx) => (
                field.value !== null && field.value !== undefined && (
                    <div key={idx} className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-100">
                        <span className="text-gray-700 font-medium text-sm">{field.label}</span>
                        <span className="text-green-700 font-bold">
                            {typeof field.value === 'number' ? Number(field.value).toLocaleString('vi-VN') : field.value}
                            <span className="text-xs text-green-600 ml-1">{field.unit}</span>
                        </span>
                    </div>
                )
            ))}
        </div>
    );
};

// ==========================================
// 3. COMPONENT: KẾT QUẢ DẢI BỤI
// ==========================================
const FractionSection = ({ fractions }: { fractions?: FractionData[] }) => {
    if (!fractions || fractions.length === 0) {
        return <div className="p-4 text-center text-gray-500">Không có dữ liệu dải bụi.</div>;
    }

    const translateRegime = (regime?: string | number) => {
        switch (String(regime)) {
            case 'FULL': return <span className="text-green-600 font-semibold">Hoàn toàn</span>;
            case 'PARTIAL': return <span className="text-yellow-600 font-semibold">Một phần</span>;
            case 'OTHER_DEVICE': return <span className="text-red-500 font-semibold">Cần thiết bị khác</span>;
            default: return regime || '-';
        }
    };

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
                            {f.d_from_um} - {f.d_to_um ?? '∞'}
                        </td>
                        <td className="py-3 px-4">{Number(f.mass_percent).toFixed(2)}%</td>
                        <td className="py-3 px-4">{Number(f.result?.d_rep_um || 0).toFixed(2)}</td>
                        <td className="py-3 px-4">{Number(f.result?.settling_velocity_m_s || 0).toFixed(4)}</td>
                        <td className="py-3 px-4 font-semibold text-green-600">{Number(f.result?.efficiency_percent || 0).toFixed(2)}%</td>
                        <td className="py-3 px-4">{Number(f.result?.inlet_conc_g_m3 || 0).toFixed(4)}</td>
                        <td className="py-3 px-4">{Number(f.result?.outlet_conc_g_m3 || 0).toFixed(4)}</td>
                        <td className="py-3 px-4 text-center">{translateRegime(f.result?.regime)}</td>
                        <td className="py-3 px-4 text-xs">
                            {f.collectors && f.collectors.length > 0
                                ? f.collectors.map(c => c.name).join(', ')
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
                const response = await fetch(`http://localhost:3001/api/history/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error("Lỗi tải chi tiết");

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
                            padding: '20px'
                        }
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

                    let tabName = '';
                    if (activeTab === 'input') tabName = 'Thong_So_Dau_Vao';
                    if (activeTab === 'result') tabName = 'Ket_Qua_Tinh_Toan';
                    if (activeTab === 'fraction') tabName = 'Ket_Qua_Dai_Bui';

                    pdf.save(`Du_An_${id}_${tabName}.pdf`);
                } catch (error) {
                    console.error('Lỗi khi tạo PDF:', error);
                    alert('Lỗi xuất PDF. Vui lòng thử lại sau.');
                }
            }
            setIsExporting(false);
        }, 500);
    };

    if (!id) return null;

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

                <div id="pdf-content" className={`bg-white ${isExporting ? 'h-auto pb-10 select-none' : 'flex-1 overflow-y-auto'}`}>

                    {isExporting && data && (
                        <div className="px-8 py-6 mb-4 border-b-4 border-blue-600 bg-white text-center">
                            <h2 className="text-3xl font-bold text-gray-800 uppercase tracking-wide">
                                {activeTab === 'input' && 'BÁO CÁO THÔNG SỐ ĐẦU VÀO'}
                                {activeTab === 'result' && 'BÁO CÁO KẾT QUẢ TÍNH TOÁN'}
                                {activeTab === 'fraction' && 'BÁO CÁO KẾT QUẢ TỪNG DẢI BỤI'}
                            </h2>
                            <p className="text-lg text-blue-700 font-semibold mt-2">
                                Tên dự án: {data.project?.name}
                            </p>
                            <p className="text-gray-500 mt-1">Mã tham chiếu: #{id} | Chế độ: {data.project?.mode}</p>
                        </div>
                    )}

                    <div className="p-6">
                        {loading ? (
                            <div className="flex justify-center items-center h-full">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                <span className="ml-3 text-gray-600">Đang tải dữ liệu...</span>
                            </div>
                        ) : !data ? (
                            <div className="text-center text-red-500 mt-10">Không tìm thấy dữ liệu cho dự án này.</div>
                        ) : (
                            <div className={`space-y-8 ${isExporting ? 'px-4' : ''}`}>

                                {activeTab === 'input' && (
                                    <div className="break-inside-avoid">
                                        {isExporting && <h4 className="text-xl font-bold mb-4 text-indigo-700 border-b-2 border-indigo-100 pb-2">THÔNG SỐ ĐẦU VÀO</h4>}
                                        <InputSection data={data.input} />
                                    </div>
                                )}

                                {activeTab === 'result' && (
                                    <div className="break-inside-avoid">
                                        {isExporting && <h4 className="text-xl font-bold mb-4 text-emerald-700 border-b-2 border-emerald-100 pb-2">KẾT QUẢ TÍNH TOÁN</h4>}
                                        <ResultSection data={data.result} />
                                    </div>
                                )}

                                {activeTab === 'fraction' && (
                                    <div className="break-inside-avoid">
                                        {isExporting && <h4 className="text-xl font-bold mb-4 text-amber-700 border-b-2 border-amber-100 pb-2">KẾT QUẢ TỪNG DẢI BỤI</h4>}
                                        <FractionSection fractions={data.fractions} />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
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