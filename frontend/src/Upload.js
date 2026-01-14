import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Upload.css";
import igLogo from "./data-icon/ig-logo.png";
import fbLogo from "./data-icon/facebook-logo.png";
import lineLogo from "./data-icon/line-logo.png";
import tiktokLogo from "./data-icon/x-logo.png";

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
  const [qrCodeFile, setQrCodeFile] = useState(null); // QR Code file

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
      } catch { }
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
  }, [type]);

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

  const handleQRCodeChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setAlertMessage("QR Code ต้องไม่เกิน 2MB");
        return;
      }
      setQrCodeFile(file);
      setAlertMessage("");
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
    if ((type === "image" || type === "birthday") && !image) {
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
      const logoMap = {
        ig: igLogo,
        fb: fbLogo,
        line: lineLogo,
        tiktok: tiktokLogo
      };

      const logoSrc = logoMap[selectedSocial];
      if (!logoSrc) return null;

      return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <img
            src={logoSrc}
            alt={selectedSocial.toUpperCase()}
            style={{ width: "22px", height: "22px", objectFit: "contain" }}
          />
          <span style={{
            fontWeight: "700",
            fontSize: "20px",
            textShadow: "0 2px 6px rgba(0,0,0,0.8)"
          }}>{socialName}</span>
        </span>
      );
    })()
    : null;

  const handleAccept = async () => {
    console.log("[Upload] handleAccept called, type:", type, "actualType:", actualType, "isFree:", isFree);

    if ((type === "image" || type === "birthday") && image) {
      // ไม่ composite ข้อความลงรูปอีกต่อไป - ส่งรูปต้นฉบับ
      const formData = new FormData();
      formData.append("file", image); // ส่งรูปต้นฉบับ

      // ส่ง QR Code ถ้ามี
      if (qrCodeFile) {
        formData.append("qrCode", qrCodeFile);
      }

      // ส่ง actualType ไปแทน type
      formData.append("type", actualType || "image");
      formData.append("time", time || "60");
      formData.append("price", isFree ? "0" : (price || "1"));
      formData.append("textColor", textColor);
      formData.append("text", text);
      formData.append("socialType", selectedSocial);
      formData.append("socialName", socialName);
      formData.append("composed", "0"); // ไม่ใช่ composed อีกต่อไป

      let sender = "Unknown";
      let userId = null;
      let email = null;
      let avatar = null;

      const user = localStorage.getItem("user");
      if (user) {
        try {
          const userObj = JSON.parse(user);
          sender = userObj.name || userObj.username || "Unknown";
          userId = userObj.id || null;
          email = userObj.email || null;
          avatar = userObj.avatar || null;
          console.log("[Upload] User data: userId=", userId, "email=", email);
        } catch (err) {
          console.warn("[Upload] Cannot parse user data:", err);
          sender = "Unknown";
        }
      }
      formData.append("sender", sender);
      if (userId) formData.append("userId", userId);
      if (email) formData.append("email", email);
      if (avatar) formData.append("avatar", avatar);

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
            // ถ้าเป็นการใช้งานฟรี บันทึก order แล้วไปที่หน้าสถานะทันที
            const currentQueueNumber = parseInt(localStorage.getItem("currentQueueNumber") || "0") + 1;
            localStorage.setItem("currentQueueNumber", currentQueueNumber.toString());

            const newOrder = {
              type: actualType || type,
              time: time,
              price: 0,
              queueNumber: currentQueueNumber,
              orderId: result.uploadId
            };

            // เก็บ orders เป็น array
            const existingOrders = JSON.parse(localStorage.getItem("orders") || "[]");
            existingOrders.push(newOrder);
            localStorage.setItem("orders", JSON.stringify(existingOrders));
            // เก็บ order ล่าสุดไว้ด้วย
            localStorage.setItem("order", JSON.stringify(newOrder));

            localStorage.removeItem("pendingUploadId");
            localStorage.removeItem("uploadFormDraft");
            localStorage.removeItem("uploadFormImage");

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
    } else if (type === "text") {
      // เตรียมข้อมูลสำหรับส่งข้อความ
      let sender = "Unknown";
      let userId = null;
      let email = null;
      let avatar = null;

      const user = localStorage.getItem("user");
      if (user) {
        try {
          const userObj = JSON.parse(user);
          sender = userObj.name || userObj.username || "Unknown";
          userId = userObj.id || null;
          email = userObj.email || null;
          avatar = userObj.avatar || null;
          console.log("[Upload Text] User data: userId=", userId, "email=", email);
        } catch (err) {
          console.warn("[Upload Text] Cannot parse user data:", err);
          sender = "Unknown";
        }
      }

      const payload = {
        type,
        text,
        time,
        price,
        sender,
        userId,
        email,
        avatar,
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

      // คำนวณสเกลเทียบกับกล่องพรีวิวสูง ~400px เพื่อให้ขนาดตัวอักษรสัมพันธ์กับภาพจริง
      const basePreviewHeight = 400;
      const scale = Math.max(canvas.height / basePreviewHeight, 1);
      const socialFontSize = 20 * scale;
      const textFontSize = 18 * scale;
      const logoSize = 28 * scale;
      const padding = 12 * scale;
      const spacing = 8 * scale;
      const shadowBlur = 8 * scale;
      const centerY = canvas.height / 2;
      const hasText = Boolean(text);
      const hasSocial = Boolean(socialType && socialName);
      const stackSpacing = hasSocial && hasText ? spacing : 0;
      const totalHeight =
        (hasSocial ? logoSize : 0) + stackSpacing + (hasText ? textFontSize : 0);
      const stackTop = centerY - totalHeight / 2;
      const socialCenterY = hasSocial ? stackTop + logoSize / 2 : null;
      const textCenterY = hasText
        ? hasSocial
          ? stackTop + logoSize + stackSpacing + textFontSize / 2
          : stackTop + textFontSize / 2
        : null;

      // ฟังก์ชันวาดทั้งหมด (รอโหลด logo ก่อนจะวาด)
      const drawContent = () => {
        // วาดข้อความ (กลางภาพ - ขนาดเล็กกว่า social)
        if (text) {
          ctx.font = `400 ${textFontSize}px Prompt, Kanit, sans-serif`;
          ctx.fillStyle = textColor || "#fff";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.shadowColor = textColor === "white" ? "#000" : "#fff";
          ctx.shadowBlur = shadowBlur;
          ctx.fillText(text, canvas.width / 2, textCenterY ?? centerY);
          ctx.shadowBlur = 0;
        }

        canvas.toBlob((blob) => {
          callback(blob);
        }, "image/png");
      };

      // วาด Social Logo + Name (ด้านบนของภาพ)
      if (socialType && socialName) {
        const logoMap = {
          ig: igLogo,
          fb: fbLogo,
          line: lineLogo,
          tiktok: tiktokLogo
        };

        const logoSrc = logoMap[socialType];
        if (logoSrc) {
          const logoImg = new window.Image();
          logoImg.onload = () => {
            // ตั้งค่าฟอนต์สำหรับ social name
            ctx.font = `700 ${socialFontSize}px Prompt, Kanit, sans-serif`;

            const textWidth = ctx.measureText(socialName).width;
            const totalWidth = logoSize + padding + textWidth;

            // คำนวณตำแหน่งให้อยู่กลางด้านบน
            const startX = (canvas.width - totalWidth) / 2;
            const socialY = socialCenterY ?? centerY;
            const startY = socialY - logoSize / 2;

            // วาด Logo
            ctx.drawImage(logoImg, startX, startY, logoSize, logoSize);

            // วาดชื่อ Social (ไม่มี box พื้นหลัง)
            ctx.font = `700 ${socialFontSize}px Prompt, Kanit, sans-serif`;
            ctx.fillStyle = "#fff";
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.shadowColor = "#000";
            ctx.shadowBlur = shadowBlur;
            ctx.fillText(socialName, startX + logoSize + padding, socialY);
            ctx.shadowBlur = 0;

            drawContent();
          };
          logoImg.onerror = () => {
            // ถ้าโหลด logo ไม่สำเร็จ ใช้ text แทน
            const fallbackFont = Math.max(32 * scale, socialFontSize);
            ctx.font = `700 ${fallbackFont}px Prompt, Kanit, sans-serif`;
            ctx.fillStyle = "#fff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.shadowColor = "#000";
            ctx.shadowBlur = shadowBlur;
            ctx.fillText(
              `${socialType.toUpperCase()}: ${socialName}`,
              canvas.width / 2,
              (socialCenterY ?? centerY)
            );
            ctx.shadowBlur = 0;
            drawContent();
          };
          logoImg.src = logoSrc;
        } else {
          drawContent();
        }
      } else {
        drawContent();
      }
    };
    img.src = URL.createObjectURL(imageFile);
  }

  return (
    <div className="upload-container">
      <div className="upload-wrapper">
        <header className="upload-header">
          <button className="back-btn" onClick={handleGoBack}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
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
                <span className="value">
                  {type === "image" ? "รูปภาพ + ข้อความ" :
                    type === "birthday" ? "🎂 อวยพรวันเกิด" : "ข้อความ"}
                </span>
              </div>
              <div className="package-detail">
                <span className="label">เวลาแสดง:</span>
                <span className="value">{time} วินาที</span>
              </div>
              <div className="package-detail">
                <span className="label">ราคา:</span>
                <span className="value price">฿{price}</span>
              </div>
            </div>

            {(type === "image" || type === "birthday") && (
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
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        <span>เลือกไฟล์แล้ว: {image.name}</span>
                      </div>
                    ) : (
                      <div className="file-placeholder">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                        <span>คลิกเพื่อเลือกรูปภาพ</span>
                        <small>รองรับไฟล์ JPG, PNG, GIF ขนาดไม่เกิน 5MB</small>
                      </div>
                    )}
                  </label>
                </div>

                {image && (
                  <div style={{ display: 'flex', gap: '20px', marginTop: '12px', alignItems: 'flex-start' }}>
                    {/* รูปภาพด้านซ้าย */}
                    <div style={{ flex: '0 0 auto', maxWidth: '400px' }}>
                      <img src={URL.createObjectURL(image)} alt="Preview" className="preview-image" style={{ width: '100%', borderRadius: '8px' }} />
                    </div>

                    {/* ข้อความและ QR Code ด้านขวา */}
                    {(text || socialOnImage || qrCodeFile) && (
                      <div style={{
                        flex: '1',
                        background: 'rgba(0, 0, 0, 0.6)',
                        padding: '20px',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        alignItems: 'center',
                        minWidth: '200px'
                      }}>
                        {/* Social */}
                        {socialOnImage && (
                          <div style={{
                            color: '#fff',
                            fontWeight: '700',
                            fontSize: '20px',
                            textShadow: '0 2px 8px rgba(0,0,0,0.8)'
                          }}>
                            {socialOnImage}
                          </div>
                        )}

                        {/* Text */}
                        {text && (
                          <div style={{
                            color: textColor,
                            fontWeight: '400',
                            fontSize: '18px',
                            textShadow: textColor === 'white' ? '0 2px 8px rgba(0,0,0,0.8)' : '0 2px 8px rgba(255,255,255,0.8)',
                            textAlign: 'center',
                            wordBreak: 'break-word'
                          }}>
                            {text}
                          </div>
                        )}

                        {/* QR Code */}
                        {qrCodeFile && (
                          <div style={{ marginTop: '8px' }}>
                            <img
                              src={URL.createObjectURL(qrCodeFile)}
                              alt="QR Code Preview"
                              style={{
                                width: '120px',
                                height: '120px',
                                borderRadius: '12px',
                                background: 'white',
                                padding: '8px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* QR Code Upload Section for IG */}
            {selectedSocial === "ig" && (type === "image" || type === "birthday") && (
              <div className="upload-section">
                <h3>QR Code Instagram (ไม่บังคับ)</h3>
                <div className="file-upload-container">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQRCodeChange}
                    id="qrcode-upload"
                    className="file-input"
                  />
                  <label htmlFor="qrcode-upload" className="file-upload-label">
                    {qrCodeFile ? (
                      <div className="file-selected">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        <span>QR Code: {qrCodeFile.name}</span>
                      </div>
                    ) : (
                      <div className="file-placeholder">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                        <span>คลิกเพื่อเลือก QR Code</span>
                        <small>ไม่บังคับ - ขนาดไม่เกิน 2MB</small>
                      </div>
                    )}
                  </label>
                </div>

                {qrCodeFile && (
                  <div className="qr-preview">
                    <img src={URL.createObjectURL(qrCodeFile)} alt="QR Code Preview" style={{
                      maxWidth: "300px",
                      maxHeight: "300px",
                      borderRadius: "8px",
                      marginTop: "12px"
                    }} />
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
                    <img src={igLogo} alt="IG" style={{ width: "18px", height: "18px", objectFit: "contain" }} />
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
                    <img src={fbLogo} alt="Facebook" style={{ width: "18px", height: "18px", objectFit: "contain" }} />
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
                    <img src={lineLogo} alt="Line" style={{ width: "18px", height: "18px", objectFit: "contain" }} />
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
                    <img src={tiktokLogo} alt="TikTok" style={{ width: "18px", height: "18px", objectFit: "contain" }} />
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
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {alertMessage}
              </div>
            )}

            <div className="action-buttons">
              <button className="secondary-btn" onClick={handleShowModal}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9,9h6a3,3,0,0,1,0,6H9" />
                  <path d="M9,15V9" />
                </svg>
                ข้อกำหนด
              </button>
              <button className="primary-btn" onClick={handleUpload}>
                ดำเนินการต่อ
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
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
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
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
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="modal-body">
                <div className="preview-container">
                  {(type === "image" || type === "birthday") && image && (
                    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                      {/* รูปภาพด้านซ้าย */}
                      <div style={{ flex: '0 0 auto', maxWidth: '500px' }}>
                        <img
                          src={URL.createObjectURL(image)}
                          alt="Preview"
                          style={{
                            width: '100%',
                            borderRadius: '12px',
                            maxHeight: '60vh',
                            objectFit: 'contain'
                          }}
                        />
                      </div>

                      {/* ข้อความและ QR Code ด้านขวา */}
                      {(text || socialOnImage || qrCodeFile) && (
                        <div style={{
                          flex: '1',
                          background: 'rgba(0, 0, 0, 0.7)',
                          padding: '24px',
                          borderRadius: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '20px',
                          alignItems: 'center',
                          minWidth: '250px'
                        }}>
                          {/* Social */}
                          {socialOnImage && (
                            <div style={{
                              color: '#fff',
                              fontWeight: '700',
                              fontSize: '24px',
                              textShadow: '0 2px 8px rgba(0,0,0,0.8)'
                            }}>
                              {socialOnImage}
                            </div>
                          )}

                          {/* Text */}
                          {text && (
                            <div style={{
                              color: textColor,
                              fontWeight: '400',
                              fontSize: '20px',
                              textShadow: textColor === 'white' ? '0 2px 8px rgba(0,0,0,0.8)' : '0 2px 8px rgba(255,255,255,0.8)',
                              textAlign: 'center',
                              wordBreak: 'break-word'
                            }}>
                              {text}
                            </div>
                          )}

                          {/* QR Code */}
                          {qrCodeFile && (
                            <div style={{ marginTop: '12px' }}>
                              <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '8px', textAlign: 'center' }}>
                                QR Code Instagram
                              </div>
                              <img
                                src={URL.createObjectURL(qrCodeFile)}
                                alt="QR Code Preview"
                                style={{
                                  width: '150px',
                                  height: '150px',
                                  borderRadius: '16px',
                                  background: 'white',
                                  padding: '12px',
                                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )}
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
                            marginTop: "8px",
                            color: "#fff",
                            padding: "6px 18px",
                            borderRadius: "8px",
                            fontWeight: "700",
                            fontSize: "20px",
                            textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                            maxWidth: "100%",
                            wordBreak: "break-all",
                            display: "inline-flex",
                            alignItems: "center",
                            boxShadow: "none"
                          }}
                        >
                          {socialOnImage}
                        </div>
                      )}
                      <div
                        style={{
                          color: textColor,
                          fontWeight: "400",
                          fontSize: "18px",
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
                    <p><strong>แสดงเป็นเวลา:</strong> {time} วินาที</p>
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