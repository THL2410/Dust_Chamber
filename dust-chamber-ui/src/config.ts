/** Địa chỉ backend. Đặt VITE_API_URL trong .env (xem .env.example); mặc định cho dev local. */
export const API_URL: string = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001';
