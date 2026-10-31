import React, { useState, useEffect } from 'react';
import HistoryDetailModal from '../History/HistoryDetailModal';

export interface ProjectSummary {
    id: number;
    userId: number;
    ownerName: string;
    name: string;
    mode: string;
    createdAt: string;
    flowRateM3H: number;
    etaTotalPercent: number;
}

export interface UserHistoryListModalProps {
    userId: number | string | null;
    onClose: () => void;
}

const UserHistoryListModal: React.FC<UserHistoryListModalProps> = ({ userId, onClose }) => {
    const [projects, setProjects] = useState<ProjectSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedProjectId, setSelectedProjectId] = useState<number | string | null>(null);

    useEffect(() => {
        if (!userId) return;

        const fetchUserHistory = async () => {
            setLoading(true);
            setError(null);
            try {
                const token = sessionStorage.getItem('accessToken');
                const response = await fetch(`http://localhost:3001/api/history/user/${userId}`, {
                    headers: {
                        'method': "GET",
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.message || "Lỗi khi tải danh sách dự án");
                }

                const result = await response.json();
                setProjects(result.data || []);
            } catch (err) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUserHistory();
    }, [userId]);

    if (!userId) return null;

    return (
        <>
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm transition-opacity">
                <div className="bg-white rounded-xl shadow-2xl w-11/12 max-w-4xl h-[70vh] flex flex-col overflow-hidden animate-fade-in-up">

                    {/* Header */}
                    <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">
                                Lịch sử tính toán của người dùng
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                User ID: <span className="font-semibold">{userId}</span>
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-red-500 transition-colors p-2"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 bg-white">
                        {loading ? (
                            <div className="flex justify-center items-center h-full">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                <span className="ml-3 text-gray-600">Đang tải danh sách dự án...</span>
                            </div>
                        ) : error ? (
                            <div className="text-center text-red-500 mt-10 font-medium">{error}</div>
                        ) : projects.length === 0 ? (
                            <div className="text-center text-gray-500 mt-10">Người dùng này chưa có dự án/lịch sử tính toán nào.</div>
                        ) : (
                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                    <tr className="bg-gray-100 text-gray-700 text-sm uppercase tracking-wider">
                                        <th className="py-3 px-4 border-b">ID Dự án</th>
                                        <th className="py-3 px-4 border-b">Tên dự án</th>
                                        <th className="py-3 px-4 border-b">Chế độ</th>
                                        <th className="py-3 px-4 border-b">Ngày tạo</th>
                                        <th className="py-3 px-4 border-b text-center">Hành động</th>
                                    </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                    {projects.map((project) => (
                                        <tr key={project.id} className="border-b border-gray-200 hover:bg-blue-50/50 transition">
                                            <td className="py-3 px-4 font-semibold text-gray-600">#{project.id}</td>
                                            <td className="py-3 px-4 font-medium text-gray-900">{project.name}</td>
                                            <td className="py-3 px-4">
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                                                        {project.mode}
                                                    </span>
                                            </td>
                                            <td className="py-3 px-4 text-gray-500">
                                                {new Date(project.createdAt).toLocaleDateString('vi-VN')}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <button
                                                    onClick={() => setSelectedProjectId(project.id)}
                                                    className="px-4 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition shadow-sm text-xs font-medium"
                                                >
                                                    Xem chi tiết
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {selectedProjectId && (
                <HistoryDetailModal
                    id={selectedProjectId}
                    onClose={() => setSelectedProjectId(null)}
                />
            )}
        </>
    );
};

export default UserHistoryListModal;