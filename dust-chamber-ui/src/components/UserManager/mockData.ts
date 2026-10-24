// File: mockData.ts

export interface UserItem {
    id: number | string;
    fullName: string;
    address: string;
    phone: string;
    email: string;
    role: string;
    status: 'active' | 'locked';
}

export const mockUsersData: UserItem[] = [
    { id: 1, fullName: 'Nguyễn Văn An', address: '123 Lê Lợi, Quận 1, TP.HCM', phone: '0901234567', email: 'an.nguyen@gmail.com', role: 'Admin', status: 'active' },
    { id: 2, fullName: 'Trần Thị Bình', address: '456 Nguyễn Trãi, Quận 5, TP.HCM', phone: '0912345678', email: 'binh.tran@gmail.com', role: 'User', status: 'active' },
    { id: 3, fullName: 'Lê Hoàng Cường', address: '789 Võ Văn Tần, Quận 3, TP.HCM', phone: '0923456789', email: 'cuong.le@gmail.com', role: 'User', status: 'active' },
    { id: 4, fullName: 'Phạm Thị Dung', address: '12 Lý Tự Trọng, Quận 1, TP.HCM', phone: '0934567890', email: 'dung.pham@gmail.com', role: 'User', status: 'locked' },
    { id: 5, fullName: 'Vũ Đức Duy', address: '34 CMT8, Quận 10, TP.HCM', phone: '0945678901', email: 'duy.vu@gmail.com', role: 'User', status: 'active' },
    { id: 6, fullName: 'Đỗ Mai Phương', address: '56 Nguyễn Đình Chiểu, Quận 3, TP.HCM', phone: '0956789012', email: 'phuong.do@gmail.com', role: 'Admin', status: 'active' },
    { id: 7, fullName: 'Hoàng Thanh Tùng', address: '78 Phan Đăng Lưu, Phú Nhuận, TP.HCM', phone: '0967890123', email: 'tung.hoang@gmail.com', role: 'User', status: 'locked' },
    { id: 8, fullName: 'Bùi Thị Ngọc', address: '90 Điện Biên Phủ, Bình Thạnh, TP.HCM', phone: '0978901234', email: 'ngoc.bui@gmail.com', role: 'User', status: 'active' },
    { id: 9, fullName: 'Ngô Văn Nam', address: '112 Kha Vạn Cân, Thủ Đức, TP.HCM', phone: '0989012345', email: 'nam.ngo@gmail.com', role: 'User', status: 'active' },
    { id: 10, fullName: 'Hồ Bích Ngọc', address: '134 Mai Chí Thọ, Quận 2, TP.HCM', phone: '0990123456', email: 'ngoc.ho@gmail.com', role: 'User', status: 'active' }
];