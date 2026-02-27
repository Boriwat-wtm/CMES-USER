import React, { useState, useRef } from "react";
import axios from "axios";
import API_BASE_URL from "../config/apiConfig";

/**
 * Component สำหรับอัปโหลดและตรวจสอบสลิปการชำระเงิน
 * 
 * Props:
 * - price: ราคาที่ต้องชำระ (ใช้สำหรับตรวจสอบจำนวนเงินในสลิป)
 * - onSuccess: Callback function ที่จะถูกเรียกเมื่อการชำระเงินสำเร็จ
 * 
 * การทำงาน:
 * 1. ผู้ใช้เลือกไฟล์รูปสลิป (JPG, PNG)
 * 2. กดปุ่มยืนยัน -> ส่งสลิปไปยัง backend API (/verify-slip)
 * 3. Backend ตรวจสอบความถูกต้องและจำนวนเงิน
 * 4. แสดงผลสถานะ: success, pending, หรือ failed
 */
function SlipUpload({ price, onSuccess }) {
  // State เก็บไฟล์สลิปที่ผู้ใช้เลือก
  const [slipFile, setSlipFile] = useState(null);

  // State สำหรับแสดงว่ากำลังตรวจสอบสลิปอยู่หรือไม่
  const [isVerifyingSlip, setIsVerifyingSlip] = useState(false);

  // State สถานะการชำระเงิน: null | "pending" | "success" | "failed"
  const [paymentStatus, setPaymentStatus] = useState(null);

  // Ref สำหรับ trigger input file (เพื่อให้สามารถคลิกจากที่อื่นได้)
  const fileInputRef = useRef(null);

  /**
   * จัดการเมื่อผู้ใช้เลือกไฟล์สลิป
   */
  const handleSlipChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSlipFile(e.target.files[0]);
    }
  };

  /**
   * ฟังก์ชันสำหรับยืนยันแบบง่าย (ไม่ได้ใช้งานตอนนี้)
   * เก็บไว้เผื่อใช้ในอนาคต
   */
  // eslint-disable-next-line no-unused-vars
  const handleVerify = () => {
    if (!slipFile) return;
    console.log("[SlipUpload] verification success");
    onSuccess && onSuccess();
  };

  /**
   * อัปโหลดสลิปและตรวจสอบความถูกต้อง
   * - ส่งไฟล์สลิปและจำนวนเงินไปยัง backend
   * - Backend จะตรวจสอบว่าสลิปถูกต้องและจำนวนเงินตรงหรือไม่
   * - ถ้าสำเร็จ จะเรียก onSuccess callback
   */
  const handleUploadSlipAndVerify = async () => {
    if (!slipFile) {
      alert("กรุณาเลือกไฟล์สลิปก่อน");
      return;
    }

    // เริ่มต้นการตรวจสอบ
    setIsVerifyingSlip(true);
    setPaymentStatus("pending");

    // เตรียมข้อมูลสำหรับส่งไป backend
    const formData = new FormData();
    formData.append("slip", slipFile);        // ไฟล์รูปสลิป
    formData.append("amount", price);         // จำนวนเงินที่ต้องชำระ

    try {
      // ส่ง request ไปยัง backend เพื่อตรวจสอบสลิป
      const response = await axios.post(`${API_BASE_URL}/verify-slip`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        // ✅ สลิปถูกต้อง
        setPaymentStatus("success");
        console.log("[SlipUpload] verification success, calling onSuccess");
        onSuccess && onSuccess();  // เรียก callback เพื่อดำเนินการต่อ
      } else {
        // ❌ สลิปไม่ถูกต้อง
        setPaymentStatus("failed");
        alert(response.data.message || "สลิปไม่ถูกต้องหรือจำนวนเงินไม่ตรง");
      }
    } catch (error) {
      // ⚠️ เกิดข้อผิดพลาดในการเชื่อมต่อหรือตรวจสอบ
      setPaymentStatus("failed");
      alert("เกิดข้อผิดพลาดในการตรวจสอบสลิป");
    }

    setIsVerifyingSlip(false);
  };

  /**
   * เปิด file input dialog (เพราะ input แท้จริงถูกซ่อนไว้)
   */
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div style={{ marginTop: '20px', width: '100%' }}>
      {/* Hidden file input - ใช้ ref เพื่อ trigger จาก UI ที่สวยงามกว่า */}
      <input
        type="file"
        accept="image/*"
        onChange={handleSlipChange}
        disabled={isVerifyingSlip}
        ref={fileInputRef}
        style={{ display: 'none' }}
      />

      {/* 
        พื้นที่อัปโหลดสลิป (Upload Area)
        - คลิกเพื่อเลือกไฟล์
        - แสดงสถานะว่าเลือกไฟล์แล้วหรือยัง (สีเขียว = เลือกแล้ว)
      */}
      <div
        onClick={!isVerifyingSlip ? triggerFileInput : undefined}
        style={{
          border: `2px dashed ${slipFile ? '#10b981' : '#cbd5e1'}`,
          borderRadius: '12px',
          padding: '24px',
          backgroundColor: slipFile ? '#f0fdf4' : '#f8fafc',
          cursor: isVerifyingSlip ? 'not-allowed' : 'pointer',
          marginBottom: '16px',
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          minHeight: '120px'
        }}
      >
        {/* ไอคอนกลาง - เปลี่ยนเป็น checkmark เมื่อเลือกไฟล์แล้ว */}
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: slipFile ? '#d1fae5' : '#e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: slipFile ? '#10b981' : '#64748b'
        }}>
          {slipFile ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          )}
        </div>

        {/* ข้อความแสดงสถานะและคำแนะนำ */}
        <div style={{ textAlign: 'center' }}>
          <span style={{ display: 'block', fontSize: '15px', color: '#1e293b', fontWeight: '500', marginBottom: '4px' }}>
            {slipFile ? "เลือกสลิปเรียบร้อย" : "แตะเพื่ออัปโหลดสลิป"}
          </span>
          <span style={{ display: 'block', fontSize: '13px', color: slipFile ? '#166534' : '#64748b' }}>
            {slipFile ? slipFile.name : "รองรับไฟล์ภาพ JPG, PNG"}
          </span>
        </div>
      </div>

      {/* 
        ปุ่มยืนยันการชำระเงิน
        - Disabled ถ้ายังไม่ได้เลือกไฟล์หรือกำลังตรวจสอบอยู่
        - แสดง spinner animation เมื่อกำลังตรวจสอบ
      */}
      <button
        className="confirm-button"
        onClick={handleUploadSlipAndVerify}
        disabled={!slipFile || isVerifyingSlip}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '10px',
          border: 'none',
          backgroundColor: (!slipFile || isVerifyingSlip) ? '#cbd5e1' : '#2563eb',
          color: 'white',
          fontWeight: '600',
          fontSize: '16px',
          cursor: (!slipFile || isVerifyingSlip) ? 'not-allowed' : 'pointer',
          boxShadow: (!slipFile || isVerifyingSlip) ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.3)',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        {isVerifyingSlip ? (
          <>
            {/* Loading spinner */}
            <div className="spinner" style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            กำลังตรวจสอบ...
          </>
        ) : (
          <>
            ยืนยันการชำระเงิน
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </>
        )}
      </button>

      {/* 
        แสดงสถานะการชำระเงิน (Payment Status)
        - success: สีเขียว - การชำระเงินสำเร็จ
        - pending: สีน้ำเงิน - กำลังตรวจสอบ
        - failed: สีแดง - ล้มเหลว
      */}
      {paymentStatus && (
        <div className="payment-status" style={{
          marginTop: '16px',
          padding: '12px',
          borderRadius: '8px',
          fontSize: '14px',
          textAlign: 'center',
          backgroundColor: paymentStatus === 'success' ? '#dcfce7' : paymentStatus === 'pending' ? '#eff6ff' : '#fee2e2',
          color: paymentStatus === 'success' ? '#166534' : paymentStatus === 'pending' ? '#1e40af' : '#b91c1c',
          border: `1px solid ${paymentStatus === 'success' ? '#bbf7d0' : paymentStatus === 'pending' ? '#dbeafe' : '#fecaca'}`
        }}>
          {paymentStatus === "success" ? (
            <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>
              การชำระเงินสำเร็จ!
            </p>
          ) : paymentStatus === "pending" ? (
            <p>กำลังตรวจสอบการชำระเงิน...</p>
          ) : (
            <p>การชำระเงินล้มเหลว หรือสลิปไม่ถูกต้อง</p>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default SlipUpload;
