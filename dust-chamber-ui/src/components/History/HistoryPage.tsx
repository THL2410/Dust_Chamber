import { useState, useEffect, useMemo } from 'react';
import HistoryDetailModal from './HistoryDetailModal';

export interface HistoryItem {
    id: number;
    name: string;
    created_at: string;
    eta_total_percent: number;
}

const HistoryPage = () => {
    const [allData, setAllData] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');

    const [selectedId, setSelectedId] = useState<number | string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        const fetchHistories = async () => {
            try {
                const token = sessionStorage.getItem('accessToken');
                const response = await fetch('http://localhost:3001/api/calculations', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) throw new Error('Không thể tải lịch sử tính toán');

                const data = await response.json();
                setAllData(data);
            } catch (error) {
                console.error("Lỗi khi lấy dữ liệu:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistories();
    }, []);

    const { histories, totalPages } = useMemo(() => {
        const filtered = allData.filter(item =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const total = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;

        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const paginated = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

        return {
            histories: paginated,
            totalPages: total
        };
    }, [allData, searchTerm, page]);

    const handleOpenDetail = (id: number | string) => {
        setSelectedId(id);
        setIsModalOpen(true);
    };

    return (
        <div className="p-6 max-w-[95%] mx-auto bg-white rounded-xl shadow-md space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Lịch sử</h2>

                <input
                    type="text"
                    placeholder="Tìm tên cấu hình..."
                    className="border border-gray-300 rounded-lg px-4 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setPage(1);
                    }}
                />
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                    <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                        <th className="py-3 px-6 border-b">STT</th>
                        <th className="py-3 px-6 border-b">Tên cấu hình</th>
                        <th className="py-3 px-6 border-b">Ngày tính</th>
                        <th className="py-3 px-6 border-b">Hiệu suất (%)</th>
                        <th className="py-3 px-6 border-b text-center">Hành động</th>
                    </tr>
                    </thead>
                    <tbody className="text-gray-600 text-sm font-light">
                    {loading ? (
                        <tr><td colSpan={5} className="text-center py-4">Đang tải dữ liệu...</td></tr>
                    ) : histories.length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-4">Không tìm thấy dữ liệu</td></tr>
                    ) : (
                        histories.map((item, index) => (
                            <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="py-3 px-6">{(page - 1) * ITEMS_PER_PAGE + index + 1}</td>
                                <td className="py-3 px-6 font-medium text-gray-900">{item.name}</td>
                                <td className="py-3 px-6">{new Date(item.created_at).toLocaleString('vi-VN')}</td>
                                <td className="py-3 px-6 text-green-600 font-semibold">
                                    {Number(item.eta_total_percent).toFixed(2)}%
                                </td>
                                <td className="py-3 px-6 text-center">
                                    <button
                                        onClick={() => handleOpenDetail(item.id)}
                                        className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600 transition"
                                    >
                                        Xem chi tiết
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-end items-center space-x-2">
                <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300 transition"
                >
                    Trang trước
                </button>
                <span className="text-gray-700 font-medium">Trang {page} / {totalPages}</span>
                <button
                    disabled={page === totalPages || totalPages === 0}
                    onClick={() => setPage(page + 1)}
                    className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300 transition"
                >
                    Trang sau
                </button>
            </div>

            {isModalOpen && (
                <HistoryDetailModal
                    id={selectedId}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </div>
    );
};

export default HistoryPage;