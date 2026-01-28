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

// ===== Authentication Calls =====
export const registerUser = async (username, email, password) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Registration failed");
  }
  return data;
};

export const loginUser = async (email, password) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
  await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  removeToken();
  removeUser();
};

export const verifyToken = async (token) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/verify-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
  if (!token) {
    throw new Error("No token found");
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to get profile");
  }
  return data;
};

export const updateUserProfile = async (updates) => {
  const token = getToken();
  if (!token) {
    throw new Error("No token found");
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to update profile");
  }
  return data;
};

// ===== API Helper with Token =====
export const apiCall = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();
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
    removeToken();
    removeUser();
    return false;
  }
};

export const initializeAuth = async () => {
  try {
    const token = getToken();
    if (!token) {
      return null;
    }

    const data = await getUserProfile();
    if (data.success) {
      setUser(data.user);
      return data.user;
    }
  } catch (error) {
    console.error("Auth initialization failed:", error);
    removeToken();
    removeUser();
  }
  return null;
};
