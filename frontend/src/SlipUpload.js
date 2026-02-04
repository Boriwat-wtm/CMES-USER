import React, { useState } from "react";
import axios from "axios";
import API_BASE_URL from "./config/apiConfig";

function SlipUpload({ price, onSuccess }) {
  const [slipFile, setSlipFile] = useState(null);
  const [isVerifyingSlip, setIsVerifyingSlip] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);

  const handleSlipChange = (e) => {
    setSlipFile(e.target.files[0]);
  };

  const handleVerify = () => {
    if (!slipFile) return;
    // จำลอง / หรือหลังตรวจสำเร็จจริง
    console.log("[SlipUpload] verification success");
    onSuccess && onSuccess(); // สำคัญ
  };

  const handleUploadSlipAndVerify = async () => {
    if (!slipFile) {
      alert("กรุณาเลือกไฟล์สลิปก่อน");
      return;
    }
    setIsVerifyingSlip(true);
    setPaymentStatus("pending");
    const formData = new FormData();
    formData.append("slip", slipFile);
    formData.append("amount", price);

    try {
      const response = await axios.post(`${API_BASE_URL}/verify-slip`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (response.data.success) {
        setPaymentStatus("success");
        console.log("[SlipUpload] verification success, calling onSuccess");
        onSuccess && onSuccess();
      } else {
        setPaymentStatus("failed");
        alert(response.data.message || "สลิปไม่ถูกต้องหรือจำนวนเงินไม่ตรง");
      }
    } catch (error) {
      setPaymentStatus("failed");
      alert("เกิดข้อผิดพลาดในการตรวจสอบสลิป");
    }
    setIsVerifyingSlip(false);
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleSlipChange}
        disabled={isVerifyingSlip}
      />
      <button
        className="confirm-button"
        onClick={handleUploadSlipAndVerify}
        disabled={!slipFile || isVerifyingSlip}
      >
        {isVerifyingSlip ? "กำลังตรวจสอบ..." : "อัปโหลดและตรวจสอบสลิป"}
      </button>
      {paymentStatus && (
        <div className="payment-status">
          {paymentStatus === "success" ? (
            <p>การชำระเงินสำเร็จ!</p>
          ) : paymentStatus === "pending" ? (
            <p>กำลังตรวจสอบการชำระเงิน...</p>
          ) : (
            <p>การชำระเงินล้มเหลว</p>
          )}
        </div>
      )}
    </div>
  );
}

export default SlipUpload;
