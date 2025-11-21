import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Register.css";

function Register() {
  const [phone, setPhone] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();

  // 1. จัดการการเปลี่ยนแปลงของเบอร์โทรศัพท์ (อนุญาตให้เป็นตัวเลข 10 หลักเท่านั้น)
  const handlePhoneChange = (e) => {
    const value = e.target.value;
    // อนุญาตให้เป็นค่าว่าง หรือตัวเลข 0-10 หลักเท่านั้น
    if (value === "" || /^\d{0,10}$/.test(value)) {
      setPhone(value);
      setErrorMessage("");
      setSuccessMessage("");
    }
  };

  // 2. จัดการการลงทะเบียน (เมื่อกดปุ่ม)
  const handleRegister = async () => {
    // ตรวจสอบความถูกต้องของเบอร์โทรศัพท์
    if (!phone || phone.length !== 10) {
      setErrorMessage("กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง (10 หลัก)");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage("");
      setSuccessMessage("");
      
      // 3. ตรวจสอบว่าเบอร์โทรนี้เคยลงทะเบียนแล้วหรือไม่
      console.log("[Register] Checking if phone exists:", phone);
      const checkResponse = await fetch(`http://localhost:4000/api/check-phone?phone=${phone}`);
      
      if (!checkResponse.ok) {
        throw new Error(`API error: ${checkResponse.status} ${checkResponse.statusText}`);
      }
      
      const checkData = await checkResponse.json();
      console.log("[Register] Check phone response:", checkData);
      
      if (!checkData.success) {
        throw new Error(checkData.message || "Failed to check phone");
      }

      let userData = null;
      
      if (checkData.exists) {
        // ถ้าเบอร์นี้เคยลงทะเบียนแล้ว ใช้ข้อมูลเก่า
        console.log("[Register] Phone already registered, using old data:", checkData.user);
        userData = checkData.user;
        setSuccessMessage("✓ พบข้อมูลเก่า กำลังนำเข้าสู่ระบบ...");
      } else {
        // ถ้าเบอร์นี้ยังไม่เคยลงทะเบียน สร้างข้อมูลใหม่
        console.log("[Register] New phone, creating new user data");
        userData = {
          phone,
          username: "",
          email: "",
          avatar: null,
          birthday: "",
          lastBirthdayUpdate: new Date().toISOString(),
        };
        setSuccessMessage("✓ บันทึกเบอร์โทรสำเร็จ กำลังดำเนินการต่อ...");
      }
      
      // 4. บันทึกเบอร์โทรศัพท์ลงใน Local Storage
      localStorage.setItem('userPhone', phone);
      console.log("[Register] Phone saved to localStorage");
      
      // 5. สร้าง token และบันทึกลง localStorage
      // ใช้ btoa() สำหรับ Base64 encoding ใน Browser
      const token = btoa(phone);
      localStorage.setItem('token', token);
      console.log("[Register] Token created and saved:", token);
      
      // 6. บันทึกข้อมูลผู้ใช้ลง localStorage (ถ้าเป็นข้อมูลเก่า)
      if (checkData.exists && userData) {
        localStorage.setItem("username", userData.username || "");
        localStorage.setItem("email", userData.email || "");
        localStorage.setItem("birthday", userData.birthday || "");
        if (userData.avatar) {
          localStorage.setItem("avatar", userData.avatar);
        }
        console.log("[Register] Loaded old user data to localStorage");
      }
      
      console.log("[Register] All data saved, navigating to home");
      
      // 7. นำทางไปยังหน้า /home หลังจาก 1 วินาที
      setTimeout(() => {
        navigate('/home');
      }, 1000);
      
    } catch (error) {
      console.error("[Register] Error during registration:", error);
      setErrorMessage(error.message || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      setSuccessMessage("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-form">
        <h2>ลงทะเบียน</h2>
        <p className="welcome-text">ยินดีต้อนรับสู่ระบบของเรา</p>
        
        <div className="form-group">
          <label htmlFor="phone">เบอร์โทรศัพท์</label>
          <div className="phone-input-container">
            <span className="country-code">+66</span>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="เบอร์โทรศัพท์ 10 หลัก"
              maxLength="10"
            />
          </div>
          {/* แสดงข้อความ Error หากมี */}
          {errorMessage && <p className="error-message">{errorMessage}</p>}
        </div>

        {/* ปุ่มที่ใช้เรียก handleRegister */}
        <button className="register-button" onClick={handleRegister} disabled={isLoading}>
          {isLoading ? "กำลังประมวลผล..." : "ดำเนินการต่อ"}
        </button>

        {/* แสดงข้อความ Success หากมี */}
        {successMessage && <p className="success-message">{successMessage}</p>}

        <p className="terms-text">
          การลงทะเบียนถือว่าคุณยอมรับ <a href="/terms">เงื่อนไขการใช้งาน</a>
        </p>
      </div>
    </div>
  );
}

export default Register;