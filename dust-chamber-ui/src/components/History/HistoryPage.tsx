import { useState, useEffect } from 'react';
import HistoryDetailModal from './HistoryDetailModal';

import { type HistoryItem, mockHistoryData } from './mockData';

const HistoryPage = () => {
    const [histories, setHistories] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');

    const [selectedId, setSelectedId] = useState<number | string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const ITEMS_PER_PAGE = 10;

    const fetchHistories = async () => {
        setLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 500));

            const filteredData = mockHistoryData.filter(item =>
                item.projectName.toLowerCase().includes(searchTerm.toLowerCase())
            );

            const total = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
            setTotalPages(total > 0 ? total : 1);

            const startIndex = (page - 1) * ITEMS_PER_PAGE;
            const paginatedData = filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

            setHistories(paginatedData);

        } catch (error) {
            console.error("Lỗi khi lấy dữ liệu lịch sử:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            fetchHistories();
        }, 500);
        return () => clearTimeout(delayDebounce);
    }, [page, searchTerm]);

    const handleOpenDetail = (id: number | string) => {
        setSelectedId(id);
        setIsModalOpen(true);
    };

    return (
        <div className="p-6 max-w-[95%] mx-auto bg-white rounded-xl shadow-md space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Lịch sử tính toán</h2>

                <input
                    type="text"
                    placeholder="Tìm tên dự án..."
                    className="border border-gray-300 rounded-lg px-4 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
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
                    ) : histories?.length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-4">Không tìm thấy dữ liệu</td></tr>
                    ) : (
                        histories?.map((item, index) => (
                            <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="py-3 px-6">{(page - 1) * ITEMS_PER_PAGE + index + 1}</td>
                                <td className="py-3 px-6 font-medium text-gray-900">{item.projectName}</td>
                                <td className="py-3 px-6">{new Date(item.createdAt).toLocaleDateString('vi-VN')}</td>
                                <td className="py-3 px-6 text-green-600 font-semibold">{item.efficiency}%</td>
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
                    className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
                >
                    Trang trước
                </button>
                <span className="text-gray-700">Trang {page} / {totalPages || 1}</span>
                <button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
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