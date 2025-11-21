import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom"; 
import "./Upload.css";

function Upload() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const type = queryParams.get("type");
  const time = parseInt(queryParams.get("time")); 
  const price = queryParams.get("price");
  const isFree = queryParams.get("free") === "true";

  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [textColor, setTextColor] = useState("white");
  const [selectedSocial, setSelectedSocial] = useState(""); // social ที่เลือก
  const [socialName, setSocialName] = useState(""); // ชื่อ social
  const [actualType, setActualType] = useState(type); // เพื่อเก็บ type จริง (birthday หรือ image/text)

  const MAX_TEXT_LENGTH = 36;

  // โหลดข้อมูลจาก localStorage ตอน mount
  useEffect(() => {
    const saved = localStorage.getItem("uploadFormDraft");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data) {
          setText(data.text || "");
          setTextColor(data.textColor || "white");
          setSelectedSocial(data.selectedSocial || "");
          setSocialName(data.socialName || "");
          // *** ไม่ต้อง setImage(data.image) ***
        }
      } catch {}
    }

    // ดึง actual type จาก order (set โดย Select.js)
    const order = localStorage.getItem("order");
    if (order) {
      try {
        const orderData = JSON.parse(order);
        console.log("[Upload] Order from localStorage:", orderData);
        setActualType(orderData.type || type);
      } catch {
        setActualType(type);
      }
    }
  }, []);

  // Save ข้อมูลทุกครั้งที่ state เปลี่ยน
  useEffect(() => {
    // image ไม่สามารถเก็บไฟล์ใน localStorage ได้โดยตรง
    // ให้เก็บแค่ชื่อไฟล์ หรือ base64 (ถ้าต้องการ)
    localStorage.setItem(
      "uploadFormDraft",
      JSON.stringify({
        text,
        textColor,
        selectedSocial,
        socialName,
        // image: image ? image.name : null // หรือไม่ต้องเก็บ image
      })
    );
  }, [text, textColor, selectedSocial, socialName]);

  const handleTextChange = (e) => {
    const inputText = e.target.value;
    if (inputText.length <= MAX_TEXT_LENGTH) {
      setText(inputText);
      setAlertMessage("");
    } else {
      setAlertMessage(`ข้อความต้องไม่เกิน ${MAX_TEXT_LENGTH} ตัวอักษร`);
    }
  };

  // ถ้าอยากเก็บรูปด้วย ต้องแปลงเป็น base64
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setAlertMessage("ขนาดไฟล์ต้องไม่เกิน 5MB");
        return;
      }
      setImage(file);
      setAlertMessage("");
      // เก็บ base64 ลง localStorage
      const reader = new FileReader();
      reader.onload = function (ev) {
        localStorage.setItem("uploadFormImage", ev.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // โหลดรูปจาก localStorage (base64) ตอน mount
  useEffect(() => {
    const saved = localStorage.getItem("uploadFormImage");
    if (saved) {
      // สร้างไฟล์จำลองจาก base64
      const arr = saved.split(",");
      if (arr.length > 1) {
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const file = new File([u8arr], "image.png", { type: mime });
        setImage(file); // ลบ fileInput ที่ไม่ได้ใช้
      }
    }
  }, []);

  const handleUpload = () => {
    if (type === "image" && !image) {
      setAlertMessage("โปรดเลือกไฟล์รูปภาพ");
      return;
    }

    if (!text.trim()) {
      setAlertMessage("โปรดใส่ข้อความ");
      return;
    }

    setShowPreviewModal(true);
  };



  // สร้างข้อความ socialText และ socialOnImage ใหม่
  const socialText = selectedSocial && socialName
    ? (() => {
        switch (selectedSocial) {
          case "ig": return `IG: ${socialName}`;
          case "fb": return `Facebook: ${socialName}`;
          case "line": return `Line: ${socialName}`;
          case "tiktok": return `Tiktok: ${socialName}`;
          default: return "";
        }
      })()
    : "";

  const socialOnImage = selectedSocial && socialName
    ? (() => {
        switch (selectedSocial) {
          case "ig":
            return (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="2" width="20" height="20" rx="5" fill="#E1306C"/>
                  <circle cx="12" cy="12" r="5" fill="#fff"/>
                  <circle cx="18" cy="6" r="1.5" fill="#fff"/>
                </svg>
                {socialName}
              </span>
            );
          case "fb":
            return (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F3">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                {socialName}
              </span>
            );
          case "line":
            return (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#06C755">
                  <rect x="2" y="2" width="20" height="20" rx="5"/>
                  <text x="12" y="16" textAnchor="middle" fontSize="10" fill="#fff" fontFamily="Arial">LINE</text>
                </svg>
                {socialName}
              </span>
            );
          case "tiktok":
            return (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#000">
                  <path d="M9.5 3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5a5.5 5.5 0 0 0 5.5 5.5h1.5a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.5A5.5 5.5 0 0 0 14.5 19.5V21a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-1.5A5.5 5.5 0 0 0 3 14.5V13a1 1 0 0 1 1-1h1.5A5.5 5.5 0 0 0 9.5 4.5V3z"/>
                </svg>
                {socialName}
              </span>
            );
          default:
            return null;
        }
      })()
    : null;

  const handleAccept = async () => {
    console.log("[Upload] handleAccept called, type:", type, "actualType:", actualType, "isFree:", isFree);
    
    if ((type === "image" || type === "birthday") && image) {
      generateFinalImage(image, text, textColor, selectedSocial, socialName, async (finalBlob) => {
          const formData = new FormData();
          formData.append("file", finalBlob, "final.png");
          // ส่ง actualType ไปแทน type
          formData.append("type", actualType || "image");
          formData.append("time", time || "5"); // ถ้าไม่มี time ให้ใช้ 5 นาที
          formData.append("price", isFree ? "0" : (price || "1")); // ถ้าเป็น free ให้ราคาเป็น 0
          formData.append("textColor", textColor);
          formData.append("text", text);
          formData.append("socialType", selectedSocial);
          formData.append("socialName", socialName);
          formData.append("composed", "1");

        let sender = "Unknown";
        const user = localStorage.getItem("user");
        if (user) {
          try {
            const userObj = JSON.parse(user);
            sender = userObj.name || userObj.username || "Unknown";
          } catch {
            sender = "Unknown";
          }
        }
        formData.append("sender", sender);

        try {
          console.log("[Upload] Uploading with type:", actualType, "to Admin backend");
          const response = await fetch("http://localhost:5001/api/upload", {
            method: "POST",
            body: formData,
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log("[Upload] Upload success:", result);
            localStorage.setItem('pendingUploadId', result.uploadId);
            setShowPreviewModal(false);
            if (isFree) {
              // ถ้าเป็นการใช้งานฟรี ไปที่หน้าสถานะทันที
              navigate("/home");
            } else {
              // ถ้าไม่ฟรี ไปที่หน้าชำระเงิน
              navigate(`/payment?uploadId=${result.uploadId}&price=${price}&type=${actualType}&time=${time}`);
            }
          } else {
            const errText = await response.text();
            console.error("[Upload] Upload failed:", response.status, errText);
            throw new Error(`Upload failed: ${response.status} ${errText}`);
          }
        } catch (error) {
          console.error('[Upload] Error uploading:', error);
          setAlertMessage("เกิดข้อผิดพลาดในการอัปโหลด กรุณาลองใหม่");
        }
      });
    } else if (type === "text") {
      // เตรียมข้อมูลสำหรับส่งข้อความ
      let sender = "Unknown";
      const user = localStorage.getItem("user");
      if (user) {
        try {
          const userObj = JSON.parse(user);
          sender = userObj.name || userObj.username || "Unknown";
        } catch {
          sender = "Unknown";
        }
      }

      const payload = {
        type,
        text,
        time,
        price,
        sender,
        textColor,
        socialType: selectedSocial,
        socialName: socialName
      };

      try {
        const response = await fetch("http://localhost:5001/api/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const result = await response.json();
          localStorage.setItem('pendingUploadId', result.uploadId);
          setShowPreviewModal(false);
          if (isFree) {
            // ถ้าเป็นการใช้งานฟรี ไปที่หน้าสถานะทันที
            navigate("/home");
          } else {
            // ถ้าไม่ฟรี ไปที่หน้าชำระเงิน
            navigate(`/payment?uploadId=${result.uploadId}&price=${price}&type=${type}&time=${time}`);
          }
        } else {
          throw new Error('Failed to upload');
        }
      } catch (error) {
        console.error('Error uploading:', error);
        setAlertMessage("เกิดข้อผิดพลาดในการอัปโหลด กรุณาลองใหม่");
      }
    }
  };

  const handleEdit = () => {
    setShowPreviewModal(false);
  };

  const handleShowModal = () => setShowModal(true);
  const handleCloseModal = () => setShowModal(false);

  const handleGoBack = () => {
    navigate(-1);
  };

  // เพิ่มฟังก์ชันนี้ใน Upload.js
  function generateFinalImage(imageFile, text, textColor, socialType, socialName, callback) {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      // วาด Social (กลางภาพ)
      if (socialType && socialName) {
        ctx.font = "bold 32px Prompt, Kanit, sans-serif";
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 6;
        ctx.fillText(
          `${socialType.toUpperCase()}: ${socialName}`,
          canvas.width / 2,
          canvas.height / 2 - 20
        );
        ctx.shadowBlur = 0;
      }

      // วาดข้อความ (กลางภาพ)
      if (text) {
        ctx.font = "bold 36px Prompt, Kanit, sans-serif";
        ctx.fillStyle = textColor || "#fff";
        ctx.textAlign = "center";
        ctx.shadowColor = textColor === "white" ? "#000" : "#fff";
        ctx.shadowBlur = 8;
        ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 30);
        ctx.shadowBlur = 0;
      }

      canvas.toBlob((blob) => {
        callback(blob);
      }, "image/png");
    };
    img.src = URL.createObjectURL(imageFile);
  }

  return (
    <div className="upload-container">
      <div className="upload-wrapper">
        <header className="upload-header">
          <button className="back-btn" onClick={handleGoBack}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1>สร้างเนื้อหา</h1>
          <div></div>
        </header>

        <main className="upload-main">
          <div className="content-card">
            <div className="package-info">
              <div className="package-detail">
                <span className="label">ประเภท:</span>
                <span className="value">{type === "image" ? "รูปภาพ + ข้อความ" : "ข้อความ"}</span>
              </div>
              <div className="package-detail">
                <span className="label">เวลาแสดง:</span>
                <span className="value">{time} นาที</span>
              </div>
              <div className="package-detail">
                <span className="label">ราคา:</span>
                <span className="value price">฿{price}</span>
              </div>
            </div>

            {type === "image" && (
              <div className="upload-section">
                <h3>อัปโหลดรูปภาพ</h3>
                <div className="file-upload-container">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageChange}
                    id="file-upload"
                    className="file-input"
                  />
                  <label htmlFor="file-upload" className="file-upload-label">
                    {image ? (
                      <div className="file-selected">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 6L9 17l-5-5"/>
                        </svg>
                        <span>เลือกไฟล์แล้ว: {image.name}</span>
                      </div>
                    ) : (
                      <div className="file-placeholder">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                          <path d="M21 15l-5-5L5 21"/>
                        </svg>
                        <span>คลิกเพื่อเลือกรูปภาพ</span>
                        <small>รองรับไฟล์ JPG, PNG, GIF ขนาดไม่เกิน 5MB</small>
                      </div>
                    )}
                  </label>
                </div>

                {image && (
                  <div className="image-preview-container" style={{ position: "relative" }}>
                    <img src={URL.createObjectURL(image)} alt="Preview" className="preview-image" />
                    <div
                      className="preview-overlay-center"
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        width: "90%",
                        zIndex: 2,
                        textAlign: "center",
                        pointerEvents: "none"
                      }}
                    >
                      {socialOnImage && (
                        <div className="preview-social-overlay" style={{
                          marginBottom: "8px",
                          color: "#fff",
                          padding: "6px 16px",
                          borderRadius: "8px",
                          fontWeight: "bold",
                          fontSize: "16px",
                          maxWidth: "100%",
                          wordBreak: "break-all"
                        }}>
                          {socialOnImage}
                        </div>
                      )}
                      <div
                        className="preview-text-overlay"
                        style={{
                          color: textColor,
                          borderRadius: "8px",
                          padding: "6px 16px",
                          fontWeight: "bold",
                          fontSize: "18px",
                          textShadow: textColor === "white"
                            ? "0 2px 8px rgba(0,0,0,0.8)"
                            : "0 2px 8px rgba(255,255,255,0.8)",
                          maxWidth: "100%",
                          wordBreak: "break-all"
                        }}
                      >
                        {text}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Social Section */}
            <div className="social-section">
              <h3>ช่องทางโซเชียลของคุณ</h3>
              <div className="social-radio-options">
                <label className={`social-radio ${selectedSocial === "ig" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="social"
                    value="ig"
                    checked={selectedSocial === "ig"}
                    onChange={() => { setSelectedSocial("ig"); setSocialName(""); }}
                  />
                  <span className="icon-label">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="2" width="20" height="20" rx="5" fill="#E1306C"/>
                      <circle cx="12" cy="12" r="5" fill="#fff"/>
                      <circle cx="18" cy="6" r="1.5" fill="#fff"/>
                    </svg>
                    IG
                  </span>
                </label>
                <label className={`social-radio ${selectedSocial === "fb" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="social"
                    value="fb"
                    checked={selectedSocial === "fb"}
                    onChange={() => { setSelectedSocial("fb"); setSocialName(""); }}
                  />
                  <span className="icon-label">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F3">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Facebook
                  </span>
                </label>
                <label className={`social-radio ${selectedSocial === "line" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="social"
                    value="line"
                    checked={selectedSocial === "line"}
                    onChange={() => { setSelectedSocial("line"); setSocialName(""); }}
                  />
                  <span className="icon-label">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#06C755">
                      <rect x="2" y="2" width="20" height="20" rx="5"/>
                      <text x="12" y="16" textAnchor="middle" fontSize="10" fill="#fff" fontFamily="Arial">LINE</text>
                    </svg>
                    Line
                  </span>
                </label>
                <label className={`social-radio ${selectedSocial === "tiktok" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="social"
                    value="tiktok"
                    checked={selectedSocial === "tiktok"}
                    onChange={() => { setSelectedSocial("tiktok"); setSocialName(""); }}
                  />
                  <span className="icon-label">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#000">
                      <path d="M9.5 3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5a5.5 5.5 0 0 0 5.5 5.5h1.5a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.5A5.5 5.5 0 0 0 14.5 19.5V21a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-1.5A5.5 5.5 0 0 0 3 14.5V13a1 1 0 0 1 1-1h1.5A5.5 5.5 0 0 0 9.5 4.5V3z"/>
                    </svg>
                    Tiktok
                  </span>
                </label>
              </div>
              <div style={{ marginTop: 12 }}>
                <input
                  type="text"
                  className="social-input"
                  placeholder={
                    selectedSocial === "ig" ? "ชื่อ IG" :
                    selectedSocial === "fb" ? "ชื่อ Facebook" :
                    selectedSocial === "line" ? "ชื่อ Line" :
                    selectedSocial === "tiktok" ? "ชื่อ Tiktok" : "ชื่อช่องทาง"
                  }
                  maxLength={32}
                  value={socialName}
                  onChange={e => setSocialName(e.target.value)}
                  disabled={!selectedSocial}
                />
              </div>
            </div>

            {/* แสดงข้อความ socialText ด้านบน textarea */}
            {socialText && (
              <div className="social-preview-text">
                {socialText}
              </div>
            )}

            <div className="text-section">
              <h3>ข้อความที่ต้องการแสดง</h3>
              <div className="text-input-container">
                <textarea
                  placeholder="พิมพ์ข้อความที่ต้องการแสดงบนหน้าจอ..."
                  value={text}
                  onChange={handleTextChange}
                  className="text-input"
                  maxLength={MAX_TEXT_LENGTH}
                />
                <div className="character-count">
                  <span className={text.length >= MAX_TEXT_LENGTH ? 'limit-reached' : ''}>
                    {text.length}/{MAX_TEXT_LENGTH}
                  </span>
                </div>
              </div>
            </div>

            <div className="color-section">
              <h3>สีข้อความ</h3>
              <div className="color-options">
                <label className={`color-option ${textColor === "white" ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="textColor"
                    value="white"
                    checked={textColor === "white"}
                    onChange={() => setTextColor("white")}
                  />
                  <div className="color-preview white"></div>
                  <span>สีขาว</span>
                </label>
                <label className={`color-option ${textColor === "black" ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="textColor"
                    value="black"
                    checked={textColor === "black"}
                    onChange={() => setTextColor("black")}
                  />
                  <div className="color-preview black"></div>
                  <span>สีดำ</span>
                </label>
              </div>
            </div>

            {alertMessage && (
              <div className="alert-message">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {alertMessage}
              </div>
            )}

            <div className="action-buttons">
              <button className="secondary-btn" onClick={handleShowModal}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M9,9h6a3,3,0,0,1,0,6H9"/>
                  <path d="M9,15V9"/>
                </svg>
                ข้อกำหนด
              </button>
              <button className="primary-btn" onClick={handleUpload}>
                ดำเนินการต่อ
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </div>
        </main>

        {/* Modal ข้อกำหนด */}
        {showModal && (
          <div className="modal-overlay" onClick={handleCloseModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>ข้อกำหนดการใช้งาน</h3>
                <button className="close-button" onClick={handleCloseModal}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="modal-body">
                <div className="restrictions-content">
                  <h4>🚫 เนื้อหาที่ห้ามใช้</h4>
                  <ul>
                    <li>การโฆษณาที่ละเมิดกฎหมาย (การพนัน, แอลกอฮอล์, ยาเสพติด)</li>
                    <li>เนื้อหาลามกอนาจารหรือไม่เหมาะสม</li>
                    <li>การดูถูกเหยียดหยามหรือสร้างความแตกแยก</li>
                    <li>การคุกคามหรือผิดกฎหมาย</li>
                    <li>QR Code หรือลิงก์ในรูปภาพ</li>
                  </ul>
                  <div className="warning-note">
                    ⚠️ หากพบเนื้อหาที่ไม่เหมาะสม ทางบริการขอสงวนสิทธิ์ในการปฏิเสธและไม่คืนเงิน
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal ยืนยัน */}
        {showPreviewModal && (
          <div className="modal-overlay" onClick={handleEdit}>
            <div className="modal-content preview-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>ยืนยันเนื้อหา</h3>
                <button className="close-button" onClick={handleEdit}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="modal-body">
                <div className="preview-container">
                  {type === "image" && image && (
                    <div className="final-preview" style={{ position: "relative" }}>
                      <img src={URL.createObjectURL(image)} alt="Preview" className="preview-image" />
                      <div
                        className="preview-overlay-center"
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          width: "90%",
                          zIndex: 2,
                          textAlign: "center",
                          pointerEvents: "none"
                        }}
                      >
                        {socialOnImage && (
                          <div className="preview-social-overlay" style={{
                            marginBottom: "8px",
                            color: "#fff",
                            padding: "6px 16px",
                            borderRadius: "8px",
                            fontWeight: "bold",
                            fontSize: "16px",
                            maxWidth: "100%",
                            wordBreak: "break-all"
                          }}>
                            {socialOnImage}
                          </div>
                        )}
                        <div
                          className="preview-text-overlay"
                          style={{
                            color: textColor,
                            borderRadius: "8px",
                            padding: "6px 16px",
                            fontWeight: "bold",
                            fontSize: "18px",
                            textShadow: textColor === "white"
                              ? "0 2px 8px rgba(0,0,0,0.8)"
                              : "0 2px 8px rgba(255,255,255,0.8)",
                            maxWidth: "100%",
                            wordBreak: "break-all"
                          }}
                        >
                          {text}
                        </div>
                      </div>
                    </div>
                  )}
                  {type === "text" && (
                    <div
                      style={{
                        background: "linear-gradient(135deg,#233046 60%,#1e293b 100%)",
                        borderRadius: "18px",
                        minHeight: "120px",
                        minWidth: "80%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        padding: "24px 0"
                      }}
                    >
                      {/* Social อยู่บนข้อความในกล่องเดียวกัน */}
                      {socialOnImage && (
                        <div
                          style={{
                            marginBottom: "16px",
                            marginTop: "8px", // ขยับลงมาอีกนิด
                            color: "#fff",
                            padding: "6px 18px",
                            borderRadius: "8px",
                            fontWeight: "bold",
                            fontSize: "24px",
                            maxWidth: "100%",
                            wordBreak: "break-all",
                            display: "inline-flex",
                            alignItems: "center",
                            boxShadow: "none" // เอาเงาออก
                            // background: "#666", // ลบ background ออก
                          }}
                        >
                          {socialOnImage}
                        </div>
                      )}
                      <div
                        style={{
                          color: textColor,
                          fontWeight: "bold",
                          fontSize: "20px", // ปรับขนาดข้อความเป็น 20px
                          textShadow: textColor === "white"
                            ? "0 2px 8px rgba(0,0,0,0.8)"
                            : "0 2px 8px rgba(255,255,255,0.8)",
                          textAlign: "center",
                          wordBreak: "break-all"
                        }}
                      >
                        {text}
                      </div>
                    </div>
                  )}
                  <div className="preview-info">
                    <p><strong>แสดงเป็นเวลา:</strong> {time} นาที</p>
                    <p><strong>ราคา:</strong> ฿{price}</p>
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button className="secondary-btn" onClick={handleEdit}>แก้ไข</button>
                <button className="primary-btn" onClick={handleAccept}>
                  {isFree ? "ยืนยันการอัพโหลด" : "ยืนยันและชำระเงิน"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Upload;