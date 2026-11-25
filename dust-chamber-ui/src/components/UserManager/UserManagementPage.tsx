import { useState, useEffect, useRef } from "react";
import EditUserModal from "./EditUserModal";
import AddUserModal from "./AddUserModal";
import UserHistoryListModal from "./UserHistoryListModal";
import { API_URL } from "../../config";

export interface UserItem {
  id: number | string;
  fullName: string;
  phone: string;
  email: string;
  role: string;
  isActive: boolean;
}

const getCurrentUserId = (): number | string | undefined => {
  const token =
    sessionStorage.getItem("accessToken") ||
    localStorage.getItem("accessToken");
  if (!token) return undefined;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.id ?? payload.sub;
  } catch {
    return undefined;
  }
};

const UserManagementPage = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEditUser, setSelectedEditUser] = useState<UserItem | null>(
    null,
  );

  const [isUserHistoryListModalOpen, setIsUserHistoryListModalOpen] =
    useState(false);
  const [selectedUserIdForHistory, setSelectedUserIdForHistory] = useState<
    number | string | null
  >(null);

  const [toast, setToast] = useState<{
    type: "success" | "error";
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

  const currentUserId = getCurrentUserId();
  const hasActiveFilters = Boolean(roleFilter || statusFilter);

  const showToast = (type: "success" | "error", message: string) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ type, message });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/users`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error("Lỗi khi lấy dữ liệu từ server");
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


  const handleResetFilters = () => {
    setSearchTerm("");
    setRoleFilter("");
    setStatusFilter("");
  };

  const handleViewHistory = (userId: string | number) => {
    setSelectedUserIdForHistory(userId);
    setIsUserHistoryListModalOpen(true);
  };

  const handleEditInfo = (user: UserItem) => {
    setSelectedEditUser(user);
    setIsEditModalOpen(true);
  };

  const handleToggleStatus = (id: string | number, currentStatus: boolean) => {
    const actionText = currentStatus ? "khóa" : "mở khóa";
    setConfirmModal({
      title: `Xác nhận ${actionText}`,
      message: `Bạn có chắc chắn muốn ${actionText} người dùng này?`,
      confirmText: currentStatus ? "Khóa" : "Mở khóa",
      isDanger: currentStatus,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const token = sessionStorage.getItem("accessToken");
          const response = await fetch(`${API_URL}/api/users/lock/${id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            showToast("success", `Đã ${actionText} người dùng thành công!`);
            fetchUsers();
          } else {
            const errorData = await response.json().catch(() => ({}));
            showToast(
              "error",
              errorData.message || "Không thể cập nhật trạng thái",
            );
          }
        } catch (error) {
          console.error("Lỗi đổi trạng thái:", error);
          showToast("error", "Lỗi kết nối đến server!");
        }
      },
    });
  };

  const handleDelete = (id: string | number) => {
    setConfirmModal({
      title: "Xác nhận xóa",
      message: "Bạn có chắc chắn muốn xóa người dùng này?",
      confirmText: "Xóa",
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const token = sessionStorage.getItem("accessToken");
          const response = await fetch(`${API_URL}/api/users/${id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            showToast("success", "Đã xóa người dùng thành công!");
            fetchUsers();
          } else {
            const errorData = await response.json().catch(() => ({}));
            showToast("error", errorData.message || "Lỗi từ phía server");
          }
        } catch (error) {
          console.error("Lỗi xóa người dùng:", error);
          showToast("error", "Lỗi kết nối đến server!");
        }
      },
    });
  };

  const filteredUsers = users.filter((user) => {
    const keyword = searchTerm.toLowerCase();
    const matchSearch =
      (user.fullName || "").toLowerCase().includes(keyword) ||
      (user.email || "").toLowerCase().includes(keyword) ||
      (user.phone || "").includes(searchTerm);

    const matchRole =
      !roleFilter || (user.role || "user").toLowerCase() === roleFilter;
    const matchStatus =
      !statusFilter ||
      (statusFilter === "active" && user.isActive) ||
      (statusFilter === "locked" && !user.isActive);

    return matchSearch && matchRole && matchStatus;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">
              Quản lý người dùng
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full border border-blue-100">
              {filteredUsers.length} tài khoản
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="text"
              placeholder="Tìm họ tên, email, SĐT..."
              className="border border-gray-300 rounded-lg px-3.5 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <button
              onClick={() => setShowFilters((prev) => !prev)}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition inline-flex items-center gap-1.5 ${
                showFilters || hasActiveFilters
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span>Bộ lọc</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-blue-600" />
              )}
            </button>

            <button
              onClick={() => fetchUsers()}
              className="bg-white text-gray-700 border border-gray-300 px-3.5 py-2 rounded-lg text-sm hover:bg-gray-50 transition font-medium"
            >
              Tải lại
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm inline-flex items-center gap-1.5"
            >
              <span className="font-bold">+</span>
              <span>Thêm mới</span>
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end text-sm">
            <div className="flex flex-col gap-1">
              <label className="text-gray-500 font-medium text-xs">
                Phân quyền
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tất cả quyền</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-gray-500 font-medium text-xs">
                Trạng thái
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="locked">Đã khóa</option>
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
                <th className="py-3.5 px-4">Người dùng</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Số điện thoại</th>
                <th className="py-3.5 px-4 text-center">Phân quyền</th>
                <th className="py-3.5 px-4 text-center">Trạng thái</th>
                <th className="py-3.5 px-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    Không tìm thấy người dùng nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, index) => {
                  const isAdmin = user.role?.toLowerCase() === "admin";

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50/70 transition"
                    >
                      <td className="py-3.5 px-4 text-center text-gray-500 font-medium">
                        {index + 1}
                      </td>

                      {/* Gom Họ tên & Email vào 1 ô cho gọn */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-900">
                          {user.fullName}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {user.email}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap text-xs">
                        {user.phone || "—"}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                            isAdmin
                              ? "bg-purple-50 text-purple-700 border border-purple-100"
                              : "bg-gray-100 text-gray-700 border border-gray-200"
                          }`}
                        >
                          {user.role || "User"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {user.isActive ? (
                          <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-100 py-0.5 px-2.5 rounded-full text-xs font-medium">
                            Đang hoạt động
                          </span>
                        ) : (
                          <span className="inline-block bg-red-50 text-red-700 border border-red-100 py-0.5 px-2.5 rounded-full text-xs font-medium">
                            Đã khóa
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewHistory(user.id)}
                            className="px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                          >
                            Lịch sử
                          </button>
                          <button
                            onClick={() => handleEditInfo(user)}
                            className="px-2.5 py-1 rounded-md text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 transition"
                          >
                            Sửa
                          </button>

                          <button
                            onClick={() =>
                              handleToggleStatus(user.id, user.isActive)
                            }
                            className="px-2.5 py-1 rounded-md text-xs font-medium text-amber-700 hover:bg-amber-50 border border-amber-200 transition"
                          >
                            {user.isActive ? "Khóa" : "Mở khóa"}
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="px-2.5 py-1 rounded-md text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 transition"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center px-5 py-3.5 border-t border-gray-200 bg-gray-50/50 text-sm text-gray-500">
          <div>
            Hiển thị{" "}
            <span className="font-semibold text-gray-700">
              {filteredUsers.length}
            </span>{" "}
            /{" "}
            <span className="font-semibold text-gray-700">{users.length}</span>{" "}
            tài khoản
          </div>
        </div>
      </div>

      {isAddModalOpen && (
        <AddUserModal
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            showToast("success", "Thêm người dùng mới thành công!");
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
          currentUserId={currentUserId}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            showToast("success", "Cập nhật thông tin thành công!");
            fetchUsers();
          }}
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
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
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
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
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

export default UserManagementPage;