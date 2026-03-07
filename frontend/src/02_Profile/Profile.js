// Profile.js — show next-change-date always (handles bad/missing lastBirthdayEdit)
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./Profile.css";
import API_BASE_URL from "../config/apiConfig";
import { handleUnauthorized } from "../authService";

// Custom Modal Component
const CustomModal = ({ isOpen, onClose, title, message, type = "info", onConfirm, showCancel = false, confirmText = "ตรวจสอบ", cancelText = "ยกเลิก" }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-header ${type}`}>
          <h3>{title}</h3>
        </div>
        <div className="modal-body">
          <p style={{ whiteSpace: 'pre-line' }}>{message}</p>
        </div>
        <div className="modal-footer">
          {showCancel && (
            <button className="modal-btn cancel-btn" onClick={onClose}>
              {cancelText}
            </button>
          )}
          <button
            className="modal-btn confirm-btn"
            onClick={() => {
              if (onConfirm) onConfirm();
              else onClose();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

function Profile() {
  const navigate = useNavigate();
  const shopId = new URLSearchParams(window.location.search).get("shopId") || localStorage.getItem("shopId") || "";

  // ========================
  // State Management
  // ========================
  // ข้อมูลผู้ใช้ปัจจุบัน (จาก backend หรือ localStorage)
  const [user, setUser] = useState({
    username: "",
    email: "",
    avatar: null,
    birthday: "", // รูปแบบ: "DD/MM/YYYY"
    lastBirthdayEdit: "" // เก็บเป็น ISO หรือรูปแบบอื่น หรือเปล่า
  });

  // ข้อมูลชั่วคราว (สำหรับแก้ไขก่อนบันทึก)
  const [tempUser, setTempUser] = useState({ ...user });
  const [previewUrl, setPreviewUrl] = useState(null); // URL แสดงตัวอย่างรูปโปรไฟล์
  const [birthdayError, setBirthdayError] = useState(""); // ข้อความ error สำหรับวันเกิด

  // วันที่สามารถแก้ไขได้อีกครั้ง (คำนวณจาก lastBirthdayEdit + 90 วัน)
  // nextEditFromLast: ถ้ามี lastBirthdayEdit => วันสุดท้าย + 3 เดือน (อาจเป็น null ถ้า parse ไม่ได้)
  // nextEditIfChangedNow: เสมอจะเป็นวันนี้ + 90 วัน (ใช้แสดงว่า "ถ้าเปลี่ยนตอนนี้ จะเปลี่ยนอีกครั้งวันที่...")
  const [nextEditFromLast, setNextEditFromLast] = useState(null);
  const [nextEditIfChangedNow, setNextEditIfChangedNow] = useState(null);
  const [canEditBirthday, setCanEditBirthday] = useState(true); // สามารถแก้ไขวันเกิดได้หรือไม่

  const [selectedFile, setSelectedFile] = useState(null); // เก็บ raw file สำหรับอัพโหลด

  // Modal states - สถานะสำหรับควบคุม modal
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
    onConfirm: null,
    showCancel: false,
    confirmText: "ตกลง",
    cancelText: "ยกเลิก"
  });

  /**
   * แสดง modal ด้วย config ที่กำหนด
   */
  const showModal = (config) => {
    setModalConfig({
      isOpen: true,
      title: config.title || "แจ้งเตือน",
      message: config.message || "",
      type: config.type || "info",
      onConfirm: config.onConfirm || null,
      showCancel: config.showCancel || false,
      confirmText: config.confirmText || "ตกลง",
      cancelText: config.cancelText || "ยกเลิก"
    });
  };

  /**
   * ปิด modal
   */
  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  // ========================
  // Utility Functions
  // ========================
  /**
   * Parse วันที่จากหลายรูปแบบ (ISO, dd/mm/yyyy, dd-mm-yyyy)
   * เพื่อรองรับข้อมูลเก่าที่อาจเก็บไว้ในหลายรูปแบบ
   */
  const parsePossibleDate = (s) => {
    if (!s) return null;
    // try native
    const d1 = new Date(s);
    if (!isNaN(d1.getTime())) return d1;
    // try dd/mm/yyyy or dd-mm-yyyy
    const m = s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
    if (m) {
      const day = parseInt(m[1], 10);
      const month = parseInt(m[2], 10) - 1;
      const year = parseInt(m[3], 10);
      const d2 = new Date(year, month, day);
      if (!isNaN(d2.getTime())) return d2;
    }
    return null;
  };

  // ========================
  // useEffect Hooks
  // ========================
  /**
   * โหลดข้อมูลผู้ใช้จาก backend หรือ localStorage
   */
  useEffect(() => {
    const loadUserData = async () => {
      const token = localStorage.getItem("token");

      if (token) {
        try {
          // ดึงข้อมูลจาก backend API
          const response = await fetch(`${API_BASE_URL}/api/auth/profile?shopId=${shopId}`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
              "x-shop-id": shopId
            }
          });

          if (response.status === 401) {
            handleUnauthorized();
            return;
          }

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
              const userData = {
                username: data.user.username || "User",
                email: data.user.email || "user@example.com",
                avatar: data.user.avatar || null,
                birthday: data.user.birthday || "",
                lastBirthdayEdit: data.user.lastBirthdayEdit || data.user.lastBirthdayUpdate || ""
              };
              setUser(userData);
              setTempUser(userData);

              // อัพเดท localStorage
              localStorage.setItem("username", userData.username);
              localStorage.setItem("email", userData.email);
              if (userData.avatar) localStorage.setItem("avatar", userData.avatar);
              if (userData.birthday) localStorage.setItem("birthday", userData.birthday);
              if (userData.lastBirthdayEdit) localStorage.setItem("lastBirthdayEdit", userData.lastBirthdayEdit);

              // เก็บ user object ทั้งหมดลง localStorage สำหรับใช้ใน Payment.js และ Gift.js
              localStorage.setItem("user", JSON.stringify({
                id: data.user._id || data.user.id,
                username: userData.username || "",
                email: userData.email || "",
                avatar: userData.avatar || null,
                birthday: userData.birthday || ""
              }));

              return;
            }
          }
        } catch (error) {
          console.error("[Profile] Error loading user data from backend:", error);
        }
      }

      // ถ้าไม่มี token หรือโหลดจาก backend ไม่สำเร็จ => ใช้ข้อมูลจาก localStorage
      const userData = {
        username: localStorage.getItem("username") || "User",
        email: localStorage.getItem("email") || "user@example.com",
        avatar: localStorage.getItem("avatar") || null,
        birthday: localStorage.getItem("birthday") || "",
        lastBirthdayEdit: localStorage.getItem("lastBirthdayEdit") || ""
      };
      setUser(userData);
      setTempUser(userData);
    };

    loadUserData();
  }, []);

  /**
   * คำนวณวันที่สามารถแก้ไขได้อีกครั้ง (ถ้าเปลี่ยนตอนนี้)
   * เสมอ = วันนี้ + 90 วัน
   */
  useEffect(() => {
    const now = new Date();
    const nxt = new Date(now);
    nxt.setDate(nxt.getDate() + 90);
    setNextEditIfChangedNow(nxt);
  }, []);

  /**
   * คำนวณวันที่สามารถแก้ไขได้อีกครั้ง (จากการแก้ไขครั้งล่าสุด)
   * ตรวจสอบว่าผ่าน 90 วันแล้วหรือยัง
   */
  useEffect(() => {
    const lastEdit = user.lastBirthdayEdit;
    if (!lastEdit) {
      // ไม่เคยแก้ไขวันเกิดมาก่อน สามารถแก้ไขได้
      setNextEditFromLast(null);
      setCanEditBirthday(true);
      return;
    }

    const parsed = parsePossibleDate(lastEdit);
    if (!parsed || isNaN(parsed.getTime())) {
      // ไม่สามารถ parse ได้ ให้แก้ไขได้
      setNextEditFromLast(null);
      setCanEditBirthday(true);
      return;
    }

    // คำนวณวันที่สามารถแก้ไขได้อีกครั้ง (90 วันจากการแก้ไขครั้งล่าสุด)
    const nextAllowed = new Date(parsed);
    nextAllowed.setDate(nextAllowed.getDate() + 90);
    setNextEditFromLast(nextAllowed);

    // เช็คว่าตอนนี้สามารถแก้ไขได้หรือยัง
    const now = new Date();
    setCanEditBirthday(now >= nextAllowed);
  }, [user.lastBirthdayEdit, user.birthday]);

  /**
   * ตรวจสอบว่ามีการเปลี่ยนแปลงข้อมูลหรือไม่
   * เปรียบเทียบ user vs tempUser และ previewUrl/selectedFile
   */
  const hasChanges = useMemo(() => {
    const usernameChanged = (user.username || "") !== (tempUser.username || "");
    const emailChanged = (user.email || "") !== (tempUser.email || "");
    const birthdayChanged = (user.birthday || "") !== (tempUser.birthday || "");

    // For avatar, check if tempUser.avatar or previewUrl is different from user.avatar
    const avatarChanged = (tempUser.avatar !== user.avatar) || (previewUrl && previewUrl !== user.avatar) || selectedFile;

    return usernameChanged || emailChanged || birthdayChanged || avatarChanged;
  }, [user, tempUser, previewUrl, selectedFile]);

  /**
   * ตรวจสอบความถูกต้องของวันเกิด (DD/MM/YYYY)
   * ตรวจสอบรูปแบบ, ปี, เดือน, วัน
   */
  useEffect(() => {
    const b = tempUser.birthday || "";
    if (!b) {
      setBirthdayError("");
      return;
    }
    const m = b.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) {
      setBirthdayError("รูปแบบต้องเป็น วว/ดด/ปปปป (เช่น 01/12/1990)");
      return;
    }
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const year = parseInt(m[3], 10);
    const nowYear = new Date().getFullYear();
    if (year < 1900 || year > nowYear) {
      setBirthdayError(`กรุณากรอกปีเป็น ค.ศ. ที่ถูกต้อง (1900 - ${nowYear})`);
      return;
    }
    if (month < 1 || month > 12) {
      setBirthdayError("เดือนต้องอยู่ระหว่าง 01 - 12");
      return;
    }
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) {
      setBirthdayError(`วันไม่ถูกต้องสำหรับเดือนที่เลือก (1 - ${daysInMonth})`);
      return;
    }
    setBirthdayError("");
  }, [tempUser.birthday]);

  // ========================
  // Form Handlers
  // ========================
  /**
   * จัดการการเปลี่ยนแปลงค่าใน input fields
   * ป้องกันการแก้ไขวันเกิดถ้ายังไม่สามารถแก้ไขได้
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // ป้องกันการแก้ไขวันเกิดถ้ายังไม่สามารถแก้ไขได้ (canEditBirthday === false)
    if (name === "birthday" && canEditBirthday === false) {
      return;
    }
    setTempUser(prev => ({ ...prev, [name]: value }));
  };

  /**
   * จัดการการเลือกไฟล์รูปภาพ
   * ตรวจสอบชนิดและขนาดไฟล์, แปลงเป็น Base64 สำหรับ preview
   */
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert("โปรดเลือกไฟล์รูปภาพเท่านั้น");
      return;
    }

    // ตรวจสอบขนาดไฟล์ (ไม่เกิน 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("ขนาดไฟล์ต้องไม่เกิน 5 MB");
      return;
    }

    // เก็บ raw file สำหรับอัพโหลดไป backend
    setSelectedFile(file);

    // แปลงไฟล์เป็น Base64 เพื่อแสดง preview ทันที
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target.result;
      setPreviewUrl(base64String);
      // ไม่ต้องเก็บ base64 ลง tempUser.avatar เพื่อหลีกเลี่ยงการบันทึกลง DB
      // setTempUser(prev => ({ ...prev, avatar: base64String })); 
    };
    reader.readAsDataURL(file);
  };

  /**
   * ลบรูปโปรไฟล์
   */
  const handleRemoveAvatar = () => {
    setTempUser(prev => ({ ...prev, avatar: null }));
    setPreviewUrl(null);
    setSelectedFile(null);
  };

  /**
   * จัดการการกดปุ่มบันทึก
   * ตรวจสอบความถูกต้องและแสดง confirmation modal
   */
  const handleSave = async () => {
    if (!hasChanges) return;
    if (birthdayError) return;

    // สร้างข้อความแสดงการเปลี่ยนแปลง
    const changes = [];
    if (user.username !== tempUser.username) changes.push(`• ชื่อผู้ใช้: ${tempUser.username}`);
    if (user.email !== tempUser.email) changes.push(`• อีเมล: ${tempUser.email}`);
    if (user.birthday !== tempUser.birthday) changes.push(`• วันเกิด: ${tempUser.birthday}`);
    if (selectedFile || (user.avatar !== tempUser.avatar)) changes.push(`• รูปโปรไฟล์: อัปเดตแล้ว`);

    const changeMessage = "ข้อมูลที่จะอัปเดต:\n" + changes.join("\n");

    // แสดง confirmation modal เพื่อยืนยันการบันทึก
    showModal({
      title: "ยืนยันการบันทึก",
      message: `คุณต้องการบันทึกการเปลี่ยนแปลงหรือไม่?\n\n${changeMessage}`,
      type: "confirm",
      showCancel: true,
      confirmText: "บันทึก",
      cancelText: "ยกเลิก",
      onConfirm: () => {
        closeModal();
        performSave();
      }
    });
  };

  /**
   * ฟังก์ชันหลักสำหรับบันทึกข้อมูลไป backend
   * จัดการอัพโหลดรูปภาพ (ถ้ามี), ตรวจสอบการแก้ไขวันเกิด
   * และอัพเดท localStorage + navigate ไปหน้าหลัก
   */
  const performSave = async () => {

    // ตรวจสอบว่าพยายามแก้ไขวันเกิดแต่ยังไม่สามารถแก้ไขได้
    const isBirthdayChanged = user.birthday !== tempUser.birthday;
    if (isBirthdayChanged && canEditBirthday === false) {
      // แสดงวันที่สามารถแก้ไขได้อีกครั้ง
      const showDate = nextEditFromLast || nextEditIfChangedNow;
      if (showDate) {
        showModal({
          title: "ไม่สามารถแก้ไขได้",
          message: `สามารถแก้ไขวันเกิดได้ทุก 90 วัน\nแก้ไขได้อีกครั้งในวันที่ ${showDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}`,
          type: "warning",
          confirmText: "รับทราบ"
        });
      } else {
        showModal({
          title: "ไม่สามารถแก้ไขได้",
          message: "ไม่สามารถแก้ไขวันเกิดได้ในขณะนี้",
          type: "warning",
          confirmText: "รับทราบ"
        });
      }
      return;
    }

    try {
      let finalAvatarUrl = tempUser.avatar;

      // ถ้าลบรูปภาพ (previewUrl และ tempUser.avatar เป็น null)
      if (!previewUrl && !tempUser.avatar) {
        finalAvatarUrl = null;
      }

      // ถ้ามีไฟล์ใหม่ => อัพโหลดไป backend ก่อน
      if (selectedFile) {
        const formData = new FormData();
        formData.append("avatar", selectedFile);

        const uploadRes = await fetch(`${API_BASE_URL}/api/upload-avatar?shopId=${shopId}`, {
          method: "POST",
          headers: { "x-shop-id": shopId },
          body: formData
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload avatar");
        }

        const uploadData = await uploadRes.json();
        if (uploadData.success && uploadData.imageUrl) {
          finalAvatarUrl = uploadData.imageUrl; // ใช้ URL ที่ backend คืนมา (relative path เช่น /uploads/avatars/...)
        }
      }

      // เตรียม object ข้อมูลผู้ใช้ใหมม่ และอัพเดท lastBirthdayEdit (ถ้ามีการแก้ไขวันเกิด)
      const newUser = {
        username: tempUser.username || "",
        email: tempUser.email || "",
        avatar: finalAvatarUrl,
        birthday: tempUser.birthday || "",
        lastBirthdayEdit: isBirthdayChanged ? new Date().toISOString() : user.lastBirthdayEdit
      };

      // ส่งข้อมูลไปยัง backend API เพื่อบันทึก
      const token = localStorage.getItem("token");
      if (token) {
        const response = await fetch(`${API_BASE_URL}/api/auth/profile?shopId=${shopId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "x-shop-id": shopId
          },
          body: JSON.stringify({
            username: newUser.username,
            email: newUser.email,
            avatar: newUser.avatar,
            birthday: newUser.birthday,
            lastBirthdayEdit: newUser.lastBirthdayEdit
          })
        });

        const data = await response.json();

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!response.ok) {
          // จัดการกรณีที่ backend ตอบกลับด้วย error
          showModal({
            title: "เกิดข้อผิดพลาด",
            message: data.message || "บันทึกข้อมูลไม่สำเร็จ",
            type: "error",
            confirmText: "รับทราบ"
          });

          // ย้อนค่ากลับเป็นค่าเดิม
          setTempUser({ ...user });
          setSelectedFile(null);
          setPreviewUrl(user.avatar);
          return;
        }

        if (data.success) {
          console.log("[Profile] Profile updated on backend");

          // อัปเดตข้อมูลจาก response ของ backend
          const updatedUserData = {
            username: data.user.username || newUser.username,
            email: data.user.email || newUser.email,
            avatar: data.user.avatar || newUser.avatar,
            birthday: data.user.birthday || newUser.birthday,
            lastBirthdayEdit: data.user.lastBirthdayEdit || data.user.lastBirthdayUpdate || newUser.lastBirthdayEdit
          };

          // อัปเดต state
          setUser(updatedUserData);
          setTempUser(updatedUserData);

          // อัพเดท localStorage เพื่อเก็บข้อมูลลงถาวร
          localStorage.setItem("username", updatedUserData.username);
          localStorage.setItem("email", updatedUserData.email);
          localStorage.setItem("birthday", updatedUserData.birthday || "");
          if (updatedUserData.avatar) {
            localStorage.setItem("avatar", updatedUserData.avatar);
          } else {
            localStorage.removeItem("avatar");
          }
          if (updatedUserData.lastBirthdayEdit) {
            localStorage.setItem("lastBirthdayEdit", updatedUserData.lastBirthdayEdit);
          }

          // เก็บ user object ทั้งหมดลง localStorage สำหรับใช้ใน Payment.js และ Gift.js
          localStorage.setItem("user", JSON.stringify({
            id: updatedUserData._id || updatedUserData.id,
            username: updatedUserData.username || "",
            email: updatedUserData.email || "",
            avatar: updatedUserData.avatar || null,
            birthday: updatedUserData.birthday || ""
          }));

          // ล้างข้อมูลชั่วคราว
          setSelectedFile(null);
          setPreviewUrl(null); // Clear preview since we saved

          // ไปหน้าหลัก (ไม่แจ้งเตือน popup เพราะจะรบกวนผู้ใช้)
          const shopIdVal = localStorage.getItem("shopId") || "";
          navigate(`/home${shopIdVal ? `?shopId=${shopIdVal}` : ''}`);
        } else {
          console.error("[Profile] Failed to update profile on backend:", data.message);
          showModal({
            title: "เกิดข้อผิดพลาด",
            message: "บันทึกข้อมูลไม่สำเร็จ: " + (data.message || "เกิดข้อผิดพลาด"),
            type: "error",
            confirmText: "รับทราบ"
          });
        }
      }

    } catch (error) {
      console.error("Profile save error:", error);
      showModal({
        title: "เกิดข้อผิดพลาด",
        message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
        type: "error",
        confirmText: "รับทราบ"
      });
      return;
    }
  };

  /**
   * กลับไปหน้าหลัก (Home)
   */
  const handleGoBack = () => {
    const shopIdVal = localStorage.getItem("shopId") || "";
    navigate(`/home${shopIdVal ? `?shopId=${shopIdVal}` : ''}`);
  };

  // ========================
  // Render Component
  // ========================
  return (
    <div className="profile-container">
      <CustomModal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
        showCancel={modalConfig.showCancel}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
      />
      <div className="profile-wrapper">
        <header className="profile-header">
          <button className="back-btn" onClick={handleGoBack}>กลับ</button>
          <h1 className="page-title">โปรไฟล์</h1>
          <div />
        </header>

        <main className="profile-main">
          <div className="profile-card">
            {/* avatar */}
            <div className="avatar-section">
              <div className="avatar-container">
                {(previewUrl || tempUser.avatar || user.avatar) ? (
                  <img src={previewUrl || tempUser.avatar || user.avatar} alt="Avatar" className="avatar-image" />
                ) : (
                  <div className="avatar-placeholder">
                    <svg width="70" height="70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                )}
              </div>
              {/* Avatar Action Buttons - Moved outside avatar */}
              <div className="avatar-actions">
                <label className="upload-btn" htmlFor="avatar-upload">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span>อัปโหลด</span>
                </label>
                <input id="avatar-upload" type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
                {(tempUser.avatar || previewUrl) && (
                  <button className="remove-btn" onClick={handleRemoveAvatar} type="button">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                    <span>ลบ</span>
                  </button>
                )}
              </div>
            </div>

            {/* info */}
            <div className="profile-info">
              <div className="info-group">
                <label>ชื่อผู้ใช้</label>
                <input name="username" value={tempUser.username} onChange={handleInputChange} className="profile-input" placeholder="กรุณาใส่ชื่อผู้ใช้" />
              </div>

              <div className="info-group">
                <label>อีเมล</label>
                <input
                  name="email"
                  value={tempUser.email}
                  onChange={handleInputChange}
                  className="profile-input disabled"
                  placeholder="กรุณาใส่อีเมล"
                  disabled
                  readOnly
                />
              </div>

              <div className="info-group">
                <label>วันเกิด (วว/ดด/ปปปป)</label>
                <input
                  name="birthday"
                  value={tempUser.birthday}
                  onChange={handleInputChange}
                  className={`profile-input ${canEditBirthday ? '' : 'disabled'}`}
                  placeholder="เช่น 01/12/1990"
                  maxLength={10}
                  disabled={canEditBirthday === false}
                />
                {birthdayError && <div className="validation-error">{birthdayError}</div>}

                {/* Show helpful message ALWAYS:
                   - if cannot edit (due to last edit less than 90 days) -> show nextEditFromLast
                   - if can edit now -> show "ถ้าเปลี่ยนตอนนี้ จะสามารถเปลี่ยนได้อีกครั้งในวันที่ ..." using nextEditIfChangedNow
                   - if parsed failed -> show friendly fallback */}
                <div className="info-message" style={{ marginTop: 8 }}>
                  {canEditBirthday === false ? (
                    nextEditFromLast ? (
                      <>สามารถแก้ไขวันเกิดได้ทุก 90 วันเท่านั้น<br />แก้ไขได้อีกครั้งในวันที่ {nextEditFromLast.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</>
                    ) : (
                      <>ไม่สามารถคำนวณวันที่ถัดไปได้ (ข้อมูลที่เก็บอาจไม่ถูกต้อง)</>
                    )
                  ) : (
                    nextEditIfChangedNow ? (
                      <>สามารถแก้ไขวันเกิดได้ตอนนี้<br />หากเปลี่ยนแล้ว จะสามารถเปลี่ยนได้อีกครั้งในวันที่ {nextEditIfChangedNow.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</>
                    ) : null
                  )}
                </div>
              </div>
            </div>

            <div className="profile-actions">
              <button
                className={`save-btn ${!birthdayError ? "active" : "disabled"}`}
                onClick={handleSave}
                disabled={!!birthdayError}
              >
                บันทึก
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Profile;
