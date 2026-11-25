import React, { useState } from "react";
import { API_URL } from "../../config";

export interface UserFormData {
  id?: number | string;
  fullName: string;
  phone: string;
  email: string;
  role: string;
}

interface EditUserModalProps {
  userData: UserFormData | null;
  currentUserId?: number | string;
  onClose: () => void;
  onSuccess?: () => void;
}

const validators: Partial<Record<keyof UserFormData, (v: string) => string>> = {
  fullName: (v) =>
    !v.trim()
      ? "Vui lòng nhập họ và tên"
      : v.trim().length < 2
        ? "Tối thiểu 2 ký tự"
        : "",
  email: (v) =>
    !v.trim()
      ? "Vui lòng nhập email"
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
        ? "Email không hợp lệ"
        : "",
  phone: (v) =>
    !v.trim()
      ? "Vui lòng nhập số điện thoại"
      : !/^0\d{9}$/.test(v.trim())
        ? "SĐT phải gồm 10 số, bắt đầu bằng 0"
        : "",
};

const EditUserModal = ({
  userData,
  currentUserId,
  onClose,
  onSuccess,
}: EditUserModalProps) => {
  const [formData, setFormData] = useState<UserFormData>({
    fullName: userData?.fullName || "",
    phone: userData?.phone || "",
    email: userData?.email || "",
    role: userData?.role || "user",
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof UserFormData, string>>
  >({});
  const [saving, setSaving] = useState(false);

  const isEditingSelf =
    currentUserId !== undefined &&
    String(userData?.id) === String(currentUserId);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    const field = name as keyof UserFormData;
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({
      ...prev,
      [field]: validators[field]?.(value) || "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Partial<Record<keyof UserFormData, string>> = {};
    (Object.keys(validators) as Array<keyof UserFormData>).forEach((k) => {
      const msg = validators[k]?.(String(formData[k] || ""));
      if (msg) newErrors[k] = msg;
    });

    if (Object.keys(newErrors).length > 0) return setErrors(newErrors);

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/users/${userData?.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Lỗi cập nhật từ phía server");
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      alert(`Cập nhật thất bại:\n${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = (field: keyof UserFormData) =>
    `w-full border rounded px-3 py-2 focus:outline-none ${
      errors[field]
        ? "border-red-500 focus:border-red-500"
        : "border-gray-300 focus:border-blue-500"
    }`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white w-[600px] rounded-xl shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-red-500 font-bold text-xl"
        >
          &times;
        </button>
        <h3 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">
          Chỉnh sửa thông tin
        </h3>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className={inputCls("fullName")}
                />
                {errors.fullName && (
                  <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={inputCls("phone")}
                />
                {errors.phone && (
                  <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                )}
              </div>
              {!isEditingSelf && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phân quyền
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:border-blue-500"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={inputCls("email")}
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;