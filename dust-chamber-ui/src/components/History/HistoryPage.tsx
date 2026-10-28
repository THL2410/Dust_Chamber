import { useState, useEffect } from 'react';
import HistoryDetailModal from './HistoryDetailModal';

export interface HistoryItem {
    id: number;
    ownerName?: string;
    name: string;
    createdAt?: string;
    created_at?: string;
    eta_total_percent?: number;
}

const HistoryPage = () => {
    const [histories, setHistories] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const ITEMS_PER_PAGE = 10;

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    const [selectedId, setSelectedId] = useState<number | string | null>(null);
    // KHÔI PHỤC LẠI STATE LƯU TAB ĐƯỢC CHỌN
    const [selectedTab, setSelectedTab] = useState<'input' | 'result' | 'fraction'>('input');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setPage(1);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        const fetchHistories = async () => {
            setLoading(true);
            try {
                const token = sessionStorage.getItem('accessToken');
                const url = `http://localhost:3001/api/history?page=${page}&limit=${ITEMS_PER_PAGE}&search=${encodeURIComponent(debouncedSearchTerm)}`;

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) throw new Error('Không thể tải lịch sử tính toán');

                const result = await response.json();

                if (result.meta) {
                    setHistories(result.data);
                    setTotalPages(result.meta.totalPages);
                    setTotalItems(result.meta.total);
                } else {
                    setHistories(result);
                    setTotalPages(1);
                    setTotalItems(result.length);
                }
            } catch (error) {
                console.error("Lỗi khi lấy dữ liệu:", error);
                setHistories([]);
            } finally {
                setLoading(false);
            }
        };

        fetchHistories();
    }, [page, debouncedSearchTerm, refreshKey]);

    const handleOpenDetail = (id: number | string, tab: 'input' | 'result' | 'fraction') => {
        setSelectedId(id);
        setSelectedTab(tab);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa phương án này không?')) return;

        try {
            const token = sessionStorage.getItem('accessToken');
            const response = await fetch(`http://localhost:3001/api/history/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                setRefreshKey(oldKey => oldKey + 1);
            } else {
                alert('Có lỗi xảy ra khi xóa phương án.');
            }
        } catch (error) {
            console.error("Lỗi khi xóa:", error);
            alert('Lỗi kết nối đến máy chủ.');
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Không xác định';
        return new Date(dateString).toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    return (
        <div className="p-6 max-w-[80%] mx-auto bg-white rounded-xl shadow-md space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Quản lý Lịch sử</h2>

                <div className="flex items-center space-x-3">
                    <input
                        type="text"
                        placeholder="Tìm tên dự án hoặc chủ sở hữu..."
                        className="border border-gray-300 rounded-lg px-4 py-2 w-72 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 focus:w-80"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button
                        onClick={() => {
                            setRefreshKey(oldKey => oldKey + 1);
                        }}
                        className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 transition font-medium"
                    >
                        Tải lại
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                    <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                        <th className="py-3 px-4 border-b w-12 text-center">STT</th>
                        <th className="py-3 px-4 border-b">Chủ sở hữu</th>
                        <th className="py-3 px-4 border-b">Tên dự án</th>
                        <th className="py-3 px-4 border-b">Ngày tạo</th>
                        <th className="py-3 px-4 border-b text-center w-50">Thông số đầu vào</th>
                        <th className="py-3 px-4 border-b text-center w-50">Kết quả tính toán</th>
                        <th className="py-3 px-4 border-b text-center w-50">Kết quả dải bụi</th>
                        <th className="py-3 px-4 border-b text-center">Hành động</th>
                    </tr>
                    </thead>
                    <tbody className="text-gray-600 text-sm font-light">
                    {loading ? (
                        <tr><td colSpan={8} className="text-center py-8 font-medium">Đang tải dữ liệu...</td></tr>
                    ) : histories.length === 0 ? (
                        <tr><td colSpan={8} className="text-center py-8 font-medium text-red-500">Không tìm thấy dữ liệu phù hợp</td></tr>
                    ) : (
                        histories.map((item, index) => (
                            <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                                <td className="py-3 px-4 text-center font-medium">
                                    {(page - 1) * ITEMS_PER_PAGE + index + 1}
                                </td>
                                <td className="py-3 px-4 font-medium text-gray-800">
                                    {item.ownerName || 'Chưa cập nhật'}
                                </td>
                                <td className="py-3 px-4 text-gray-700">{item.name}</td>
                                <td className="py-3 px-4 text-gray-700">
                                    {formatDate(item.createdAt || item.created_at)}
                                </td>

                                {/* NÚT 1: THÔNG SỐ ĐẦU VÀO -> Truyền 'input' */}
                                <td className="py-3 px-4 text-center">
                                    <button
                                        onClick={() => handleOpenDetail(item.id, 'input')}
                                        className="bg-indigo-50 text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded hover:bg-indigo-100 transition inline-flex items-center space-x-1 w-full justify-center text-xs font-medium"
                                    >
                                        <span>📥 Chi tiết</span>
                                    </button>
                                </td>

                                {/* NÚT 2: KẾT QUẢ TÍNH TOÁN -> Truyền 'result' */}
                                <td className="py-3 px-4 text-center">
                                    <button
                                        onClick={() => handleOpenDetail(item.id, 'result')}
                                        className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1.5 rounded hover:bg-emerald-100 transition inline-flex items-center space-x-1 w-full justify-center text-xs font-medium"
                                    >
                                        <span>📊 Chi tiết</span>
                                    </button>
                                </td>

                                {/* NÚT 3: KẾT QUẢ DẢI BỤI -> Truyền 'fraction' */}
                                <td className="py-3 px-4 text-center">
                                    <button
                                        onClick={() => handleOpenDetail(item.id, 'fraction')}
                                        className="bg-amber-50 text-amber-600 border border-amber-200 px-3 py-1.5 rounded hover:bg-amber-100 transition inline-flex items-center space-x-1 w-full justify-center text-xs font-medium"
                                    >
                                        <span>🌫️ Chi tiết</span>
                                    </button>
                                </td>

                                <td className="py-3 px-4 text-center">
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded hover:bg-red-100 transition inline-flex items-center space-x-1 w-full justify-center text-xs font-medium"
                                    >
                                        <span>🗑️ Xóa</span>
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-500">
                    Hiển thị <span className="font-medium">{histories.length}</span> trên tổng số <span className="font-medium">{totalItems}</span> bản ghi
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        disabled={page <= 1}
                        onClick={() => setPage(page - 1)}
                        className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded-md disabled:opacity-50 hover:bg-gray-300 transition"
                    >
                        Trang trước
                    </button>
                    <span className="text-gray-700 font-medium px-3 bg-gray-100 py-1.5 rounded-md">
                        Trang {page} / {totalPages}
                    </span>
                    <button
                        disabled={page >= totalPages || totalPages === 0}
                        onClick={() => setPage(page + 1)}
                        className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded-md disabled:opacity-50 hover:bg-gray-300 transition"
                    >
                        Trang sau
                    </button>
                </div>
            </div>

            {isModalOpen && (
                <HistoryDetailModal
                    id={selectedId}
                    initialTab={selectedTab}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </div>
    );
};

export default HistoryPage;