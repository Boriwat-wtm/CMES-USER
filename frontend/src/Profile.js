// Profile.js — show next-change-date always (handles bad/missing lastBirthdayEdit)
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./Profile.css";
import API_BASE_URL from "./config/apiConfig";

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState({
    username: "",
    email: "",
    avatar: null,
    birthday: "", // "DD/MM/YYYY"
    lastBirthdayEdit: "" // stored may be ISO or other or empty
  });

  const [tempUser, setTempUser] = useState({ ...user });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [birthdayError, setBirthdayError] = useState("");

  // nextEditFromLast: if lastBirthdayEdit exists => last + 3 months (may be invalid -> null)
  // nextEditIfChangedNow: always now + 3 months (useful to show "ถ้าเปลี่ยนตอนนี้ จะเปลี่ยนอีกครั้งวันที่...")
  const [nextEditFromLast, setNextEditFromLast] = useState(null);
  const [nextEditIfChangedNow, setNextEditIfChangedNow] = useState(null);
  const [canEditBirthday, setCanEditBirthday] = useState(true);

  const [selectedFile, setSelectedFile] = useState(null); // Store raw file for upload

  // robust parser: try ISO/native, then dd/mm/yyyy
  const parsePossibleDate = (s) => {
    if (!s) return null;
    // try native
    const d1 = new Date(s);
    if (!isNaN(d1.getTime())) return d1;
    // try dd/mm/yyyy or dd-mm-yyyy
    const m = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
    if (m) {
      const day = parseInt(m[1], 10);
      const month = parseInt(m[2], 10) - 1;
      const year = parseInt(m[3], 10);
      const d2 = new Date(year, month, day);
      if (!isNaN(d2.getTime())) return d2;
    }
    return null;
  };

  // load user data once
  useEffect(() => {
    const loadUserData = async () => {
      const token = localStorage.getItem("token");
      
      if (token) {
        try {
          // ดึงข้อมูลจาก backend
          const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          });

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
              
              return;
            }
          }
        } catch (error) {
          console.error("[Profile] Error loading user data from backend:", error);
        }
      }
      
      // ถ้าไม่มี token หรือโหลดจาก backend ไม่ได้ ใช้ localStorage
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

  // compute nextEditIfChangedNow (always now + 90 days)
  useEffect(() => {
    const now = new Date();
    const nxt = new Date(now);
    nxt.setDate(nxt.getDate() + 90);
    setNextEditIfChangedNow(nxt);
  }, []);

  // compute nextEditFromLast and canEditBirthday whenever user.lastBirthdayEdit changes
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

  // hasChanges
  const hasChanges = useMemo(() => {
    const usernameChanged = (user.username || "") !== (tempUser.username || "");
    const emailChanged = (user.email || "") !== (tempUser.email || "");
    const birthdayChanged = (user.birthday || "") !== (tempUser.birthday || "");

    // For avatar, check if tempUser.avatar or previewUrl is different from user.avatar
    const avatarChanged = (tempUser.avatar !== user.avatar) || (previewUrl && previewUrl !== user.avatar) || selectedFile;

    return usernameChanged || emailChanged || birthdayChanged || avatarChanged;
  }, [user, tempUser, previewUrl, selectedFile]);

  // birthday validation
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // block editing only when explicitly disallowed (canEditBirthday === false)
    if (name === "birthday" && canEditBirthday === false) {
      return;
    }
    setTempUser(prev => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert("โปรดเลือกไฟล์รูปภาพเท่านั้น");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("ขนาดไฟล์ต้องไม่เกิน 5 MB");
      return;
    }

    // Store raw file
    setSelectedFile(file);

    // Convert file to Base64 to show preview immediately
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target.result;
      setPreviewUrl(base64String);
      // We don't set tempUser.avatar here to avoid saving base64 to DB
      // setTempUser(prev => ({ ...prev, avatar: base64String })); 
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setTempUser(prev => ({ ...prev, avatar: null }));
    setPreviewUrl(null);
    setSelectedFile(null);
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    if (birthdayError) return;

    // Confirmation popup
    const confirmSave = window.confirm(
      "คุณต้องการบันทึกการเปลี่ยนแปลงหรือไม่?\n\n" +
      "ข้อมูลที่จะอัปเดต:\n" +
      (user.username !== tempUser.username ? `• ชื่อผู้ใช้: ${tempUser.username}\n` : "") +
      (user.email !== tempUser.email ? `• อีเมล: ${tempUser.email}\n` : "") +
      (user.birthday !== tempUser.birthday ? `• วันเกิด: ${tempUser.birthday}\n` : "") +
      (selectedFile || (user.avatar !== tempUser.avatar) ? `• รูปโปรไฟล์: อัปเดตแล้ว\n` : "")
    );

    if (!confirmSave) {
      return;
    }

    // if trying to change birthday but not allowed
    const isBirthdayChanged = user.birthday !== tempUser.birthday;
    if (isBirthdayChanged && canEditBirthday === false) {
      // show the date from last edit if available, otherwise fallback to if-changed-now
      const showDate = nextEditFromLast || nextEditIfChangedNow;
      if (showDate) {
        alert(`สามารถแก้ไขวันเกิดได้ทุก 90 วัน\nแก้ไขได้อีกครั้งในวันที่ ${showDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}`);
      } else {
        alert("ไม่สามารถแก้ไขวันเกิดได้ในขณะนี้");
      }
      return;
    }

    try {
      let finalAvatarUrl = tempUser.avatar;

      // Unset previewUrl logic if image removed
      if (!previewUrl && !tempUser.avatar) {
        finalAvatarUrl = null;
      }

      // If there is a new file selected, upload it first
      if (selectedFile) {
        const formData = new FormData();
        formData.append("avatar", selectedFile);

        const uploadRes = await fetch(`${API_BASE_URL}/api/upload-avatar`, {
          method: "POST",
          body: formData
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload avatar");
        }

        const uploadData = await uploadRes.json();
        if (uploadData.success && uploadData.imageUrl) {
          finalAvatarUrl = uploadData.imageUrl; // Use the returned URL
          // If URL is relative, prepend base if needed, currently usually served relatively or absolutely by backend
          // The backend returns relative e.g. /uploads/avatars/...
        }
      }

      // prepare new user object and lastBirthdayEdit update
      const newUser = {
        username: tempUser.username || "",
        email: tempUser.email || "",
        avatar: finalAvatarUrl,
        birthday: tempUser.birthday || "",
        lastBirthdayEdit: isBirthdayChanged ? new Date().toISOString() : user.lastBirthdayEdit
      };

      // ส่งข้อมูลไปยัง backend เพื่อบันทึก
      const token = localStorage.getItem("token");
      if (token) {
        const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
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
        
        if (!response.ok) {
          // จัดการกรณีที่ backend ตอบกลับด้วย error
          if (data.message) {
            alert(data.message);
          } else {
            alert("บันทึกข้อมูลไม่สำเร็จ");
          }
          
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
          
          // อัปเดต localStorage เพื่อเก็บข้อมูล
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

          // Clean up state
          setSelectedFile(null);
          setPreviewUrl(null); // Clear preview since we saved
          
          // Show success message
          alert("✅ บันทึกข้อมูลสำเร็จ!\n\nข้อมูลโปรไฟล์ของคุณได้รับการอัปเดตแล้ว");
          
          // navigate to home
          navigate("/home");
        } else {
          console.error("[Profile] Failed to update profile on backend:", data.message);
          alert("บันทึกข้อมูลไม่สำเร็จ: " + (data.message || "เกิดข้อผิดพลาด"));
        }
      }

    } catch (error) {
      console.error("Profile save error:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      return;
    }
  };

  const handleGoBack = () => navigate("/home");

  return (
    <div className="profile-container">
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
                <input name="email" value={tempUser.email} onChange={handleInputChange} className="profile-input" placeholder="กรุณาใส่อีเมล" />
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
