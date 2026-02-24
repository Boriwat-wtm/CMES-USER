// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://cmes-user.onrender.com';

export const ADMIN_API_URL = process.env.REACT_APP_ADMIN_API_URL || 'https://cmes-admin-server.onrender.com';
export const REALTIME_URL = process.env.REACT_APP_REALTIME_URL || 'https://cmes-admin-realtime.onrender.com';
export default API_BASE_URL;
