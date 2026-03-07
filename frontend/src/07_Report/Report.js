import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Report.css";
import API_BASE_URL from "../config/apiConfig";

/**
 * หน้า Report - ศูนย์รายงานปัญหาและข้อเสนอแนะ
 * 
 * ฟังก์ชันหลัก:
 * - ให้ผู้ใช้รายงานปัญหาหรือข้อเสนอแนะ
 * - เลือกประเภทปัญหา (technical, display, payment, etc.)
 * - กรอกรายละเอียดปัญหา (สูงสุด 500 ตัวอักษร)
 * - ส่งข้อมูลไปยัง backend API
 * - แสดง animation เมื่อส่งสำเร็จ
 */
function Report() {
  const navigate = useNavigate();

  const shopId = new URLSearchParams(window.location.search).get("shopId") || localStorage.getItem("shopId") || "";
  console.log("[Report] shopId:", shopId);

  // State สำหรับเก็บข้อมูลฟอร์ม
  const [category, setCategory] = useState("");      // ประเภทปัญหาที่เลือก
  const [detail, setDetail] = useState("");          // รายละเอียดปัญหา
  const [message, setMessage] = useState("");        // ข้อความแจ้งเตือน (success/error)
  const [isSubmitting, setIsSubmitting] = useState(false);  // สถานะกำลังส่งข้อมูล
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);  // แสดง animation สำเร็จ

  const MAX_DETAIL_LENGTH = 500;  // จำกัดความยาวรายละเอียดสูงสุด

  /**
   * ฟังก์ชันย้อนกลับไปหน้าก่อนหน้า
   */
  const handleBack = () => {
    navigate(-1);
  };

  /**
   * จัดการเมื่อผู้ใช้พิมพ์รายละเอียดปัญหา
   * - จำกัดความยาวไม่เกิน MAX_DETAIL_LENGTH
   * - ล้างข้อความ error เมื่อเริ่มพิมพ์
   */
  const handleDetailChange = (e) => {
    const inputText = e.target.value;
    if (inputText.length <= MAX_DETAIL_LENGTH) {
      setDetail(inputText);
      if (message && message.includes("รายละเอียด")) {
        setMessage("");
      }
    }
  };

  /**
   * ฟังก์ชันส่งรายงานไปยัง Backend
   * 
   * ขั้นตอน:
   * 1. Validate ข้อมูล (ต้องเลือกประเภทและกรอกรายละเอียด)
   * 2. ดึง token จาก localStorage (ถ้ามี)
   * 3. ส่ง POST request ไปที่ /api/report
   * 4. แสดง success animation เมื่อสำเร็จ
   * 5. Clear ฟอร์มหลังส่งสำเร็จ
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation - ตรวจสอบว่ากรอกข้อมูลครบหรือไม่
    if (!category) {
      setMessage("โปรดเลือกประเภทปัญหาที่พบ");
      return;
    }
    if (!detail.trim()) {
      setMessage("โปรดระบุรายละเอียดปัญหาที่เกิดขึ้น");
      return;
    }

    setIsSubmitting(true);  // เริ่มต้นการส่งข้อมูล
    setMessage("");         // ล้างข้อความเก่า

    try {
      // ดึง token จาก localStorage (สำหรับ authentication)
      const token = localStorage.getItem("token");

      const headers = {
        "Content-Type": "application/json"
      };

      // เพิ่ม Authorization header ถ้าผู้ใช้ login อยู่
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // แนบ shopId เสมอสำหรับระบบ Multi-tenant
      headers["x-shop-id"] = shopId;

      // ส่ง request ไปยัง backend
      const res = await fetch(`${API_BASE_URL}/api/report?shopId=${shopId}`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          category,
          detail
        })
      });

      if (!res.ok) {
        const t = await res.text();
        console.error("Report error:", t);
        throw new Error("REQUEST_FAILED");
      }

      const data = await res.json();
      console.log("Report saved:", data);

      // แสดง success animation
      setShowSuccessAnimation(true);
      setMessage("🎉 ขอบคุณสำหรับการแจ้งปัญหา! เราจะดำเนินการแก้ไขในเร็วๆ นี้");

      // Clear ฟอร์ม
      setCategory("");
      setDetail("");

      // ซ่อน animation หลังจาก 3 วินาที
      setTimeout(() => setShowSuccessAnimation(false), 3000);
    } catch (err) {
      console.error(err);
      setMessage("⚠️ เกิดปัญหาในการส่งข้อมูล กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSubmitting(false);  // หยุดสถานะการส่งข้อมูล
    }
  };

  /**
   * รายการประเภทปัญหาทั้งหมด
   * ใช้สำหรับ dropdown เลือกประเภทรายงาน
   * แต่ละประเภทประกอบด้วย: value, label, emoji, description
   */
  const problemTypes = [
    {
      value: "",
      label: "เลือกประเภทปัญหา",
      disabled: true,  // ไม่สามารถเลือก option นี้ได้ (เป็นหัวข้อเท่านั้น)
      emoji: "🔽"
    },
    {
      value: "technical",
      label: "ปัญหาทางเทคนิค",
      emoji: "⚡",
      description: "ระบบล่ม, โหลดช้า, ข้อผิดพลาด"
    },
    {
      value: "display",
      label: "ปัญหาการแสดงผล",
      emoji: "🖼️",
      description: "รูปไม่แสดง, ข้อความผิด, หน้าจอเพี้ยน"
    },
    {
      value: "payment",
      label: "ปัญหาการเงิน",
      emoji: "💰",
      description: "ชำระเงินไม่ได้, หักเงินผิด"
    },
    {
      value: "upload",
      label: "ปัญหาอัปโหลด",
      emoji: "📁",
      description: "ไฟล์อัปไม่ได้, ใช้เวลานาน"
    },
    {
      value: "account",
      label: "ปัญหาบัญชีผู้ใช้",
      emoji: "👤",
      description: "เข้าสู่ระบบไม่ได้, ลืมรหัสผ่าน"
    },
    {
      value: "suggestion",
      label: "ข้อเสนอแนะ",
      emoji: "💡",
      description: "ไอเดียปรับปรุง, ฟีเจอร์ใหม่"
    },
    {
      value: "other",
      label: "อื่นๆ",
      emoji: "📝",
      description: "ปัญหาอื่นที่ไม่อยู่ในหมวดข้างต้น"
    }
  ];

  return (
    <div className="report-container">
      {/* Success Animation Overlay - แสดงเมื่อส่งรายงานสำเร็จ */}
      {showSuccessAnimation && (
        <div className="success-overlay">
          <div className="success-animation">
            <div className="check-circle">
              <div className="check-mark"></div>
            </div>
            <h3>ส่งรายงานสำเร็จ!</h3>
            <p>ขอบคุณที่ช่วยเราปรับปรุง</p>
          </div>
        </div>
      )}

      <div className="report-wrapper">
        {/* Header - ส่วนหัวพร้อมปุ่มย้อนกลับ */}
        <header className="report-header">
          <button className="back-btn" onClick={handleBack}>
            <span className="back-icon">←</span>
            <span>ย้อนกลับ</span>
          </button>
          <div className="header-content">
            <h1>🔧 Report Center</h1>
            <p>ศูนย์รายงานปัญหาและข้อเสนอแนะ</p>
          </div>
        </header>

        <main className="report-main">
          <div className="report-card">
            {/* Card Header - หัวข้อการ์ด */}
            <div className="card-header">
              <div className="pulse-dot"></div>
              <h2>แจ้งปัญหาหรือแชร์ไอเดีย</h2>
              <span className="subtitle">เราพร้อมฟังและปรับปรุง</span>
            </div>

            {/* Content Grid - แบ่งหน้าจอเป็น 2 ส่วน: ฟอร์ม (ซ้าย) + เทคนิค (ขวา) */}
            <div className="report-content-grid">
              {/* ฟอร์มรายงานปัญหา */}
              <form className="report-form" onSubmit={handleSubmit}>
                {/* Input Group 1: เลือกประเภทปัญหา */}
                <div className="input-group">
                  <label className="input-label">
                    <span className="label-text">ประเภทปัญหา</span>
                    <span className="required-dot">*</span>
                  </label>

                  {/* Custom Select Dropdown */}
                  <div className="custom-select">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="select-input"
                      required
                    >
                      {problemTypes.map((type) => (
                        <option
                          key={type.value}
                          value={type.value}
                          disabled={type.disabled}
                        >
                          {type.emoji} {type.label}
                        </option>
                      ))}
                    </select>
                    <div className="select-arrow">⌄</div>
                  </div>

                  {/* แสดงคำอธิบายประเภทที่เลือก (ถ้ามีการเลือก) */}
                  {category && (
                    <div className="category-info">
                      <span className="category-emoji">
                        {problemTypes.find(t => t.value === category)?.emoji}
                      </span>
                      <span className="category-desc">
                        {problemTypes.find(t => t.value === category)?.description}
                      </span>
                    </div>
                  )}
                </div>

                {/* Input Group 2: กรอกรายละเอียดปัญหา */}
                <div className="input-group">
                  <label className="input-label">
                    <span className="label-text">รายละเอียด</span>
                    <span className="required-dot">*</span>
                  </label>

                  <div className="textarea-wrapper">
                    <textarea
                      value={detail}
                      onChange={handleDetailChange}
                      placeholder="อธิบายปัญหาที่พบ หรือข้อเสนอแนะ...&#10;&#10;💭 ตัวอย่าง:&#10;• เมื่อไหร่ที่เกิดปัญหา&#10;• ขั้นตอนที่ทำก่อนเกิดปัญหา&#10;• ผลที่เกิดขึ้น&#10;• ข้อความ error (ถ้ามี)"
                      className="detail-input"
                      maxLength={MAX_DETAIL_LENGTH}
                      rows="7"
                      required
                    />

                    {/* Footer ของ textarea: เทคนิคการเขียน + ตัวนับจำนวนตัวอักษร */}
                    <div className="input-footer">
                      <div className="writing-tips">
                        <span className="tip-icon">💡</span>
                        <span>เขียนรายละเอียดให้ชัดเจนจะช่วยให้เราแก้ไขได้เร็วขึ้น</span>
                      </div>
                      <div className="char-counter">
                        <span className={detail.length >= MAX_DETAIL_LENGTH ? 'limit' : ''}>
                          {detail.length}/{MAX_DETAIL_LENGTH}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Message - แสดงข้อความสำเร็จหรือ error */}
                {message && (
                  <div className={`status-message ${message.includes("🎉") ? 'success' : 'error'}`}>
                    <div className="message-content">
                      <span className="message-text">{message}</span>
                    </div>
                  </div>
                )}

                {/* Form Actions - ปุ่มยกเลิกและส่งรายงาน */}
                <div className="form-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={handleBack}
                  >
                    <span>✕</span>
                    <span>ยกเลิก</span>
                  </button>

                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="loading-spinner"></div>
                        <span>กำลังส่ง...</span>
                      </>
                    ) : (
                      <>
                        <span>🚀</span>
                        <span>ส่งรายงาน</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Side Panel - แสดงเทคนิคการรายงานและช่องทางติดต่อ */}
              <aside className="report-side-panel">
                {/* เทคนิคการรายงานที่มีประสิทธิภาพ */}
                <div className="quick-tips">
                  <h4>📋 เทคนิคการรายงานที่มีประสิทธิภาพ</h4>
                  <div className="tips-grid">
                    <div className="tip-item">
                      <span className="tip-number">1</span>
                      <div>
                        <strong>ระบุเวลา</strong>
                        <p>วันที่และเวลาที่เกิดปัญหา</p>
                      </div>
                    </div>
                    <div className="tip-item">
                      <span className="tip-number">2</span>
                      <div>
                        <strong>อธิบายขั้นตอน</strong>
                        <p>สิ่งที่ทำก่อนเกิดปัญหา</p>
                      </div>
                    </div>
                    <div className="tip-item">
                      <span className="tip-number">3</span>
                      <div>
                        <strong>ผลที่เกิดขึ้น</strong>
                        <p>สิ่งที่คาดหวัง vs สิ่งที่เกิดขึ้นจริง</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* การ์ดช่องทางติดต่อด่วน */}
                <div className="support-card">
                  <h4>📞 ช่องทางติดต่อด่วน</h4>
                  <p>ถ้าต้องการความช่วยเหลือทันที สามารถติดต่อทีมงานได้ที่</p>
                  <ul>
                    <li><span>Line:</span> @digitalsignage</li>
                    <li><span>Email:</span> support@cms.com</li>
                    <li><span>โทร:</span> 091-234-5678</li>
                  </ul>
                  <small>ทีมงานตอบกลับทุกวัน 09:00-22:00 น.</small>
                </div>
              </aside>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Report;