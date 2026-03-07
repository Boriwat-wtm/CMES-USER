import API_BASE_URL from './config/apiConfig';


// ===== Token Management =====
export const getToken = () => {
  return localStorage.getItem("token");
};

export const setToken = (token) => {
  localStorage.setItem("token", token);
};

export const removeToken = () => {
  localStorage.removeItem("token");
};

// ===== Shop Management =====
export const getShopId = () => {
  return new URLSearchParams(window.location.search).get("shopId") || localStorage.getItem("shopId") || "";
};

// ===== User Management =====
export const getUser = () => {
  const userJson = localStorage.getItem("user");
  return userJson ? JSON.parse(userJson) : null;
};

export const setUser = (user) => {
  localStorage.setItem("user", JSON.stringify(user));
};

export const removeUser = () => {
  localStorage.removeItem("user");
};

// ===== Handle 401 Unauthorized =====
export const handleUnauthorized = () => {
  console.warn("[User] 401 Unauthorized — session expired, redirecting to login");
  removeToken();
  removeUser();
  const shopId = getShopId();
  window.location.href = shopId ? `/?shopId=${shopId}` : "/";
};

// ===== Authentication Calls =====
export const registerUser = async (username, email, password) => {
  const shopId = getShopId();
  const response = await fetch(`${API_BASE_URL}/api/auth/register?shopId=${shopId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-shop-id": shopId
    },
    body: JSON.stringify({ username, email, password }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Registration failed");
  }
  return data;
};

export const loginUser = async (email, password) => {
  const shopId = getShopId();
  const response = await fetch(`${API_BASE_URL}/api/auth/login?shopId=${shopId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-shop-id": shopId
    },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Login failed");
  }
  return data;
};

export const logoutUser = async () => {
  const token = getToken();
  const shopId = getShopId();
  await fetch(`${API_BASE_URL}/api/auth/logout?shopId=${shopId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "x-shop-id": shopId
    },
  });
  removeToken();
  removeUser();
};

export const verifyToken = async (token) => {
  const shopId = getShopId();
  const response = await fetch(`${API_BASE_URL}/api/auth/verify-token?shopId=${shopId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-shop-id": shopId
    },
    body: JSON.stringify({ token }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Token verification failed");
  }
  return data;
};

export const getUserProfile = async () => {
  const token = getToken();
  const shopId = getShopId();
  if (!token) {
    throw new Error("No token found");
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/profile?shopId=${shopId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "x-shop-id": shopId
    },
  });
  const data = await response.json();
  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Session expired");
  }
  if (!response.ok) {
    throw new Error(data.message || "Failed to get profile");
  }
  return data;
};

export const updateUserProfile = async (updates) => {
  const token = getToken();
  const shopId = getShopId();
  if (!token) {
    throw new Error("No token found");
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/profile?shopId=${shopId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "x-shop-id": shopId
    },
    body: JSON.stringify(updates),
  });
  const data = await response.json();
  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Session expired");
  }
  if (!response.ok) {
    throw new Error(data.message || "Failed to update profile");
  }
  return data;
};

// ===== API Helper with Token =====
export const apiCall = async (endpoint, options = {}) => {
  const token = getToken();
  const shopId = getShopId();
  const headers = {
    "Content-Type": "application/json",
    "x-shop-id": shopId,
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const urlSeparator = endpoint.includes('?') ? '&' : '?';
  const response = await fetch(`${API_BASE_URL}${endpoint}${urlSeparator}shopId=${shopId}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Session expired");
  }
  if (!response.ok) {
    throw new Error(data.message || "API call failed");
  }
  return data;
};

// ===== Check Authentication =====
export const isAuthenticated = () => {
  return !!getToken();
};

export const checkAuthStatus = async () => {
  try {
    const token = getToken();
    if (!token) return false;

    const data = await verifyToken(token);
    return data.success;
  } catch (error) {
    console.error("Auth check failed:", error);
    // ลบทิ้งเฉพาะกรณีที่เซิร์ฟเวอร์ตอบกลับว่า Token ผิดหรือหมดอายุจริงๆ (401)
    // ถ้ายิง API ไม่ติด (Network error) จะไม่ลบเพื่อกันผู้ใช้หลุด
    if (error.message && (error.message.includes("Invalid") || error.message.includes("expired") || error.message.includes("No token"))) {
      removeToken();
      removeUser();
    }
    return false;
  }
};

export const initializeAuth = async () => {
  try {
    const token = getToken();
    if (!token) {
      return null;
    }

    // ตรวจสอบ token กับ backend โดยตรง (ไม่ผ่าน getUserProfile เพื่อควบคุม error ได้ดีกว่า)
    const shopId = getShopId();
    const response = await fetch(`${API_BASE_URL}/api/auth/profile?shopId=${shopId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-shop-id": shopId,
      },
    });

    // ❌ ลบ token เฉพาะตอน 401 (Unauthorized) เท่านั้น
    // ไม่ลบถ้าเป็น network error, server timeout, หรือ error อื่นๆ
    if (response.status === 401) {
      console.warn("[Auth] Token invalid (401), removing token");
      removeToken();
      removeUser();
      return null;
    }

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.user) {
        setUser(data.user);
        return data.user;
      }
    }

    // กรณี server error (500, 503 ฯลฯ) หรือ network หลุด → เก็บ token ไว้ก่อน
    // ผู้ใช้จะยังคงสถานะ login (ตรวจจาก localStorage token ที่ยังอยู่)
    console.warn("[Auth] initializeAuth: non-401 error, keeping token. Status:", response.status);
    return null;
  } catch (error) {
    // Network error (fetch ล้มเหลว เช่น backend ปิดอยู่) → ไม่ลบ token
    console.warn("[Auth] initializeAuth network error, keeping token:", error.message);
    return null;
  }
};

