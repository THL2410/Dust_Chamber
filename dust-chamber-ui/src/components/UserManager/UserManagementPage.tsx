import { useState, useEffect } from 'react';
import EditUserModal from './EditUserModal';
import AddUserModal from './AddUserModal';
import UserHistoryListModal from './UserHistoryListModal';

export interface UserItem {
    id: number | string;
    fullName: string;
    phone: string;
    email: string;
    role: string;
    isActive: boolean;
}

const UserManagementPage = () => {
    const [users, setUsers] = useState<UserItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedEditUser, setSelectedEditUser] = useState<UserItem | null>(null);

    const [isUserHistoryListModalOpen, setIsUserHistoryListModalOpen] = useState(false);
    const [selectedUserIdForHistory, setSelectedUserIdForHistory] = useState<number | string | null>(null);

    const fetchUsers = async () => {
        try {
            const token = sessionStorage.getItem('accessToken');
            const response = await fetch(`http://localhost:3001/api/users`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                console.error('Lỗi khi lấy dữ liệu từ server');
                setUsers([]);
                return;
            }

            const result = await response.json();
            setUsers(result.data || result);
        } catch (error) {
            console.error("Lỗi fetch users:", error);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setTimeout(() => {
            fetchUsers();
        }, 0);
    }, []);

    const handleViewHistory = (userId: string | number) => {
        setSelectedUserIdForHistory(userId);
        setIsUserHistoryListModalOpen(true);
    };

    const handleEditInfo = (user: UserItem) => {
        setSelectedEditUser(user);
        setIsEditModalOpen(true);
    };

    const handleToggleStatus = async (id: string | number, currentStatus: boolean) => {
        const actionText = currentStatus ? 'khóa' : 'mở khóa';
        if (!window.confirm(`Bạn có chắc chắn muốn ${actionText} người dùng này?`)) return;

        try {
            const token = sessionStorage.getItem('accessToken');
            const response = await fetch(`http://localhost:3001/api/users/lock/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                fetchUsers();
            } else {
                const errorData = await response.json().catch(() => ({}));
                alert(`Thất bại: ${errorData.message || 'Không thể cập nhật trạng thái'}`);
            }
        } catch (error) {
            console.error("Lỗi đổi trạng thái:", error);
            alert("Lỗi kết nối đến server!");
        }
    };

    const handleDelete = async (id: string | number) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa người dùng này?")) {
            try {
                const token = localStorage.getItem('accessToken');

                const response = await fetch(`http://localhost:3001/api/users/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    fetchUsers();
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    alert(`Xóa thất bại: ${errorData.message || 'Lỗi từ phía server'}`);
                }
            } catch (error) {
                console.error("Lỗi xóa người dùng:", error);
                alert("Lỗi kết nối đến server!");
            }
        }
    };

    const filteredUsers = users.filter(user =>
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 max-w-7xl mx-auto bg-white rounded-xl shadow-md space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Quản lý người dùng</h2>

                <div className="flex space-x-4">
                    <input
                        type="text"
                        placeholder="Tìm theo họ tên, email..."
                        className="border border-gray-300 rounded-lg px-4 py-2 w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-sm flex items-center"
                    >
                        <span className="mr-2 font-bold">+</span> Thêm mới
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                    <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                        <th className="py-3 px-4 border-b w-16 text-center">STT</th>
                        <th className="py-3 px-4 border-b">Họ và tên</th>
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
                    ) : filteredUsers.length === 0 ? (
                        <tr><td colSpan={8} className="text-center py-6">Không tìm thấy người dùng</td></tr>
                    ) : (
                        filteredUsers.map((user, index) => (
                            <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="py-3 px-4 text-center">{index + 1}</td>
                                <td className="py-3 px-4 font-medium text-gray-900">{user.fullName}</td>
                                <td className="py-3 px-4 text-gray-700">{user.phone}</td>
                                <td className="py-3 px-4 text-gray-700">{user.email}</td>

                                <td className="py-3 px-4">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${user.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                                      {user.role}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                    {user.isActive? (
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
                                            onClick={() => handleToggleStatus(user.id, user.isActive)}
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

            {isAddModalOpen && (
                <AddUserModal
                    onClose={() => setIsAddModalOpen(false)}
                    onSuccess={() => {
                        fetchUsers();
                    }}
                />
            )}

            {isUserHistoryListModalOpen && (
                <UserHistoryListModal
                    userId={selectedUserIdForHistory}
                    onClose={() => setIsUserHistoryListModalOpen(false)}
                />
            )}

            {isEditModalOpen && (
                <EditUserModal
                    userData={selectedEditUser}
                    onClose={() => setIsEditModalOpen(false)}
                    onSuccess={() => {
                        fetchUsers();
                    }}
                />
            )}
        </div>
    );
};

export default UserManagementPage;