import { useState, useEffect } from 'react';
import HistoryDetailModal from '../History/HistoryDetailModal';
import EditUserModal from './EditUserModal';

import { type UserItem, mockUsersData } from './mockData';

const UserManagementPage = () => {
    const [users, setUsers] = useState<UserItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedEditUser, setSelectedEditUser] = useState<UserItem | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedHistoryId, setSelectedHistoryId] = useState<number | string | null>(null);

    useEffect(() => {
        setTimeout(() => {
            setUsers(mockUsersData);
            setLoading(false);
        }, 500);
    }, []);

    const handleViewHistory = (id: string | number) => {
        setSelectedHistoryId(id);
        setIsModalOpen(true);
    };

    const handleEditInfo = (user: UserItem) => {
        setSelectedEditUser(user);
        setIsEditModalOpen(true);
    };

    const handleToggleStatus = (id: string | number, currentStatus: string) => {
        console.log(`Đổi trạng thái user ${id} từ ${currentStatus}`);
    };

    const handleDelete = (id: string | number) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa người dùng này?")) {
            console.log("Xóa user:", id);
        }
    };

    return (
        <div className="p-6 max-w-screen-2xl mx-auto bg-white rounded-xl shadow-md space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Quản lý người dùng</h2>

                <input
                    type="text"
                    placeholder="Tìm theo họ tên..."
                    className="border border-gray-300 rounded-lg px-4 py-2 w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                    <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                        <th className="py-3 px-4 border-b w- text-center">STT</th>
                        <th className="py-3 px-4 border-b">Họ và tên</th>
                        <th className="py-3 px-4 border-b">Địa chỉ</th>
                        <th className="py-3 px-4 border-b">Số điện thoại</th>
                        <th className="py-3 px-4 border-b">Email</th>
                        <th className="py-3 px-4 border-b">Phân quyền</th>
                        <th className="py-3 px-4 border-b text-center">Trạng thái</th>
                        <th className="py-3 px-4 border-b text-center">Hành động</th>
                    </tr>
                    </thead>
                    <tbody className="text-gray-600 text-sm font-light">
                    {loading ? (
                        <tr><td colSpan={8} className="text-center py-6">Đang tải dữ liệu...</td></tr>
                    ) : users.length === 0 ? (
                        <tr><td colSpan={8} className="text-center py-6">Không tìm thấy người dùng</td></tr>
                    ) : (
                        users.map((user, index) => (
                            <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="py-3 px-4 text-center">{index + 1}</td>
                                <td className="py-3 px-4 font-medium text-gray-900">{user.fullName}</td>

                                <td className="py-3 px-4 text-gray-700">{user.address}</td>
                                <td className="py-3 px-4 text-gray-700">{user.phone}</td>
                                <td className="py-3 px-4 text-gray-700">{user.email}</td>

                                <td className="py-3 px-4">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${user.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                                      {user.role}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                    {user.status === 'active' ? (
                                        <span className="bg-green-100 text-green-700 py-1 px-3 rounded-full text-xs font-semibold">Đang hoạt động</span>
                                    ) : (
                                        <span className="bg-red-100 text-red-700 py-1 px-3 rounded-full text-xs font-semibold">Đã khóa</span>
                                    )}
                                </td>

                                <td className="py-3 px-4 text-center">
                                    <div className="flex justify-center items-center space-x-2">
                                        <button
                                            onClick={() => handleViewHistory(user.id)}
                                            className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white rounded transition tooltip"
                                            title="Xem lịch sử chi tiết"
                                        >
                                            ⏱️
                                        </button>

                                        <button
                                            onClick={() => handleEditInfo(user)}
                                            className="p-1.5 bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white rounded transition"
                                            title="Sửa thông tin"
                                        >
                                            ✏️
                                        </button>

                                        <button
                                            onClick={() => handleToggleStatus(user.id, user.status)}
                                            className="p-1.5 bg-gray-100 text-gray-600 hover:bg-gray-500 hover:text-white rounded transition"
                                            title="Chỉnh sửa trạng thái"
                                        >
                                            🔒
                                        </button>
                                        <button
                                            onClick={() => handleDelete(user.id)}
                                            className="p-1.5 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded transition"
                                            title="Xóa người dùng"
                                        >
                                            ❌
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <HistoryDetailModal
                    id={selectedHistoryId}
                    onClose={() => setIsModalOpen(false)}
                />
            )}

            {isEditModalOpen && (
                <EditUserModal
                    userData={selectedEditUser}
                    onClose={() => setIsEditModalOpen(false)}
                    onSuccess={() => {
                        console.log("Cập nhật thành công, cần reload bảng");
                    }}
                />
            )}
        </div>
    );
};

export default UserManagementPage;