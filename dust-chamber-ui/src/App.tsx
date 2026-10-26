import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import HistoryPage from './components/History/HistoryPage';
import UserManagementPage from './components/UserManager/UserManagementPage';
import LoginPage from './components/Auth/LoginPage';
import './index.css';

const getUserRole = () => {
    const token = sessionStorage.getItem('accessToken');
    if (!token) return null;

    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const payload = JSON.parse(jsonPayload);

        if (payload.role) {
            return payload.role.charAt(0).toUpperCase() + payload.role.slice(1).toLowerCase();
        }
        return null;
    } catch (error) {
        console.error(error);
        return null;
    }
};

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
    const role = getUserRole();

    if (!role) {
        return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(role)) {
        return <Navigate to={role === 'Admin' ? '/users' : '/history'} replace />;
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
    const role = getUserRole();

    if (location.pathname === '/login') {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {role === 'Admin' && <Navbar />}
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
                    <Route
                        path="/users"
                        element={
                            <ProtectedRoute allowedRoles={['Admin']}>
                                <UserManagementPage />
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
                        path="/login"
                        element={
                                <LoginPage />
                        }
                    />
                    <Route
                        path="*"
                        element={
                            getUserRole() === 'Admin'
                                ? <Navigate to="/users" replace />
                                : <Navigate to="/history" replace />
                        }
                    />
                </Routes>
            </MainLayout>
        </BrowserRouter>
    );
}

export default App;