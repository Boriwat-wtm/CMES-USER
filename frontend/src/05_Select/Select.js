import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import "./Select.css";
import { REALTIME_URL } from "../config/apiConfig";

function Select() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const type = queryParams.get("type");

  const [selectedOption, setSelectedOption] = useState(null);
  const [time, setTime] = useState("");
  const [price, setPrice] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [showRestrictions, setShowRestrictions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [packages, setPackages] = useState([]);

  useEffect(() => {
    const shopId = new URLSearchParams(window.location.search).get("shopId") || localStorage.getItem("shopId") || "";
    console.log("[Select] shopId:", shopId);
    const socket = io(REALTIME_URL, { query: { shopId } });

    socket.on("status", (data) => {
      console.log("Received status event:", data);
      if (data.settings) {
        const filtered = data.settings.filter(pkg => pkg.mode === type);
        console.log("Filtered packages for", type, ":", filtered);
        setPackages(filtered);
      }
    });

    // 🔥 emit getConfig inside connect handler so it fires on initial connect
    // AND on every reconnect (important: emitting before connect only buffers
    // once — a disconnect before flush loses the event)
    socket.on("connect", () => {
      socket.emit("getConfig");
    });

    return () => socket.disconnect();
  }, [type]);

  const handleSelect = (time, price, index) => {
    setTime(time);
    setPrice(price);
    setSelectedOption(index);
    setAlertMessage("");
  };

  const handleNext = () => {
    if (isProcessing) return;
    setIsProcessing(true);

    if (selectedOption === null) {
      setAlertMessage("โปรดเลือกแพ็กเกจที่ต้องการ");
      setIsProcessing(false);
      return;
    }

    const timeSeconds = parseInt(time, 10) || 0;
    const priceNum = Number(price) || 0;
    const shopId = new URLSearchParams(window.location.search).get("shopId") || localStorage.getItem("shopId") || "";

    if (type === "birthday") {
      const endTime = new Date(Date.now() + timeSeconds * 1000);
      localStorage.setItem("endTime", endTime.toISOString());
      const newOrderValue = JSON.stringify({ type: "birthday", time: timeSeconds, price: 0 });
      localStorage.setItem("order", newOrderValue);
      navigate(`/upload?type=birthday&time=${timeSeconds}&price=0&free=true&shopId=${shopId}`);
    } else {
      const endTime = new Date(Date.now() + timeSeconds * 1000);
      localStorage.setItem("endTime", endTime.toISOString());
      const newOrderValue = JSON.stringify({ type, time: timeSeconds, price: priceNum });
      localStorage.setItem("order", newOrderValue);
      const freeParam = priceNum === 0 ? "&free=true" : "";
      navigate(`/upload?type=${encodeURIComponent(type)}&time=${timeSeconds}&price=${priceNum}${freeParam}&shopId=${shopId}`);
    }

    setIsProcessing(false);
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="select-container">
      {/* Floating Background Elements */}
      <div className="floating-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      <div className="select-wrapper">
        <header className="select-header">
          <button className="back-btn" onClick={handleGoBack}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="header-content">
            <h1>เลือกแพ็กเกจ</h1>
            <p>เลือกระยะเวลาที่ต้องการแสดงบนหน้าจอ</p>
          </div>
          <div></div>
        </header>

        <main className="select-main">
          <div className="service-info">
            <div className="service-type">
              <div className="type-icon">
                {type === "image" ? (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                ) : (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14,2 14,8 20,8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <line x1="10" y1="9" x2="8" y2="9" />
                  </svg>
                )}
              </div>
              <div className="type-details">
                <h2>
                  {type === "image"
                    ? "รูปภาพ + ข้อความ"
                    : type === "text"
                      ? "ข้อความเท่านั้น"
                      : type === "birthday"
                        ? "อวยพรวันเกิด"
                        : "รูปภาพ + ข้อความ"
                  }
                </h2>
                <p>
                  {type === "image"
                    ? "อัปโหลดรูปภาพพร้อมข้อความ"
                    : type === "text"
                      ? "ส่งข้อความไปแสดงบนจอ"
                      : type === "birthday"
                        ? "อัปโหลดรูปภาพพร้อมข้อความ"
                        : "อัปโหลดรูปภาพพร้อมข้อความ"
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="packages-section">
            <h3>เลือกแพ็กเกจเวลา</h3>
            <div className="packages-grid">
              {packages.length === 0 ? (
                <div style={{ textAlign: "center", color: "#888", fontSize: "1.2rem", marginTop: "32px" }}>
                  ไม่มีแพ็คเกจสำหรับประเภทนี้
                </div>
              ) : (
                packages.map((pkg, index) => (
                  <div
                    key={pkg.id}
                    className={`package-card ${selectedOption === index ? "selected" : ""}`}
                    onClick={() => handleSelect(pkg.time, pkg.price, index)}
                  >
                    <div className="package-header">
                      <div className="package-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12,6 12,12 16,14" />
                        </svg>
                      </div>
                      <h4>{pkg.duration}</h4>
                    </div>
                    <div className="package-content">
                      <div className="price-display">
                        <span className="price-amount">{pkg.price === 0 ? "ฟรี!" : `฿${pkg.price}`}</span>
                      </div>
                      <div className="package-features">
                        <div className="feature-item">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          <span>แสดงผล {pkg.duration}</span>
                        </div>
                        <div className="feature-item">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          <span>คุณภาพ HD</span>
                        </div>
                        {(type === "image" || type === "birthday") && (
                          <div className="feature-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                            <span>รูปภาพ + ข้อความ</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="package-footer">
                      {selectedOption === index && (
                        <div className="selected-indicator">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          <span>เลือกแล้ว</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {alertMessage && (
            <div className="alert-message error">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {alertMessage}
            </div>
          )}

          <div className="action-buttons">
            <button className="secondary-btn" onClick={() => setShowRestrictions(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              ข้อกำหนด
            </button>
            <button
              className="primary-btn"
              onClick={handleNext}
              disabled={selectedOption === null || isProcessing}
            >
              {isProcessing ? (
                <>
                  <div className="spinner"></div>
                  กำลังดำเนินการ...
                </>
              ) : (
                <>
                  ดำเนินการต่อ
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </main>

        {/* Restrictions Modal */}
        {showRestrictions && (
          <div className="modal-overlay" onClick={() => setShowRestrictions(false)}>
            <div className="modal-content restrictions-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>ข้อกำหนดการใช้งาน</h3>
                <button className="close-button" onClick={() => setShowRestrictions(false)}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="modal-body">
                <div className="restrictions-content">
                  <h4>🚫 เนื้อหาที่ห้ามใช้</h4>
                  <ul className="restrictions-list">
                    <li>การโฆษณาที่ละเมิดกฎหมาย (การพนัน, แอลกอฮอล์, ยาเสพติด)</li>
                    <li>เนื้อหาลามกอนาจารหรือไม่เหมาะสม</li>
                    <li>การดูถูกเหยียดหยามหรือสร้างความแตกแยก</li>
                    <li>การคุกคามหรือผิดกฎหมาย</li>
                    {(type === "image" || type === "birthday") && <li>QR Code หรือลิงก์ในรูปภาพ</li>}
                  </ul>

                  <div className="warning-note">
                    <div className="warning-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </div>
                    <div>
                      <strong>คำเตือน:</strong> หากพบเนื้อหาที่ไม่เหมาะสม ทางบริการขอสงวนสิทธิ์ในการปฏิเสธและไม่คืนเงิน
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Select;