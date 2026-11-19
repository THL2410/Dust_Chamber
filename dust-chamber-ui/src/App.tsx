import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import HistoryPage from './components/History/HistoryPage';
import LoginPage from './components/Auth/LoginPage';
import UserManagementPage from './components/UserManager/UserManagementPage.tsx';
import CalculationPage from './components/Calculation/CalculationPage';
import './index.css';

interface JwtPayload {
    role?: string;
    exp?: number;
}

const parseJwt = (): JwtPayload | null => {
    const token = sessionStorage.getItem('accessToken');
    if (!token) return null;

    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            window.atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error(error);
        return null;
    }
};

const getUserRole = () => {
    const payload = parseJwt();
    if (!payload) return null;

    // Không tự động trả về null khi hết hạn ở đây để giữ nguyên màn hình chờ người dùng bấm OK
    if (payload.role) {
        return payload.role.charAt(0).toUpperCase() + payload.role.slice(1).toLowerCase();
    }
    return null;
};

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) => {
    const role = getUserRole();

    if (!role) {
        return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(role)) {
        return <Navigate to={role === 'Admin' ? '/users' : '/calculate'} replace />;
    }

    return <>{children}</>;
};

const Navbar = () => {
    const location = useLocation();
    const role = getUserRole();

    const getNavClass = (path: string) => {
        return location.pathname === path
            ? "bg-blue-600 text-white px-4 py-2 rounded-md font-medium"
            : "text-gray-300 hover:bg-blue-500 hover:text-white px-4 py-2 rounded-md font-medium transition";
    };

    const handleLogout = (e: React.MouseEvent) => {
        e.preventDefault();
        sessionStorage.removeItem('accessToken');
        window.location.replace('/login');
    };

    return (
        <nav className="bg-gray-800 p-4 shadow-md">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <div className="flex gap-4">
                    <Link to="/calculate" className={getNavClass('/calculate')}>Tính toán</Link>
                    <Link to="/history" className={getNavClass('/history')}>Lịch sử</Link>

                    {role === 'Admin' && (
                        <Link to="/users" className={getNavClass('/users')}>Quản lý User</Link>
                    )}
                </div>

                <button
                    onClick={handleLogout}
                    className="text-red-400 hover:text-red-300 font-medium px-4 py-2 cursor-pointer bg-transparent border-none"
                >
                    Đăng xuất
                </button>
            </div>
        </nav>
    );
};

const MainLayout = ({ children }: { children: React.ReactNode }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [showExpiredModal, setShowExpiredModal] = useState(false);

    useEffect(() => {
        if (location.pathname === '/login') return;

        const token = sessionStorage.getItem('accessToken');
        if (!token) return;

        const payload = parseJwt();
        if (!payload?.exp) return;

        const remainingTime = Math.max(0, payload.exp * 1000 - Date.now());

        const timer = setTimeout(() => {
            setShowExpiredModal(true);
        }, remainingTime);

        return () => clearTimeout(timer);
    }, [location.pathname]);

    const handleConfirmLogout = () => {
        sessionStorage.removeItem('accessToken');
        setShowExpiredModal(false);
        navigate('/login', { replace: true });
    };

    const expiredModal = showExpiredModal && (
        <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
        >
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 text-center space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                </div>

                <div>
                    <h3 className="text-lg font-bold text-gray-900">Hết phiên làm việc</h3>
                    <p className="mt-1.5 text-sm text-gray-600">
                        Đã hết phiên làm việc, vui lòng đăng nhập lại.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleConfirmLogout}
                    className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition cursor-pointer"
                >
                    OK
                </button>
            </div>
        </div>
    );

    if (location.pathname === '/login') {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {expiredModal}
            <Navbar />
            <div className="p-4">
                {children}
            </div>
        </div>
    );
};

function App() {
    return (
        <BrowserRouter>
            <MainLayout>
                <Routes>
                    <Route path="/" element={<Navigate to="/calculate" replace />} />
                    <Route path="/login" element={<LoginPage />} />

                    <Route
                        path="/calculate"
                        element={
                            <ProtectedRoute allowedRoles={['Admin', 'User']}>
                                <CalculationPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/history"
                        element={
                            <ProtectedRoute allowedRoles={['Admin', 'User']}>
                                <HistoryPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/users"
                        element={
                            <ProtectedRoute allowedRoles={['Admin']}>
                                <UserManagementPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="*"
                        element={
                            getUserRole() === 'Admin'
                                ? <Navigate to="/users" replace />
                                : <Navigate to="/calculate" replace />
                        }
                    />
                </Routes>
            </MainLayout>
        </BrowserRouter>
    );
}

export default App;