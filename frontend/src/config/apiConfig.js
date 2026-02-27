// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_URL || 'https://cmes-user.onrender.com';

// Admin API (real-time + socket)
export const ADMIN_API_URL = process.env.REACT_APP_ADMIN_API_URL || 'https://cmes-admin-server.onrender.com';
// REALTIME_URL ตอนนี้ชี้ไปที่ Admin server เดียวกัน (ไม่มี realtime-server แยก)
export const REALTIME_URL = process.env.REACT_APP_REALTIME_URL || ADMIN_API_URL;
export default API_BASE_URL;
