// ========================
// Import Libraries
// ========================
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import API_BASE_URL from "../config/apiConfig";
import "./Register.css";
import { getGoogleClientId, isGoogleConfigured } from "../config/googleConfig";

/**
 * Register Component - หน้าลงทะเบียนและเข้าสู่ระบบ
 * รองรับการลงทะเบียนด้วย Email/Password และ Google OAuth
 * มีระบบ OTP verification ผ่านอีเมล
 */
function Register() {
  // ========================
  // State Management
  // ========================
  // ข้อมูลฟอร์ม
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
    otp: "",
  });

  // สถานะการแสดงผลและข้อความ
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // UI State
  const [showPassword, setShowPassword] = useState(false); // แสดง/ซ่อนรหัสผ่าน
  const [passwordStrength, setPasswordStrength] = useState(0); // ความแข็งแรงของรหัสผ่าน (0-5)
  const [activeTab, setActiveTab] = useState("register"); // แท็บที่เลือก: register หรือ login

  // OTP State
  const [showOtpInput, setShowOtpInput] = useState(false); // แสดงช่องกรอก OTP
  const [otpCooldown, setOtpCooldown] = useState(0); // เวลานับถอยหลังก่อนส่ง OTP ใหม่

  const navigate = useNavigate();
  const shopId = new URLSearchParams(window.location.search).get("shopId") || localStorage.getItem("shopId") || "";

  // ========================
  // useEffect Hooks
  // ========================
  /**
   * โหลด Google Sign-In script เมื่อ component mount
   * เพื่อเตรียมพร้อมสำหรับการเข้าสู่ระบบด้วย Google
   */
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * นับเวลาถอยหลังสำหรับการส่ง OTP ใหม่
   * ป้องกันการส่ง OTP บ่อยเกินไป
   */
  useEffect(() => {
    let interval;
    if (otpCooldown > 0) {
      interval = setInterval(() => {
        setOtpCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpCooldown]);

  // ========================
  // Utility Functions
  // ========================
  /**
   * ตรวจสอบความแข็งแรงของรหัสผ่าน
   * @param {string} password - รหัสผ่านที่ต้องการตรวจสอบ
   * @returns {number} คะแนนความแข็งแรง 0-5
   */
  const checkPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return Math.min(strength, 5);
  };

  /**
   * จัดการการเปลี่ยนแปลงค่าใน input fields
   * อัพเดท formData และตรวจสอบความแข็งแรงของรหัสผ่าน
   */
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

  // ========================
  // Validation Functions
  // ========================
  /**
   * ตรวจสอบรูปแบบอีเมล
   * @param {string} email - อีเมลที่ต้องการตรวจสอบ
   * @returns {boolean} true ถ้าอีเมลถูกต้อง
   */
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  /**
   * ตรวจสอบความยาวของรหัสผ่าน
   * @param {string} password - รหัสผ่านที่ต้องการตรวจสอบ
   * @returns {boolean} true ถ้ารหัสผ่านมีอย่างน้อย 8 ตัวอักษร
   */
  const validatePassword = (password) => {
    return password.length >= 8;
  };

  // ========================
  // Form Handlers
  // ========================
  /**
   * ส่งรหัส OTP ไปยังอีเมลผู้ใช้
   * ใช้สำหรับยืนยันอีเมลก่อนลงทะเบียน
   */
  const handleSendOtp = async () => {
    if (!validateEmail(formData.email)) {
      setErrorMessage("กรุณากรอกอีเมลให้ถูกต้อง");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/auth/send-email-otp?shopId=${shopId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-shop-id": shopId },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "ส่ง OTP ไม่สำเร็จ");
      }

      setShowOtpInput(true);
      setOtpCooldown(60); // 60 seconds cooldown
      setSuccessMessage("ส่งรหัส OTP ไปยังอีเมลแล้ว กรุณาตรวจสอบ");
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * จัดการการลงทะเบียนผู้ใช้ใหม่
   * ตรวจสอบข้อมูลและส่งไปยัง API
   * เก็บ token และข้อมูลผู้ใช้ใน localStorage หลังลงทะเบียนสำเร็จ
   */
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

    if (!formData.otp) {
      setErrorMessage("กรุณากรอกรหัส OTP ที่ได้รับทางอีเมล");
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
      const response = await fetch(`${API_BASE_URL}/api/auth/register?shopId=${shopId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-shop-id": shopId },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          otp: formData.otp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "การลงทะเบียนล้มเหลว");
      }

      // บันทึก token และ user data
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // บันทึก username, email, birthday แยกตัวแปร สำหรับหน้า Profile
      localStorage.setItem("username", data.user.username);
      localStorage.setItem("email", data.user.email);
      localStorage.setItem("birthday", data.user.birthday || "");
      localStorage.setItem("avatar", data.user.avatar || "");

      // บันทึก shopId: URL param (QR code ปัจจุบัน) มาก่อนเสมอ
      // ไม่ใช้จาก DB เพราะ User อาจไปหลายร้าน
      const finalShopId = shopId || data.user.shopId || localStorage.getItem("shopId") || "";
      if (finalShopId) localStorage.setItem("shopId", finalShopId);

      setSuccessMessage("✓ ลงทะเบียนสำเร็จ กำลังนำเข้าสู่ระบบ...");
      setTimeout(() => navigate(`/home${finalShopId ? `?shopId=${finalShopId}` : ''}`), 1500);
    } catch (error) {
      setErrorMessage(error.message || "เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * จัดการการเข้าสู่ระบบ
   * ตรวจสอบอีเมลและรหัสผ่าน
   * เก็บ token และข้อมูลผู้ใช้ใน localStorage หลังเข้าสู่ระบบสำเร็จ
   */
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
      const response = await fetch(`${API_BASE_URL}/api/auth/login?shopId=${shopId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-shop-id": shopId },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "เข้าสู่ระบบล้มเหลว");
      }

      // บันทึก token และ user data
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // บันทึก username, email, birthday แยกตัวแปร สำหรับหน้า Profile
      localStorage.setItem("username", data.user.username);
      localStorage.setItem("email", data.user.email);
      localStorage.setItem("birthday", data.user.birthday || "");
      localStorage.setItem("avatar", data.user.avatar || "");

      // บันทึก shopId: URL param (QR code ปัจจุบัน) มาก่อนเสมอ
      // ไม่ใช้จาก DB เพราะ User อาจไปหลายร้าน
      const finalShopId = shopId || data.user.shopId || localStorage.getItem("shopId") || "";
      if (finalShopId) localStorage.setItem("shopId", finalShopId);

      setSuccessMessage("✓ เข้าสู่ระบบสำเร็จ...");
      setTimeout(() => navigate(`/home${finalShopId ? `?shopId=${finalShopId}` : ''}`), 1500);
    } catch (error) {
      setErrorMessage(error.message || "เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * จัดการ response จาก Google OAuth
   * Decode JWT token จาก Google และส่งข้อมูลไปยัง backend
   * @param {object} response - response object จาก Google
   */
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
      const response2 = await fetch(`${API_BASE_URL}/api/auth/google?shopId=${shopId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-shop-id": shopId },
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

      // บันทึก token และ user data
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // บันทึก username, email, birthday แยกตัวแปร สำหรับหน้า Profile
      localStorage.setItem("username", data.user.username);
      localStorage.setItem("email", data.user.email);
      localStorage.setItem("birthday", data.user.birthday || "");
      localStorage.setItem("avatar", data.user.avatar || "");

      // บันทึก shopId: URL param (QR code ปัจจุบัน) มาก่อนเสมอ
      // ไม่ใช้จาก DB เพราะ User อาจไปหลายร้าน
      const finalShopId = shopId || data.user.shopId || localStorage.getItem("shopId") || "";
      if (finalShopId) localStorage.setItem("shopId", finalShopId);

      setSuccessMessage("✓ เข้าสู่ระบบด้วย Google สำเร็จ...");
      setTimeout(() => navigate(`/home${finalShopId ? `?shopId=${finalShopId}` : ''}`), 1500);
    } catch (error) {
      setErrorMessage(error.message || "เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * เตรียม Google Sign-In button
   * ตรวจสอบว่า Google OAuth ถูก configure หรือยัง
   */
  // eslint-disable-next-line no-unused-vars
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

  /**
   * Render Google Sign-In button เมื่อ component mount หรือเปลี่ยน tab
   * รอให้ Google script โหลดเสร็จก่อนแสดงปุ่ม
   */
  useEffect(() => {
    if (!isGoogleConfigured()) return;

    // Wait for Google script to load
    const waitForGoogle = setInterval(() => {
      if (window.google) {
        clearInterval(waitForGoogle);

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
      }
    }, 100);

    return () => clearInterval(waitForGoogle);
  }, [activeTab]);

  // ========================
  // Render Component
  // ========================
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
              <button
                type="button"
                className="send-otp-btn"
                onClick={handleSendOtp}
                disabled={isLoading || otpCooldown > 0 || !formData.email}
              >
                {otpCooldown > 0 ? `ส่งใหม่ ${otpCooldown}s` : "ยืนยันอีเมล"}
              </button>
            </div>

            {showOtpInput && (
              <div className="form-group">
                <label htmlFor="otp">รหัส OTP</label>
                <div className="input-wrapper">
                  <span className="input-icon"></span>
                  <input
                    type="text"
                    id="otp"
                    name="otp"
                    placeholder="กรอกรหัส 6 หลักที่ได้รับทางอีเมล"
                    value={formData.otp}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    maxLength={6}
                  />
                </div>
              </div>
            )}

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

            <button type="button" className="forgot-password" onClick={() => { }}>
              ลืมรหัสผ่าน?
            </button>

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
