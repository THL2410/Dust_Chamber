import React, { useState } from 'react';

export interface UserFormData {
    id?: number | string;
    fullName: string;
    phone: string;
    email: string;
    role: string;
}

interface EditUserModalProps {
    userData: UserFormData | null;
    onClose: () => void;
    onSuccess?: () => void;
}

const EditUserModal = ({ userData, onClose, onSuccess }: EditUserModalProps) => {
    const [formData, setFormData] = useState<UserFormData>({
        fullName: userData?.fullName || '',
        phone: userData?.phone || '',
        email: userData?.email || '',
        role: userData?.role || 'User',
    });

    const [saving, setSaving] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const token = sessionStorage.getItem('accessToken');

            const updateData = { ...formData };
            delete updateData.id;

            const response = await fetch(`http://localhost:3001/api/users/${userData?.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Lỗi cập nhật từ phía server');
            }

            setSaving(false);
            if (onSuccess) onSuccess();
            onClose();

        } catch (error) {
            console.error("Lỗi cập nhật:", error);
            alert(`Cập nhật thất bại:\n${(error as Error).message}`);
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white w-[600px] rounded-xl shadow-2xl p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-red-500 font-bold text-xl">
                    &times;
                </button>

                <h3 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">Chỉnh sửa thông tin</h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                                <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                                <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phân quyền</label>
                                <select name="role" value={formData.role} onChange={handleChange} className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500">
                                    <option value="admin">Admin</option>
                                    <option value="user">User</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end space-x-3 pt-4 border-t">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition">
                            Hủy bỏ
                        </button>
                        <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition">
                            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditUserModal;