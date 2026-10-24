import { useState, useEffect } from 'react';
import { type HistoryDetail, getMockHistoryDetail } from './mockData';

interface HistoryDetailModalProps {
    id: number | string | null;
    onClose: () => void;
}

const HistoryDetailModal = ({ id, onClose }: HistoryDetailModalProps) => {
    const [detail, setDetail] = useState<HistoryDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        const fetchDetail = async () => {
            setLoading(true);
            try {
                // const token = localStorage.getItem('accessToken');
                // const response = await fetch(`http://localhost:3001/api/history/${id}`, {
                //     headers: { 'Authorization': `Bearer ${token}` }
                // });
                // const result = await response.json();
                // setDetail(result.data);

                // Dùng setTimeout mô phỏng
                setTimeout(() => {
                    const mockData = getMockHistoryDetail(id);
                    setDetail(mockData);
                    setLoading(false);
                }, 500);

            } catch (error) {
                console.error("Lỗi khi lấy chi tiết lịch sử:", error);
                setLoading(false);
            }
        };

        fetchDetail();
    }, [id]);

    if (!id) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white w-[900px] rounded-xl shadow-2xl p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition text-xl font-bold leading-none"
                >
                    &times;
                </button>

                {loading || !detail ? (
                    <div className="py-20 text-center text-gray-500">
                        <p className="text-lg">Đang tải thông số chi tiết...</p>
                    </div>
                ) : (
                    <>
                        <div className="border-b pb-4 mb-6">
                            <h3 className="text-2xl font-bold text-gray-800">{detail.projectName}</h3>
                            <p className="text-gray-500 text-sm mt-1">
                                Ngày tính toán: {new Date(detail.createdAt).toLocaleString('vi-VN')}
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-6">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <h4 className="font-semibold text-blue-800 border-b border-blue-200 pb-2 mb-3">Thông số dòng khí & Bụi</h4>
                                <ul className="space-y-3 text-sm text-gray-700">
                                    <li className="flex justify-between">
                                        <span>Lưu lượng ($Q$):</span>
                                        <span className="font-medium">{detail.inputs.gasFlow.toLocaleString()} m³/h</span>
                                    </li>
                                    <li className="flex justify-between">
                                        <span>Nhiệt độ ($T$):</span>
                                        <span className="font-medium">{detail.inputs.temperature} °C</span>
                                    </li>
                                    <li className="flex justify-between">
                                        <span>Khối lượng riêng ($\rho_p$):</span>
                                        <span className="font-medium">{detail.inputs.dustDensity.toLocaleString()} kg/m³</span>
                                    </li>
                                    <li className="flex justify-between">
                                        <span>Kích thước hạt ($d_p$):</span>
                                        <span className="font-medium">{detail.inputs.particleSize} µm</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                                <h4 className="font-semibold text-orange-800 border-b border-orange-200 pb-2 mb-3">Kích thước buồng lắng</h4>
                                <ul className="space-y-3 text-sm text-gray-700">
                                    <li className="flex justify-between">
                                        <span>Chiều dài ($L$):</span>
                                        <span className="font-medium">{detail.dimensions.length.toFixed(2)} m</span>
                                    </li>
                                    <li className="flex justify-between">
                                        <span>Chiều rộng ($B$):</span>
                                        <span className="font-medium">{detail.dimensions.width.toFixed(2)} m</span>
                                    </li>
                                    <li className="flex justify-between">
                                        <span>Chiều cao ($H$):</span>
                                        <span className="font-medium">{detail.dimensions.height.toFixed(2)} m</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Cột 3: Kết quả */}
                            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                <h4 className="font-semibold text-green-800 border-b border-green-200 pb-2 mb-3">Kết quả tính toán</h4>
                                <ul className="space-y-3 text-sm text-gray-700">
                                    <li className="flex justify-between items-center">
                                        <span>Hiệu suất xử lý ($E$):</span>
                                        <span className="font-bold text-lg text-green-600">{detail.efficiency}%</span>
                                    </li>
                                    <li className="flex justify-between">
                                        <span>Vận tốc dòng khí ($v$):</span>
                                        <span className="font-medium">{detail.results.gasVelocity.toFixed(2)} m/s</span>
                                    </li>
                                    <li className="flex justify-between">
                                        <span>Vận tốc lắng ($w$):</span>
                                        <span className="font-medium">{detail.results.settlingVelocity.toFixed(2)} m/s</span>
                                    </li>
                                    <li className="flex justify-between">
                                        <span>Thời gian lưu ($t$):</span>
                                        <span className="font-medium">{detail.results.residenceTime.toFixed(1)} s</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="mt-8 pt-4 border-t flex justify-end">
                            <button
                                onClick={onClose}
                                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium"
                            >
                                Đóng lại
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default HistoryDetailModal;