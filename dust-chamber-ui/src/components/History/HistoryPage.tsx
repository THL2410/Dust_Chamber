import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import HistoryDetailModal from './HistoryDetailModal';
import { API_URL } from '../../config';

export interface HistoryItem {
    id: number;
    ownerName?: string;
    name: string;
    createdAt?: string;
    created_at?: string;
    updatedAt?: string;
    updated_at?: string;
    eta_total_percent?: number | null;
}

const HistoryPage = () => {
    const navigate = useNavigate();
    const [histories, setHistories] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const ITEMS_PER_PAGE = 10;

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    const [mode, setMode] = useState<string>('');
    const [fromDate, setFromDate] = useState<string>('');
    const [toDate, setToDate] = useState<string>('');
    const [sortBy, setSortBy] = useState<string>('createdAt');
    const [order, setOrder] = useState<'ASC' | 'DESC'>('DESC');
    const [showFilters, setShowFilters] = useState(false);

    const [selectedId, setSelectedId] = useState<number | string | null>(null);
    const [selectedTab, setSelectedTab] = useState<'input' | 'result' | 'fraction'>('input');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [refreshKey, setRefreshKey] = useState(0);

    const [toast, setToast] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);
    const toastTimerRef = useRef<number | null>(null);

    const [confirmModal, setConfirmModal] = useState<{
        title: string;
        message: string;
        confirmText: string;
        isDanger?: boolean;
        onConfirm: () => void;
    } | null>(null);

    const hasActiveFilters = Boolean(mode || fromDate || toDate || sortBy !== 'createdAt' || order !== 'DESC');

    const showToast = (type: 'success' | 'error', message: string) => {
        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
        setToast({ type, message });
        toastTimerRef.current = window.setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setPage(1);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        const fetchHistories = async () => {
            if (fromDate && toDate && fromDate > toDate) {
                showToast('error', 'Ngày bắt đầu (Từ ngày) phải nhỏ hơn hoặc bằng ngày kết thúc (Đến ngày).');
                return;
            }

            setLoading(true);
            try {
                const token = sessionStorage.getItem('accessToken');

                const params = new URLSearchParams({
                    page: String(page),
                    limit: String(ITEMS_PER_PAGE),
                    sortBy,
                    order,
                });
                if (debouncedSearchTerm.trim()) params.append('search', debouncedSearchTerm.trim());
                if (mode) params.append('mode', mode);
                if (fromDate) params.append('fromDate', fromDate);
                if (toDate) params.append('toDate', toDate);

                const url = `${API_URL}/api/history?${params.toString()}`;

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
    }, [page, debouncedSearchTerm, mode, fromDate, toDate, sortBy, order, refreshKey]);

    const handleResetFilters = () => {
        setSearchTerm('');
        setDebouncedSearchTerm('');
        setMode('');
        setFromDate('');
        setToDate('');
        setSortBy('createdAt');
        setOrder('DESC');
        setPage(1);
    };

    const handleOpenDetail = (id: number | string, tab: 'input' | 'result' | 'fraction') => {
        setSelectedId(id);
        setSelectedTab(tab);
        setIsModalOpen(true);
    };

    const handleEdit = (id: number) => {
        navigate(`/calculate?editId=${id}`);
    };

    const handleDelete = (id: number) => {
        setConfirmModal({
            title: 'Xác nhận xóa',
            message: 'Bạn có chắc chắn muốn xóa phương án này không?',
            confirmText: 'Xóa',
            isDanger: true,
            onConfirm: async () => {
                setConfirmModal(null);
                try {
                    const token = sessionStorage.getItem('accessToken');
                    const response = await fetch(`${API_URL}/api/history/${id}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (response.ok) {
                        showToast('success', 'Đã xóa phương án thành công!');
                        setRefreshKey(oldKey => oldKey + 1);
                    } else {
                        const errorData = await response.json().catch(() => ({}));
                        showToast('error', errorData.message || 'Có lỗi xảy ra khi xóa phương án.');
                    }
                } catch (error) {
                    console.error("Lỗi khi xóa:", error);
                    showToast('error', 'Lỗi kết nối đến máy chủ.');
                }
            },
        });
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-gray-900">Quản lý Lịch sử</h2>
                        <span className="px-2.5 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                            {totalItems} phương án
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <input
                            type="text"
                            placeholder="Tìm tên dự án, chủ sở hữu..."
                            className="border border-gray-300 rounded-lg px-3.5 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />

                        <button
                            onClick={() => setShowFilters(prev => !prev)}
                            className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition inline-flex items-center gap-1.5 ${
                                showFilters || hasActiveFilters
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            <span>Bộ lọc</span>
                            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                        </button>

                        <button
                            onClick={() => setRefreshKey(oldKey => oldKey + 1)}
                            className="bg-white text-gray-700 border border-gray-300 px-3.5 py-2 rounded-lg text-sm hover:bg-gray-50 transition font-medium"
                        >
                            Tải lại
                        </button>
                    </div>
                </div>

                {showFilters && (
                    <div className="pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end text-sm">
                        <div className="flex flex-col gap-1">
                            <label className="text-gray-500 font-medium text-xs">Chế độ tính</label>
                            <select
                                value={mode}
                                onChange={(e) => { setMode(e.target.value); setPage(1); }}
                                className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Tất cả</option>
                                <option value="CHECK">Kiểm tra (CHECK)</option>
                                <option value="DESIGN">Thiết kế (DESIGN)</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-gray-500 font-medium text-xs">Từ ngày</label>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                                className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-gray-500 font-medium text-xs">Đến ngày</label>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                                className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-gray-500 font-medium text-xs">Sắp xếp theo</label>
                            <select
                                value={sortBy}
                                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                                className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="createdAt">Ngày tạo</option>
                                <option value="name">Tên dự án</option>
                                <option value="etaTotalPercent">Hiệu suất tổng (%)</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-gray-500 font-medium text-xs">Thứ tự</label>
                            <select
                                value={order}
                                onChange={(e) => { setOrder(e.target.value as 'ASC' | 'DESC'); setPage(1); }}
                                className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="DESC">Giảm dần</option>
                                <option value="ASC">Tăng dần</option>
                            </select>
                        </div>

                        <button
                            onClick={handleResetFilters}
                            disabled={!hasActiveFilters && !searchTerm}
                            className="px-3 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition font-medium"
                        >
                            Xóa bộ lọc
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 uppercase text-xs font-semibold tracking-wider">
                                <th className="py-3.5 px-4 w-12 text-center">STT</th>
                                <th className="py-3.5 px-4">Dự án & Chủ sở hữu</th>
                                <th className="py-3.5 px-4 whitespace-nowrap">Ngày tạo</th>
                                <th className="py-3.5 px-4 whitespace-nowrap">Cập nhật lần cuối</th>
                                <th className="py-3.5 px-4 text-center">Xem chi tiết</th>
                                <th className="py-3.5 px-4 text-center">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-gray-500">
                                        Đang tải dữ liệu...
                                    </td>
                                </tr>
                            ) : histories.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-gray-500">
                                        Không tìm thấy phương án nào phù hợp.
                                    </td>
                                </tr>
                            ) : (
                                histories.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-gray-50/70 transition">
                                        <td className="py-3.5 px-4 text-center text-gray-500 font-medium">
                                            {(page - 1) * ITEMS_PER_PAGE + index + 1}
                                        </td>

                                        <td className="py-3.5 px-4">
                                            <div className="font-semibold text-gray-900">{item.name}</div>
                                            <div className="text-xs text-gray-500 mt-0.5">
                                                {item.ownerName || 'Chưa cập nhật'}
                                            </div>
                                        </td>

                                        <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap text-xs">
                                            {formatDate(item.createdAt || item.created_at)}
                                        </td>

                                        <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap text-xs">
                                            {formatDate(item.updatedAt || item.updated_at || item.createdAt || item.created_at)}
                                        </td>

                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                    onClick={() => handleOpenDetail(item.id, 'input')}
                                                    className="px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                                                >
                                                    Đầu vào
                                                </button>
                                                <button
                                                    onClick={() => handleOpenDetail(item.id, 'result')}
                                                    className="px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                                                >
                                                    Kết quả
                                                </button>
                                                <button
                                                    onClick={() => handleOpenDetail(item.id, 'fraction')}
                                                    className="px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition"
                                                >
                                                    Dải bụi
                                                </button>
                                            </div>
                                        </td>

                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleEdit(item.id)}
                                                    className="px-2.5 py-1 rounded-md text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 transition"
                                                >
                                                    Sửa
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="px-2.5 py-1 rounded-md text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 transition"
                                                >
                                                    Xóa
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-5 py-3.5 border-t border-gray-200 bg-gray-50/50 text-sm">
                    <div className="text-gray-500">
                        Hiển thị <span className="font-semibold text-gray-700">{histories.length}</span> /{' '}
                        <span className="font-semibold text-gray-700">{totalItems}</span> bản ghi
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(page - 1)}
                            className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition text-xs font-medium"
                        >
                            Trang trước
                        </button>
                        <span className="text-gray-700 font-medium px-2 text-xs">
                            Trang {page} / {totalPages || 1}
                        </span>
                        <button
                            disabled={page >= totalPages || totalPages === 0}
                            onClick={() => setPage(page + 1)}
                            className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition text-xs font-medium"
                        >
                            Trang sau
                        </button>
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <HistoryDetailModal
                    id={selectedId}
                    initialTab={selectedTab}
                    onClose={() => setIsModalOpen(false)}
                />
            )}

            {/* Modal xác nhận thay thế window.confirm */}
            {confirmModal && (
                <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
                    <div className="bg-white w-[400px] rounded-xl shadow-2xl p-6 space-y-4">
                        <h3 className="text-lg font-bold text-gray-900">
                            {confirmModal.title}
                        </h3>
                        <p className="text-sm text-gray-600">{confirmModal.message}</p>
                        <div className="flex justify-end gap-2.5 pt-2">
                            <button
                                onClick={() => setConfirmModal(null)}
                                className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={confirmModal.onConfirm}
                                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition ${
                                    confirmModal.isDanger
                                        ? 'bg-red-600 hover:bg-red-700'
                                        : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                            >
                                {confirmModal.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast thông báo nổi */}
            {toast && (
                <div
                    className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${
                        toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
                    }`}
                >
                    <span>{toast.message}</span>
                    <button
                        onClick={() => setToast(null)}
                        className="text-white/80 hover:text-white font-bold text-base leading-none"
                    >
                        &times;
                    </button>
                </div>
            )}
        </div>
    );
};

export default HistoryPage;