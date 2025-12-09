import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Register.css";
import { getGoogleClientId, isGoogleConfigured } from "./config/googleConfig";

function Register() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [activeTab, setActiveTab] = useState("register"); // register or login
  const navigate = useNavigate();

  // Load Google Sign-In script
  useEffect(() => {
    const clientId = getGoogleClientId();
    
    if (!isGoogleConfigured()) {
      console.warn("Google OAuth not configured");
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleResponse,
        });
      }
    };
    document.body.appendChild(script);
  }, []);

  // ตรวจสอบความแรงของ password
  const checkPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return Math.min(strength, 5);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Update password strength
    if (name === "password") {
      setPasswordStrength(checkPasswordStrength(value));
    }

    setErrorMessage("");
    setSuccessMessage("");
  };

  // Validation
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePassword = (password) => {
    return password.length >= 8;
  };

  // Handle Register
  const handleRegister = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.username.trim()) {
      setErrorMessage("กรุณากรอกชื่อผู้ใช้");
      return;
    }

    if (!validateEmail(formData.email)) {
      setErrorMessage("กรุณากรอกอีเมลให้ถูกต้อง");
      return;
    }

    if (!validatePassword(formData.password)) {
      setErrorMessage("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("รหัสผ่านไม่ตรงกัน");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("http://localhost:4000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "การลงทะเบียนล้มเหลว");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setSuccessMessage("✓ ลงทะเบียนสำเร็จ กำลังนำเข้าสู่ระบบ...");
      setTimeout(() => navigate("/home"), 1500);
    } catch (error) {
      setErrorMessage(error.message || "เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();

    if (!validateEmail(formData.email)) {
      setErrorMessage("กรุณากรอกอีเมลให้ถูกต้อง");
      return;
    }

    if (!formData.password) {
      setErrorMessage("กรุณากรอกรหัสผ่าน");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("http://localhost:4000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "เข้าสู่ระบบล้มเหลว");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setSuccessMessage("✓ เข้าสู่ระบบสำเร็จ...");
      setTimeout(() => navigate("/home"), 1500);
    } catch (error) {
      setErrorMessage(error.message || "เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google Login
  const handleGoogleResponse = async (response) => {
    try {
      setIsLoading(true);
      
      // Decode the JWT token from Google
      const token = response.credential;
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      const googleData = JSON.parse(jsonPayload);

      // Send to backend
      const response2 = await fetch("http://localhost:4000/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          googleId: googleData.sub,
          email: googleData.email,
          name: googleData.name,
          picture: googleData.picture,
        }),
      });

      const data = await response2.json();

      if (!response2.ok) {
        throw new Error(data.message || "Google login failed");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setSuccessMessage("✓ เข้าสู่ระบบด้วย Google สำเร็จ...");
      setTimeout(() => navigate("/home"), 1500);
    } catch (error) {
      setErrorMessage(error.message || "เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!isGoogleConfigured()) {
      setErrorMessage(
        "ยังไม่ได้ตั้งค่า Google OAuth\n" +
        "ดูที่ GOOGLE_OAUTH_SETUP.md เพื่อข้อมูลเพิ่มเติม"
      );
      return;
    }

    try {
      // Show Google Sign-In button
      if (window.google) {
        window.google.accounts.id.renderButton(
          document.getElementById("google-signin-btn"),
          { theme: "outline", size: "large" }
        );
      }
    } catch (error) {
      setErrorMessage("ไม่สามารถเชื่อมต่อ Google ได้");
    }
  };

  // Render Google button when tab changes
  useEffect(() => {
    if (!isGoogleConfigured() || !window.google) return;

    setTimeout(() => {
      try {
        const googleBtnElement = document.getElementById("google-signin-btn");
        if (googleBtnElement) {
          window.google.accounts.id.renderButton(
            googleBtnElement,
            { 
              theme: "outline", 
              size: "large",
              text: activeTab === "register" ? "signup_with" : "signin_with"
            }
          );
        }
      } catch (e) {
        console.log("Google button render error:", e);
      }
    }, 100);
  }, [activeTab]);

  return (
    <div className="register-container">
      <div className="auth-wrapper">
        {/* Header */}
        <div className="auth-header">
          <div className="logo-section">
            <div className="logo"></div>
            <h1>CMES</h1>
          </div>
          <p className="tagline">ลงทะเบียนหรือเข้าสู่ระบบเพื่อเริ่มต้น</p>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === "register" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("register");
              setErrorMessage("");
              setSuccessMessage("");
            }}
          >
            ลงทะเบียน
          </button>
          <button
            className={`tab-btn ${activeTab === "login" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("login");
              setErrorMessage("");
              setSuccessMessage("");
            }}
          >
            เข้าสู่ระบบ
          </button>
        </div>

        {/* Register Form */}
        {activeTab === "register" && (
          <form className="auth-form" onSubmit={handleRegister}>
            <div className="form-group">
              <label htmlFor="username">ชื่อผู้ใช้</label>
              <div className="input-wrapper">
                <span className="input-icon"></span>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">อีเมล</label>
              <div className="input-wrapper">
                <span className="input-icon"></span>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">รหัสผ่าน</label>
              <div className="input-wrapper">
                <span className="input-icon"></span>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
              {formData.password && (
                <div className="password-strength">
                  <div className="strength-bar">
                    <div
                      className="strength-fill"
                      style={{
                        width: `${(passwordStrength / 5) * 100}%`,
                        backgroundColor: [
                          "#ff4444",
                          "#ff8844",
                          "#ffcc44",
                          "#88dd44",
                          "#44dd44",
                        ][passwordStrength - 1],
                      }}
                    />
                  </div>
                  <span className="strength-text">
                    {["อ่อน", "ปานกลาง", "ปานกลาง", "แรง", "แรงมาก"][
                      passwordStrength - 1
                    ] || ""}
                  </span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">ยืนยันรหัสผ่าน</label>
              <div className="input-wrapper">
                <span className="input-icon"></span>
                <input
                  type={showPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
            </div>

            {errorMessage && <p className="error-message">{errorMessage}</p>}
            {successMessage && <p className="success-message">{successMessage}</p>}

            <button
              type="submit"
              className="auth-button primary"
              disabled={isLoading}
            >
              {isLoading ? "กำลังประมวลผล..." : "ลงทะเบียน"}
            </button>
          </form>
        )}

        {/* Login Form */}
        {activeTab === "login" && (
          <form className="auth-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="login-email">อีเมล</label>
              <div className="input-wrapper">
                <span className="input-icon"></span>
                <input
                  type="email"
                  id="login-email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="login-password">รหัสผ่าน</label>
              <div className="input-wrapper">
                <span className="input-icon"></span>
                <input
                  type={showPassword ? "text" : "password"}
                  id="login-password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            <a href="#" className="forgot-password">
              ลืมรหัสผ่าน?
            </a>

            {errorMessage && <p className="error-message">{errorMessage}</p>}
            {successMessage && <p className="success-message">{successMessage}</p>}

            <button
              type="submit"
              className="auth-button primary"
              disabled={isLoading}
            >
              {isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>
          </form>
        )}

        {/* Divider */}
        <div className="divider">
          <span>หรือ</span>
        </div>

        {/* Social Login */}
        <div className="social-login">
          <div id="google-signin-btn" style={{ display: "flex", justifyContent: "center" }}></div>
        </div>

        {/* Footer */}
        <p className="auth-footer">
          {activeTab === "register"
            ? "มีบัญชีอยู่แล้ว? "
            : "ยังไม่มีบัญชี? "}
          <button
            type="button"
            className="switch-tab-btn"
            onClick={() =>
              setActiveTab(activeTab === "register" ? "login" : "register")
            }
          >
            {activeTab === "register" ? "เข้าสู่ระบบ" : "ลงทะเบียน"}
          </button>
        </p>

        <p className="terms-text">
          ด้วยการลงทะเบียน คุณยอมรับ{" "}
          <a href="/terms">เงื่อนไขการใช้งาน</a> และ{" "}
          <a href="/privacy">นโยบายความเป็นส่วนตัว</a>
        </p>
      </div>
    </div>
  );
}

export default Register;