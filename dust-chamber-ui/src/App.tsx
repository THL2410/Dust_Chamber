import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import HistoryPage from './components/History/HistoryPage';
import UserManagementPage from './components/UserManager/UserManagementPage.tsx';
import './index.css';

// Component Menu điều hướng (Navbar)
const Navbar = () => {
    const location = useLocation(); // Lấy đường dẫn hiện tại để bôi màu menu đang chọn

    // Hàm phụ trợ để đổi màu nút menu
    const getNavClass = (path: string) => {
        return location.pathname === path
            ? "bg-blue-600 text-white px-4 py-2 rounded-md font-medium"
            : "text-gray-300 hover:bg-blue-500 hover:text-white px-4 py-2 rounded-md font-medium transition";
    };

    return (
        <nav className="bg-gray-800 p-4 shadow-md">

            <div className="max-w-7xl mx-auto flex gap-4">
                {/* Các liên kết điều hướng */}
                <Link to="/history" className={getNavClass('/history')}>Lịch sử</Link>
                <Link to="/users" className={getNavClass('/users')}>Quản lý User</Link>
                <Link to="/login" className={getNavClass('/login')}>Đăng xuất</Link>
            </div>
        </nav>
    );
};

function App() {
    return (
        <BrowserRouter>
            <div className="min-h-screen bg-gray-100">
                {/* Thanh Navbar sẽ luôn hiển thị ở mọi trang */}
                <Navbar />

                {/* Nội dung bên dưới Navbar sẽ thay đổi tùy theo URL */}
                <div className="p-4">
                    <Routes>
                        <Route path="/history" element={<HistoryPage />} />
                        <Route path="/users" element={<UserManagementPage />} />
                    </Routes>
                </div>
            </div>
        </BrowserRouter>
    );
}

export default App;