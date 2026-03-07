// นำเข้า React และ hooks ต่างๆ สำหรับจัดการ state และ lifecycle
import React, { useState, useEffect, useRef, useCallback } from "react";
// นำเข้า routing tools สำหรับการนำทางและลิงก์
import { useNavigate, Link } from "react-router-dom";
// นำเข้า API base URL สำหรับเชื่อมต่อกับ backend
import API_BASE_URL, { ADMIN_API_URL, REALTIME_URL } from "../config/apiConfig";
// นำเข้า socket.io สำหรับการสื่อสาร realtime
import { io } from "socket.io-client";
// นำเข้า CSS styles
import "./Home.css";
import "../07_Report/Report.css";
// นำเข้าไอคอนสำหรับผู้ใช้ที่ไม่มีรูปโปรไฟล์
import unknownPersonIcon from "../data-icon/unknown-person-icon.png";

// สไตล์สำหรับแสดงข้อความประกาศพิเศษ (เช่น ระบบปิดบริการชั่วคราว)
const NOTICE_STYLE = {
  width: "100%",
  height: "180px",
  background: "rgba(30,41,59,0.85)",
  color: "#fff",
  fontSize: "2rem",
  fontWeight: "bold",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "18px",
};

// ฟังก์ชันแปลงตัวเลขเป็นรูปแบบเงินสกุลไทย (เช่น 1000 -> 1,000)
const formatCurrency = (value) => Number(value || 0).toLocaleString("th-TH");

// ข้อมูลประเภทคำสั่งซื้อทั้งหมด พร้อม emoji และป้ายกำกับ
const ORDER_TYPE_META = {
  image: { emoji: "🖼️", label: "รูปภาพ + ข้อความ" },
  text: { emoji: "💬", label: "ข้อความ" },
  gift: { emoji: "🎁", label: "ส่งของขวัญ" },
  birthday: { emoji: "🎂", label: "อวยพรวันเกิด" },
};

// ฟังก์ชันดึงป้ายกำกับของประเภทคำสั่งซื้อ (มี option เลือกแสดง emoji หรือไม่)
const getOrderTypeLabel = (type, options = { includeEmoji: true }) => {
  const meta = ORDER_TYPE_META[type];
  if (!meta) return "";
  return options.includeEmoji ? `${meta.emoji} ${meta.label}` : meta.label;
};

function Home() {
  // ดึง shopId จาก URL
  const shopId = new URLSearchParams(window.location.search).get("shopId") || localStorage.getItem("shopId") || "";
  console.log("[Home] shopId:", shopId);

  // ===== Navigation & Refs =====
  const navigate = useNavigate(); // สำหรับนำทางไปหน้าอื่น
  const profileMenuRef = useRef(null); // ref สำหรับเมนูโปรไฟล์ (ใช้ detect click outside)

  // ===== Modal States =====
  const [showModal, setShowModal] = useState(false); // แสดง/ซ่อน modal สถานะคำสั่งซื้อ
  const [showPerkModal, setShowPerkModal] = useState(false); // แสดง/ซ่อน modal สิทธิพิเศษ
  const [showProfileMenu, setShowProfileMenu] = useState(false); // แสดง/ซ่อน เมนูโปรไฟล์
  const [expandedOrderId, setExpandedOrderId] = useState(null); // order ที่กดดูเพิ่มเติม
  const [deletingOrderId, setDeletingOrderId] = useState(null); // order ที่กำลังลบ

  // ===== Order States =====
  const [orders, setOrders] = useState([]); // เก็บรายการคำสั่งซื้อทั้งหมด
  const [ordersStatus, setOrdersStatus] = useState({}); // เก็บสถานะของแต่ละคำสั่งซื้อ (Map: orderId -> statusObj)

  // ===== Shop Profile States =====
  const [shopProfile, setShopProfile] = useState({ name: "Digital Signage CMES", logo: null }); // ข้อมูลร้านค้าจาก Backend

  // ===== User & UI States =====
  const [statusLoading, setStatusLoading] = useState(false); // สถานะการโหลดข้อมูลคำสั่งซื้อ
  const [isLoggedIn, setIsLoggedIn] = useState(false); // เช็คว่าผู้ใช้ล็อกอินหรือไม่
  const [profileImage, setProfileImage] = useState(null); // รูปโปรไฟล์ของผู้ใช้
  const [alertMessage, setAlertMessage] = useState(""); // ข้อความแจ้งเตือนชั่วคราว
  const [isBirthday, setIsBirthday] = useState(null); // เช็คว่าวันนี้เป็นวันเกิดของผู้ใช้หรือไม่

  // ===== System Status States =====
  // สถานะการเปิด/ปิด ฟีเจอร์ต่างๆ ของระบบ
  const [status, setStatus] = useState({
    systemOn: true, // ระบบทั้งหมด
    imageOn: true, // ฟีเจอร์ส่งรูปภาพ
    textOn: true, // ฟีเจอร์ส่งข้อความ
    giftOn: true, // ฟีเจอร์ส่งของขวัญ
    birthdayOn: true, // ฟีเจอร์วันเกิด
  });
  // ===== Ranking States =====
  const [leaderboard, setLeaderboard] = useState([]); // ข้อมูล leaderboard ผู้สนับสนุนอันดับต้นๆ
  const [rankLoading, setRankLoading] = useState(true); // สถานะการโหลด leaderboard
  const [rankingType, setRankingType] = useState("alltime"); // ประเภทอันดับ: daily, monthly, alltime (รับจาก Admin)
  const [userRank, setUserRank] = useState(999); // อันดับของผู้ใช้ปัจจุบัน (default 999 ถ้าไม่มีในระบบ)
  // ===== Birthday Feature States =====
  // เก็บสถานะการมีสิทธิ์ใช้ฟีเจอร์วันเกิดฟรี (ต้องใช้จ่ายครบตามที่กำหนด)
  const [birthdayEligibility, setBirthdayEligibility] = useState({
    eligible: false, // มีสิทธิ์หรือไม่
    totalSpent: 0, // จำนวนเงินที่ใช้จ่ายไปแล้ว
    required: 100, // จำนวนเงินที่ต้องใช้เพื่อปลดล็อก
    reason: "not_checked" // เหตุผล
  });

  // ===== Premium Perks States =====
  const [perks, setPerks] = useState([
    "🎁 แสดงชื่อและโปรไฟล์บนหน้าจออันดับผู้สนับสนุน",
    "🌟 ป้าย Diamond/Gold/Silver ที่ช่วยแยกความโดดเด่น",
    "🚀 สิทธิ์เข้าถึงโปรโมชั่นหรือกิจกรรมก่อนใคร",
    "💬 ช่องทางติดต่อพิเศษสำหรับเคสเร่งด่วน"
  ]); // สิทธิพิเศษสำหรับสมาชิกพรีเมี่ยม (ดึงจาก Admin)

  // ===== Socket.IO Ref =====
  const socketRef = useRef(null); // ref สำหรับ socket connection

  // ===== ฟังก์ชันดึงสถานะของคำสั่งซื้อทั้งหมด =====
  // ใช้ useCallback เพื่อป้องกันการสร้างฟังก์ชันใหม่ทุกครั้งที่ render
  const fetchAllOrderStatuses = useCallback(async (currentOrders) => {
    if (!currentOrders || currentOrders.length === 0) return;
    setStatusLoading(true);

    const newStatuses = {};

    // ดึงสถานะแบบ parallel เพื่อความเร็ว
    await Promise.all(currentOrders.map(async (ord) => {
      if (!ord.orderId) return;
      try {
        // เรียก API จาก Admin Backend เพื่อดึงสถานะล่าสุด
        const response = await fetch(`${process.env.REACT_APP_ADMIN_API_URL || 'https://cmes-admin-server.onrender.com'}/api/order-status/${ord.orderId}?shopId=${shopId}`, {
          headers: { 'x-shop-id': shopId }
        });
        const data = await response.json();
        if (data.success) {
          newStatuses[ord.orderId] = data;
        } else {
          newStatuses[ord.orderId] = { success: false, statusText: 'ไม่พบคำสั่งซื้อ (อาจถูกลบ)' };
        }
      } catch (err) {
        console.error(`[Home] Error fetching status for ${ord.orderId}:`, err);
        newStatuses[ord.orderId] = { success: false, statusText: 'เกิดข้อผิดพลาด' };
      }
    }));

    // อัปเดตสถานะทั้งหมดพร้อมกัน
    setOrdersStatus(prev => ({ ...prev, ...newStatuses }));
    setStatusLoading(false);
  }, [shopId]);

  // ===== ฟังก์ชันโหลดคำสั่งซื้อจาก localStorage =====
  const loadOrders = useCallback(() => {
    try {
      // ลำดับความสำคัญ 1: ดึงจาก 'orders' array (รองรับหลายรายการ)
      const storedOrders = localStorage.getItem("orders");
      if (storedOrders) {
        let parsed = JSON.parse(storedOrders);
        if (Array.isArray(parsed)) {
          // กลับลำดับเพื่อแสดงรายการใหม่ที่สุดก่อน
          parsed.reverse();
          setOrders(parsed);
          fetchAllOrderStatuses(parsed);
          return;
        }
      }

      // ลำดับความสำคัญ 2: fallback ไปที่ 'order' เดี่ยว (รองรับระบบเก่า)
      const storedOrder = localStorage.getItem("order");
      if (storedOrder) {
        const parsed = JSON.parse(storedOrder);
        const singleList = [parsed];
        setOrders(singleList);
        fetchAllOrderStatuses(singleList);
      } else {
        setOrders([]);
      }

    } catch (err) {
      console.warn("[Home] Error loading orders:", err);
    }
  }, [fetchAllOrderStatuses]);

  // ===== ฟังก์ชันโหลด Leaderboard จาก Admin Backend =====
  const loadRankings = useCallback(() => {
    setRankLoading(true);
    fetch(`${ADMIN_API_URL}/api/rankings/top?type=${rankingType}&shopId=${shopId}`, {
      headers: { "x-shop-id": shopId }
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          throw new Error("FAILED");
        }
        setLeaderboard(data.ranks || []);
      })
      .catch((err) => {
        console.error("[Home] Failed to fetch rankings:", err);
      })
      .finally(() => setRankLoading(false));
  }, [rankingType, shopId]);

  // ===== useEffect: โหลดข้อมูลผู้ใช้และคำสั่งซื้อเมื่อเปิดหน้า Home =====
  useEffect(() => {
    // ฟังก์ชันตรวจสอบและดึง avatar ที่ถูกต้อง
    const getValidAvatar = () => {
      const val = localStorage.getItem("avatar");
      if (val && val !== "null" && val !== "undefined") return val;
      return null;
    };

    // เช็คสถานะการล็อกอิน
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
    setProfileImage(getValidAvatar());

    // โหลดคำสั่งซื้อทั้งหมด
    loadOrders();

    // ฟังก์ชันดึงข้อมูลโปรไฟล์ผู้ใช้จาก backend
    const fetchUserProfile = async () => {
      if (!token) return;
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/profile?shopId=${shopId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            // เก็บข้อมูลผู้ใช้ลง localStorage
            localStorage.setItem("username", data.user.username || "");
            localStorage.setItem("email", data.user.email || "");
            localStorage.setItem("birthday", data.user.birthday || "");
            if (data.user.avatar) {
              localStorage.setItem("avatar", data.user.avatar);
              setProfileImage(data.user.avatar);
            } else {
              localStorage.removeItem("avatar");
              setProfileImage(null);
            }

            // เก็บ user object ทั้งหมดสำหรับใช้ในหน้าอื่น เช่น Payment.js และ Gift.js
            localStorage.setItem("user", JSON.stringify({
              id: data.user._id || data.user.id,
              username: data.user.username || "",
              email: data.user.email || "",
              avatar: data.user.avatar || null,
              birthday: data.user.birthday || ""
            }));
          }
        }
      } catch (error) {
        console.error("[Home] Error fetching user profile:", error);
      }
    };
    fetchUserProfile();

    // ฟังก์ชันดึงข้อมุลร้านค้า (Profile)
    const fetchShopProfile = async () => {
      try {
        const response = await fetch(`${ADMIN_API_URL}/api/shop/profile?shopId=${shopId}`, {
          headers: { "x-shop-id": shopId }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.shop) {
            setShopProfile({
              name: data.shop.name || "Digital Signage CMES",
              logo: data.shop.logo || null
            });
          }
        }
      } catch (error) {
        console.error("[Home] ❌ Error fetching shop profile:", error);
      }
    };
    fetchShopProfile();

    // ฟังก์ชันดึงรายการสิทธิพิเศษ (perks) จาก Admin Backend
    const fetchPerks = async () => {
      try {
        const API_URL = ADMIN_API_URL;
        console.log("[Home] 📥 Fetching perks from:", `${API_URL}/api/config/perks?shopId=${shopId}`);
        const response = await fetch(`${API_URL}/api/config/perks?shopId=${shopId}`, {
          headers: { "x-shop-id": shopId }
        });
        if (response.ok) {
          const data = await response.json();
          console.log("[Home] 📦 Perks fetched:", data);
          if (data.success && data.perks) {
            console.log("[Home] ✅ Setting initial perks:", data.perks.length, "items");
            setPerks(data.perks);
          }
        } else {
          console.error("[Home] ❌ Failed to fetch perks, status:", response.status);
        }
      } catch (error) {
        console.error("[Home] ❌ Error fetching perks:", error);
      }
    };
    fetchPerks();

    // รับฟังการเปลี่ยนแปลงใน localStorage (เมื่อมีการอัปเดตจากแท็บอื่น)
    const handleStorageChange = () => {
      setProfileImage(getValidAvatar());
      loadOrders();
      loadRankings(); // โหลด rankings ใหม่เพื่อดึง avatar ที่อัปเดต
    };

    window.addEventListener("storage", handleStorageChange);

    // รับฟัง focus event (เมื่อผู้ใช้กลับมาที่หน้านี้)
    const handleFocus = () => {
      setProfileImage(getValidAvatar());
      loadOrders();
      loadRankings(); // โหลด rankings ใหม่เพื่อดึง avatar ที่อัปเดต
    };

    window.addEventListener("focus", handleFocus);

    // Cleanup: ลบ event listeners เมื่อ component unmount
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadOrders, loadRankings, shopId]);



  // ===== useEffect: เชื่อมต่อ Socket.IO สำหรับรับข้อมูล realtime =====
  useEffect(() => {
    // เชื่อมต่อกับ Realtime Server จาก Admin Backend
    const currentShopId = localStorage.getItem("shopId") || "";
    const socketInstance = io(REALTIME_URL, { query: { shopId: currentShopId } });
    socketRef.current = socketInstance;

    // รับฟังการอัปเดตการตั้งค่าระบบจาก Admin
    socketInstance.on("configUpdate", (newConfig) => {
      setStatus((prev) => ({
        ...prev,
        systemOn: newConfig.systemOpen ?? newConfig.systemOn ?? prev.systemOn,
        imageOn: newConfig.enableImage ?? prev.imageOn,
        textOn: newConfig.enableText ?? prev.textOn,
        giftOn: newConfig.enableGift ?? prev.giftOn,
        birthdayOn: newConfig.enableBirthday ?? prev.birthdayOn,
      }));
    });
    // รับฟังสถานะระบบจาก Admin
    socketInstance.on("status", (socketStatus) => {
      if (!socketStatus) return;
      setStatus((prev) => ({
        ...prev,
        systemOn: socketStatus.systemOpen ?? socketStatus.systemOn ?? prev.systemOn,
        imageOn: socketStatus.enableImage ?? prev.imageOn,
        textOn: socketStatus.enableText ?? prev.textOn,
        giftOn: socketStatus.enableGift ?? prev.giftOn,
        birthdayOn: socketStatus.enableBirthday ?? prev.birthdayOn,
      }));
    });

    // รับฟังการเปลี่ยนประเภทอันดับที่ Admin กำหนด (daily/monthly/alltime)
    socketInstance.on("publicRankingTypeUpdated", (data) => {
      console.log("[User] Public ranking type updated:", data.type);
      setRankingType(data.type);
    });

    // รับฟังการอัปเดตรายการสิทธิพิเศษ (perks) จาก Admin
    socketInstance.on("perksUpdated", (data) => {
      console.log("[User] 🔥 Perks updated via Socket.IO:", data.perks);
      if (data && data.perks && Array.isArray(data.perks)) {
        console.log("[User] ✅ Setting new perks:", data.perks.length, "items");
        setPerks(data.perks);
        // Force update ถ้า modal เปิดอยู่
        if (showPerkModal) {
          console.log("[User] 🔄 Perk modal is open, will re-render with new perks");
        }
      } else {
        console.warn("[User] ⚠️ Invalid perks data received:", data);
      }
    });

    // ขอข้อมูลการตั้งค่าเริ่มต้นจาก server
    socketInstance.emit("getConfig");

    // Cleanup: ตัดการเชื่อมต่อเมื่อ component unmount
    return () => socketInstance.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== useEffect: ดึงสถานะระบบล่าสุดจาก backend เมื่อเข้าหน้า Home =====
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/status?shopId=${shopId}`)
      .then((res) => res.json())
      .then((data) => {
        // อัปเดตสถานะการเปิด/ปิด ฟีเจอร์ทั้งหมด
        setStatus({
          systemOn: data.systemOpen ?? data.systemOn ?? true,
          imageOn: (data.enableImage ?? data.imageOn) ?? true,
          textOn: (data.enableText ?? data.textOn) ?? true,
          giftOn: (data.enableGift ?? data.giftOn) ?? true,
          birthdayOn: (data.enableBirthday ?? data.birthdayOn) ?? true,
        });
      })
      .catch(() => { });
  }, [shopId]);

  // ===== useEffect: โหลด Leaderboard เมื่อ rankingType เปลี่ยน =====
  useEffect(() => {
    // เรียก API ดึง leaderboard จาก Admin Backend
    loadRankings();
  }, [rankingType, loadRankings]); // Reload เมื่อ rankingType เปลี่ยน (daily/monthly/alltime)

  // ===== useEffect: คำนวณอันดับของผู้ใช้ปัจจุบันจาก leaderboard =====
  useEffect(() => {
    if (!isLoggedIn || leaderboard.length === 0) {
      setUserRank(999);
      return;
    }

    const userEmail = localStorage.getItem("email");
    if (!userEmail) {
      setUserRank(999);
      return;
    }

    // หาตำแหน่งของผู้ใช้ใน leaderboard
    const userIndex = leaderboard.findIndex(entry => entry.email === userEmail);
    if (userIndex === -1) {
      setUserRank(999); // ไม่พบ user ในระบบ
    } else {
      setUserRank(userIndex + 1); // อันดับเริ่มจาก 1
    }
  }, [leaderboard, isLoggedIn]);

  // ===== useEffect: ตรวจสอบว่าวันนี้เป็นวันเกิดของผู้ใช้หรือไม่ =====
  useEffect(() => {
    if (!isLoggedIn) {
      setIsBirthday(null);
      return;
    }
    const birthday = localStorage.getItem("birthday");
    if (!birthday) {
      setIsBirthday(false);
      return;
    }
    // แยกวันและเดือนจากรูปแบบ "DD/MM/YYYY" หรือ "DD/MM"
    const [day, month] = birthday.split("/").map((part) => parseInt(part, 10));
    if (!day || !month) {
      setIsBirthday(false);
      return;
    }
    // เปรียบเทียบกับวันที่ปัจจุบัน
    const today = new Date();
    setIsBirthday(day === today.getDate() && month === today.getMonth() + 1);
  }, [isLoggedIn]);

  // ===== useEffect: ตรวจสอบสิทธิ์ใช้ฟีเจอร์วันเกิด (ต้องใช้จ่ายครบตามที่กำหนด) =====
  useEffect(() => {
    if (!isLoggedIn) {
      setBirthdayEligibility({
        eligible: false,
        totalSpent: 0,
        required: 100,
        reason: "not_logged_in"
      });
      return;
    }

    const email = localStorage.getItem("email");
    if (!email) {
      setBirthdayEligibility({
        eligible: false,
        totalSpent: 0,
        required: 100,
        reason: "no_email"
      });
      return;
    }

    // ดึงข้อมูลสิทธิ์จาก Admin Backend โดยใช้ email
    const encodedEmail = encodeURIComponent(email);
    fetch(`${process.env.REACT_APP_ADMIN_API_URL || 'https://cmes-admin-server.onrender.com'}/api/birthday-eligibility/${encodedEmail}?shopId=${shopId}`, {
      headers: { 'x-shop-id': shopId }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setBirthdayEligibility({
            eligible: data.eligible, // มีสิทธิ์หรือไม่
            totalSpent: data.totalSpent || 0, // ยอดใช้จ่ายสะสม
            required: data.required || 100, // ยอดที่ต้องใช้จ่าย
            reason: data.reason || "unknown" // เหตุผล
          });
        }
      })
      .catch(err => {
        console.error("[Home] Failed to check birthday eligibility:", err);
      });
  }, [isLoggedIn]);

  // ===== useEffect: ปิดเมนูโปรไฟล์เมื่อคลิกนอกเมนู =====
  useEffect(() => {
    if (!showProfileMenu) return;
    const handleClickOutside = (event) => {
      // ถ้าคลิกนอก profileMenu ให้ปิดเมนู
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showProfileMenu]);

  // ===== useEffect: ซ่อนข้อความแจ้งเตือนอัตโนมัติหลัง 3 วินาที =====
  useEffect(() => {
    if (!alertMessage) return;
    const timeout = setTimeout(() => setAlertMessage(""), 3000);
    return () => clearTimeout(timeout);
  }, [alertMessage]);

  // ===== Handler Functions =====
  // นำทางไปหน้าเลือกบริการ (image, text, birthday)
  const handleSelect = (type) => navigate(`/select?type=${type}&shopId=${shopId}`);
  // นำทางไปหน้าส่งของขวัญ
  const handleGift = () => navigate(`/gift?shopId=${shopId}`);

  // เปิด modal ตรวจสอบสถานะคำสั่งซื้อ
  const handleCheckStatus = () => {
    setShowModal(true);
    if (orders.length > 0) {
      fetchAllOrderStatuses(orders);
    }
  };

  // ปิด modal สถานะคำสั่งซื้อ
  const handleCloseModal = () => {
    setShowModal(false);
  };

  // ออกจากระบบ (ล้าง localStorage และ reload หน้า)
  const handleLogout = () => {
    localStorage.clear();
    setShowProfileMenu(false);
    navigate("/");
    window.location.reload();
  };

  // ลบรายการ order (ทุกสถานะ)
  const handleDeleteOrder = async (orderId) => {
    if (!orderId || deletingOrderId) return;
    if (!window.confirm('ต้องการลบรายการนี้หรือไม่?')) return;
    setDeletingOrderId(orderId);
    try {
      const stat = ordersStatus[orderId];
      // pending: ลบจาก Admin Queue + localStorage
      if (stat?.status === 'pending') {
        try {
          await fetch(`${ADMIN_API_URL}/api/user-delete-order/${orderId}?shopId=${shopId}`, {
            method: 'DELETE',
            headers: { 'x-shop-id': shopId }
          });
        } catch (e) {
          console.warn('[Home] Admin delete failed (may already be processed):', e);
        }
      }
      // ลบจาก localStorage ทุกสถานะ
      const stored = JSON.parse(localStorage.getItem('orders') || '[]');
      const filtered = stored.filter(o => o.orderId !== orderId);
      localStorage.setItem('orders', JSON.stringify(filtered));
      setOrders(prev => prev.filter(o => o.orderId !== orderId));
      setOrdersStatus(prev => { const n = { ...prev }; delete n[orderId]; return n; });
      setAlertMessage('✅ ลบรายการสำเร็จ');
    } catch (err) {
      console.error('[Home] Delete order error:', err);
      setAlertMessage('❌ เกิดข้อผิดพลาดในการลบ');
    } finally {
      setDeletingOrderId(null);
    }
  };

  // ลบรายการทั้งหมด
  const handleDeleteAllOrders = async () => {
    if (!window.confirm(`ต้องการลบรายการทั้งหมด (${orders.length} รายการ) หรือไม่?`)) return;
    setDeletingOrderId('all');
    try {
      // ลบ pending ออกจาก Admin Queue ด้วย
      const pendingOrders = orders.filter(o => ordersStatus[o.orderId]?.status === 'pending');
      await Promise.all(pendingOrders.map(o =>
        fetch(`${ADMIN_API_URL}/api/user-delete-order/${o.orderId}?shopId=${shopId}`, {
          method: 'DELETE',
          headers: { 'x-shop-id': shopId }
        }).catch(() => {}) // ignore errors
      ));
      // ล้าง localStorage ทั้งหมด
      localStorage.setItem('orders', '[]');
      localStorage.removeItem('order');
      setOrders([]);
      setOrdersStatus({});
      setAlertMessage('✅ ลบรายการทั้งหมดสำเร็จ');
    } catch (err) {
      console.error('[Home] Delete all orders error:', err);
      setAlertMessage('❌ เกิดข้อผิดพลาด');
    } finally {
      setDeletingOrderId(null);
    }
  };

  // format เวลาแบบไทย (รวมวินาที)
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'medium' });
  };
  // จัดการคลิกการ์ดวันเกิด (ตรวจสอบเงื่อนไขต่างๆ ก่อนอนุญาต)
  const handleBirthdayCardClick = () => {
    // เงื่อนไขที่ 1: ต้องล็อกอินก่อน
    if (!isLoggedIn) {
      setAlertMessage("เข้าสู่ระบบเพื่อรับสิทธิ์วันเกิดฟรี");
      return;
    }

    // เงื่อนไขที่ 2: ต้องใช้จ่ายครบตามที่กำหนด
    if (!birthdayEligibility.eligible) {
      const remaining = birthdayEligibility.required - birthdayEligibility.totalSpent;
      setAlertMessage(`ต้องใช้จ่ายอีก ${remaining.toLocaleString()} บาท เพื่อปลดล็อกฟีเจอร์วันเกิด`);
      return;
    }

    // เงื่อนไขที่ 3: ต้องเป็นวันเกิดจริงๆ
    if (isBirthday === false) {
      setAlertMessage(`คุณใช้จ่ายครบแล้ว! รอถึงวันเกิดของคุณเพื่อใช้งานฟรี 🎂`);
      return;
    }

    // ผ่านทุกเงื่อนไข ให้ไปหน้าเลือกบริการวันเกิด
    if (isBirthday) navigate(`/select?type=birthday&shopId=${shopId}`);
  };

  // weeklyTotal: สำรองไว้ใช้ในอนาคต (ยอดรวม leaderboard)
  // const weeklyTotal = useMemo(() => leaderboard.reduce((sum, entry) => sum + Number(entry.points || 0), 0), [leaderboard]);

  // ฟังก์ชันสร้าง element ข้อความประกาศ
  const renderNotice = (message) => <div style={NOTICE_STYLE}>{message}</div>;

  // ตรวจสอบสถานะเพื่อแสดงข้อความประกาศที่เหมาะสม
  const inactiveImageAndText = !status.imageOn && !status.textOn; // ฟีเจอร์รูป+ข้อความปิดทั้งคู่
  const showGiftOnlyNotice = inactiveImageAndText && status.giftOn; // เหลือแค่ของขวัญ
  const showAllDisabledNotice = inactiveImageAndText && !status.giftOn; // ปิดทุกอย่าง

  // ===== ข้อมูลการ์ดบริการทั้งหมด =====
  const serviceCards = [
    {
      key: "image",
      enabled: status.imageOn,
      className: "image-service",
      badge: "ภาพ + ข้อความ",
      title: "ส่งรูปขึ้นจอ",
      description: "อัปโหลดรูปภาพพร้อมข้อความแสดงบนหน้าจอดิจิทัล",
      features: ["📸 รองรับ JPG, PNG", "💬 เพิ่มข้อความได้", "🎨 เลือกสีข้อความ"],
      price: "เริ่มต้น 1 บาท",
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      ),
      onClick: () => handleSelect("image"),
    },
    {
      key: "text",
      enabled: status.textOn,
      className: "text-service",
      badge: "ข้อความ",
      title: "ส่งข้อความขึ้นจอ",
      description: "ส่งข้อความประกาศหรือโฆษณาแสดงบนหน้าจอดิจิทัล",
      features: ["✏️ ข้อความ 36 ตัวอักษร", "🎨 เลือกสีข้อความ", "⚡ ง่ายและรวดเร็ว"],
      price: "เริ่มต้น 1 บาท",
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14,2 14,8 20,8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
      ),
      onClick: () => handleSelect("text"),
    },
    {
      key: "gift",
      enabled: status.giftOn,
      className: "gift-service",
      badge: "Gift",
      title: "ส่งของขวัญ",
      description: "เลือกสินค้าได้หลายรายการและระบุโต๊ะปลายทาง",
      features: ["🎁 สินค้าหลายแบบ", "🪑 ระบุเลขโต๊ะ"],
      price: "ราคาตามสินค้าที่เลือก",
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M12 7v14" />
          <path d="M5 7c0-1.657 1.567-3 3.5-3S12 5.343 12 7" />
          <path d="M12 7c0-1.657 1.567-3 3.5-3S19 5.343 19 7" />
        </svg>
      ),
      onClick: handleGift,
    },
  ];

  // ===== JSX Return: แสดงหน้า UI =====
  return (
    <div className="home-container">
      {/* องค์ประกอบพื้นหลังลอยตัว */}
      <div className="floating-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      <div className="home-wrapper">
        {/* ===== Header: ส่วนหัวของเว็บ ===== */}
        <header className="home-header">
          {/* Logo และชื่อเว็บไซต์ */}
          <div className="header-brand">
            <div
              className="brand-icon"
              style={shopProfile.logo ? {
                borderRadius: '50%',
                background: 'transparent',
                padding: 0,
                border: '2px solid rgba(255,255,255,0.5)',
              } : {}}
            >
              {shopProfile.logo ? (
                <img
                  src={shopProfile.logo}
                  alt="Shop Logo"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              )}
            </div>
            <div className="brand-text">
              <h1 style={{ fontSize: '1.2rem', marginBottom: '2px' }}>{shopProfile.name}</h1>
              <p>Digital Signage System</p>
            </div>
          </div>

          {/* เมนูนำทาง: ล็อกอิน/ลงทะเบียน หรือโปรไฟล์ */}
          <nav className="header-nav">
            {isLoggedIn ? (
              /* แสดงเมนูโปรไฟล์เมื่อล็อกอินแล้ว */
              <div className="profile-menu-wrapper">
                {/* ปุ่มโปรไฟล์ (แสดงรูปหรือไอคอน default) */}
                <button
                  className={`profile-avatar-btn ${profileImage ? "has-image" : ""}`}
                  type="button"
                  onClick={() => setShowProfileMenu((prev) => !prev)}
                  title="เลือกเมนูโปรไฟล์"
                >
                  <span className="profile-avatar-ring">
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt="รูปโปรไฟล์"
                        className="profile-avatar-image"
                        onError={(e) => {
                          e.target.onerror = null; // prevent loop
                          setProfileImage(null);
                        }}
                      />
                    ) : (
                      <svg
                        className="profile-avatar-icon"
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    )}
                  </span>
                </button>
                {/* Dropdown menu โปรไฟล์ */}
                {showProfileMenu && (
                  <div
                    ref={profileMenuRef}
                    style={{
                      position: "absolute",
                      top: "56px",
                      right: 0,
                      background: "#fff",
                      borderRadius: "14px",
                      boxShadow: "0 12px 30px rgba(15,23,42,0.18)",
                      minWidth: "220px",
                      overflow: "hidden",
                      zIndex: 20,
                    }}
                  >
                    {/* ส่วนหัว dropdown: แสดงชื่อและ email */}
                    <div
                      style={{
                        padding: "16px",
                        background: "linear-gradient(135deg, #667eea, #764ba2)",
                        color: "#fff",
                      }}
                    >
                      <div style={{ fontSize: "14px", fontWeight: 600 }}>
                        {localStorage.getItem("username") || "ผู้ใช้"}
                      </div>
                      <div style={{ fontSize: "12px", opacity: 0.9 }}>
                        {localStorage.getItem("email") || "user@example.com"}
                      </div>
                    </div>
                    {/* รายการเมนู: แก้ไข, รายงาน, ออกจากระบบ */}
                    {[
                      {
                        label: "แก้ไขโปรไฟล์",
                        icon: (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        ),
                        action: () => navigate(`/profile?shopId=${shopId}`),
                        danger: false,
                      },
                      {
                        label: "รายงานปัญหา",
                        icon: (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                        ),
                        action: () => navigate(`/report?shopId=${shopId}`),
                        danger: false,
                      },
                      {
                        label: "ออกจากระบบ",
                        icon: (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                          </svg>
                        ),
                        action: handleLogout,
                        danger: true,
                      },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={() => {
                          item.action();
                          setShowProfileMenu(false);
                        }}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "12px 16px",
                          border: "none",
                          background: "#fff",
                          cursor: "pointer",
                          color: item.danger ? "#ef4444" : "#1f2937",
                          borderTop: "1px solid #f1f5f9",
                          fontSize: "14px",
                        }}
                      >
                        {item.icon}
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* ปุ่ม Sign In / Sign Up เมื่อยังไม่ได้ล็อกอิน */
              <div className="auth-buttons">
                <Link to="/signin" className="nav-btn signin-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10,17 15,12 10,7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                  Sign In
                </Link>
                <Link to="/signup" className="nav-btn signup-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="14" />
                    <line x1="23" y1="11" x2="17" y2="11" />
                  </svg>
                  Sign Up
                </Link>
              </div>
            )}
          </nav>
        </header>

        {/* ===== Main Content: ส่วนเนื้อหาหลัก ===== */}
        <main className="home-main">
          {/* ส่วน Hero: หัวเรื่องและ VIP Panel */}
          <div className="hero-section">
            {/* ข้อความต้อนรับ */}
            <div className="hero-content">
              <div className="hero-badge">
                <span className="badge-dot"></span>
                <span>ระบบแสดงผลดิจิทัล</span>
              </div>
              <h2>แชร์เนื้อหาของคุณสู่หน้าจอ</h2>
              <p>เลือกส่งรูปภาพหรือข้อความไปแสดงบนหน้าจอดิจิทัลได้ง่ายๆ</p>
            </div>
            {/* แผง VIP Supporters: แสดง leaderboard และอันดับของผู้ใช้ */}
            <div className="rank-panel premium">
              <div className="rank-panel-header">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: '800', lineHeight: '1.2' }}>VIP Supporters Club</span>
                  <small style={{ fontSize: '0.85rem', opacity: 0.9, fontWeight: '400' }}>
                    {rankingType === "daily" && "อันดับรายวัน"}
                    {rankingType === "monthly" && "อันดับรายเดือน"}
                    {rankingType === "alltime" && "อันดับตลอดกาล"}
                    {" • "}สะสมยอดสนับสนุนเพื่อปลดล็อกสิทธิพิเศษ
                  </small>
                </div>
                <div className="rank-total">
                  <label>{isLoggedIn ? "อันดับของคุณ" : "เข้าสู่ระบบเพื่อดูอันดับ"}</label>
                  <strong style={{ fontSize: '28px', fontWeight: '800' }}>#{userRank.toString().padStart(2, '0')}</strong>
                </div>
              </div>
              {/* เนื้อหาแผง: แสดง Top 3 Supporters */}
              <div className="rank-panel-body">
                {rankLoading ? (
                  <span className="rank-empty">กำลังโหลด...</span>
                ) : (
                  /* สร้างการ์ดสำหรับ Top 3 */
                  Array.from({ length: 3 }).map((_, index) => {
                    const entry = leaderboard[index];

                    // ดึงคะแนนตามประเภทอันดับ (daily/monthly/alltime)
                    let points = 0;
                    if (entry) {
                      if (rankingType === "daily") points = entry.dailyPoints || 0;
                      else if (rankingType === "monthly") points = entry.monthlyPoints || 0;
                      else points = entry.points || 0;
                    }

                    return (
                      /* การ์ดแสดงอันดับ (Diamond/Gold/Silver) */
                      <div
                        key={entry ? (entry.name || index) : `unknown-${index}`}
                        className={`rank-card tier-${index + 1} position-${index + 1}`}
                      >
                        <div className="rank-profile">
                          <img
                            src={entry?.avatar || unknownPersonIcon}
                            alt={entry?.name || `Unknown`}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = unknownPersonIcon;
                            }}
                          />
                          <div className="rank-index">#{index + 1}</div>
                        </div>
                        <div className="rank-details">
                          <strong>{entry ? entry.name : "Unknown"}</strong>
                          <span>฿{formatCurrency(points)}</span>
                        </div>
                        <div className="rank-badge">{index === 0 ? "Diamond" : index === 1 ? "Gold" : "Silver"}</div>
                      </div>
                    );
                  })
                )}
              </div>
              {/* ปุ่มดูสิทธิพิเศษ */}
              <button className="rank-cta" onClick={() => setShowPerkModal(true)}>ดูสิทธิพิเศษสำหรับพรีเมี่ยม</button>
            </div>
          </div>

          {/* ===== ส่วนการ์ดบริการ (Service Cards) ===== */}
          <div className="service-cards">
            {status.systemOn ? (
              <>
                {/* การ์ดบริการ Image, Text, Gift (กรองตามสถานะ) */}
                {serviceCards
                  .filter((card) => card.enabled)
                  .map((card) => (
                    <div key={card.key} className={`service-card ${card.className}`} onClick={card.onClick}>
                      <div className="card-header">
                        <div className="service-icon">{card.icon}</div>
                        <div className="service-badge">{card.badge}</div>
                      </div>
                      <div className="card-content">
                        <h3>{card.title}</h3>
                        <p>{card.description}</p>
                        <div className="card-features">
                          {card.features.map((feature) => (
                            <span key={feature} className="feature">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="card-footer">
                        <span className="price-from">{card.price}</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  ))}

                {/* การ์ดพิเศษวันเกิด (แสดงต่างหากเปิดใช้งาน) */}
                {status.birthdayOn && (
                  <div
                    className="service-card birthday-service"
                    onClick={handleBirthdayCardClick}
                    style={{
                      cursor: !isLoggedIn || isBirthday === false || !birthdayEligibility.eligible ? "not-allowed" : "pointer",
                      pointerEvents: !isLoggedIn || isBirthday === false || !birthdayEligibility.eligible ? "none" : "auto",
                      background:
                        !isLoggedIn || isBirthday === false || !birthdayEligibility.eligible
                          ? "linear-gradient(90deg, #cbd5e1, #94a3b8)"
                          : "linear-gradient(90deg, #fbbf24, #f472b6)",
                      color: "#fff",
                      opacity: !isLoggedIn || isBirthday === false || !birthdayEligibility.eligible ? 0.7 : 1,
                    }}
                  >
                    <div className="card-header">
                      <div className="service-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                      </div>
                      <div className="service-badge">วันเกิด</div>
                    </div>
                    <div className="card-content">
                      <h3>อวยพรวันเกิด</h3>
                      <p>
                        อัปโหลดรูปภาพพร้อมข้อความแสดงบนหน้าจอดิจิทัล
                        {isLoggedIn && birthdayEligibility.eligible && isBirthday && " (ฟรีในวันเกิดของคุณ!)"}
                      </p>
                      <div className="card-features">
                        {isLoggedIn && !birthdayEligibility.eligible ? (
                          <>
                            <span className="feature">💰 ใช้จ่ายแล้ว ฿{birthdayEligibility.totalSpent.toLocaleString()}</span>
                            <span className="feature">🎯 ต้องใช้ครบ ฿{birthdayEligibility.required.toLocaleString()}</span>
                            <span className="feature">📈 เหลืออีก ฿{(birthdayEligibility.required - birthdayEligibility.totalSpent).toLocaleString()}</span>
                          </>
                        ) : isLoggedIn && birthdayEligibility.eligible && !isBirthday ? (
                          <>
                            <span className="feature">✅ ใช้จ่ายครบแล้ว ฿{birthdayEligibility.totalSpent.toLocaleString()}</span>
                            <span className="feature">🎂 รอวันเกิดเพื่อใช้งานฟรี</span>
                            <span className="feature">📸 รองรับ JPG, PNG</span>
                          </>
                        ) : (
                          <>
                            <span className="feature">🎉 สิทธิ์ฟรีสำหรับเจ้าของวันเกิด</span>
                            <span className="feature">📸 รองรับ JPG, PNG</span>
                            <span className="feature">💬 เพิ่มข้อความได้</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="card-footer">
                      <span className="price-from">
                        {!isLoggedIn
                          ? "เข้าสู่ระบบเพื่อรับสิทธิ์"
                          : !birthdayEligibility.eligible
                            ? `ใช้จ่ายครบ ฿${birthdayEligibility.required.toLocaleString()} เพื่อปลดล็อก`
                            : isBirthday
                              ? "✨ พร้อมใช้งาน - ฟรีในวันเกิด!"
                              : "✅ พร้อมแล้ว - รอวันเกิดของคุณ"}
                      </span>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* ข้อความแจ้งเตือนเมื่อฟีเจอร์บางอย่างปิด */}
                {showGiftOnlyNotice && renderNotice("ฟังก์ชันส่งรูป/ข้อความปิดชั่วคราว • ยังสามารถส่งของขวัญได้")}
                {showAllDisabledNotice && renderNotice("ขณะนี้ฟังก์ชันการส่งทั้งหมดปิดใช้งานชั่วคราว")}
              </>
            ) : (
              /* ข้อความแจ้งเตือนเมื่อระบบปิดทั้งหมด */
              renderNotice("ขณะนี้ระบบปิดให้บริการชั่วคราว")
            )}
          </div>

          {/* ===== ข้อความแจ้งเตือนชั่วคราว (Toast Notification) ===== */}
          {alertMessage && (
            <div
              style={{
                position: "fixed",
                top: "20px",
                right: "20px",
                background: "#f43f5e",
                color: "#fff",
                padding: "12px 20px",
                borderRadius: "999px",
                boxShadow: "0 10px 30px rgba(190,24,93,0.3)",
                zIndex: 50,
                fontWeight: 600,
              }}
            >
              {alertMessage}
            </div>
          )}

          {/* ===== ส่วนแสดงสถานะคำสั่งซื้อ ===== */}
          <div className="status-section">
            <div className="status-card">
              <div className="status-header">
                <div className="status-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                    <line x1="9" y1="9" x2="9.01" y2="9" />
                    <line x1="15" y1="9" x2="15.01" y2="9" />
                  </svg>
                </div>
                <h3>สถานะการแสดงผล</h3>
              </div>

              <div className="status-content">
                {orders.length > 0 ? (
                  /* แสดงรายการคำสั่งซื้อล่าสุด (สูงสุด 3 รายการ) */
                  <div className="orders-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {orders.slice(0, 3).map((ord) => {
                      const stat = ordersStatus[ord.orderId]; // สถานะของคำสั่งซื้อแต่ละรายการ
                      return (
                        <div key={ord.orderId || Math.random()} className="order-item-compact" style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px',
                          background: '#f8fafc',
                          borderRadius: '12px',
                          border: '1px solid #f1f5f9'
                        }}>
                          <div className="order-details" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>{getOrderTypeLabel(ord.type)}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                              {ord.type === "gift" ? `โต๊ะ #${ord.tableNumber}` : (ord.price === 0 ? 'ฟรี' : `฿${ord.price}`)}
                            </div>
                          </div>
                          <div className="queue-number">
                            <span className="queue-value" style={{
                              background: stat?.status === 'rejected' ? '#fee2e2' :
                                stat?.status === 'pending' ? '#fef3c7' :
                                  stat?.status === 'playing' ? '#e0f2fe' :
                                    stat?.status === 'approved' ? '#dbeafe' :
                                      stat?.status === 'completed' ? '#d1fae5' : '#f3f4f6',
                              color: stat?.status === 'rejected' ? '#ef4444' :
                                stat?.status === 'pending' ? '#f59e0b' :
                                  stat?.status === 'playing' ? '#0ea5e9' :
                                    stat?.status === 'approved' ? '#3b82f6' :
                                      stat?.status === 'completed' ? '#10b981' : '#6b7280',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}>
                              {stat?.statusText || '...'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {/* แสดงจำนวนคำสั่งซื้อที่เหลือ (ถ้ามีมากกว่า 3) */}
                    {orders.length > 3 && (
                      <div style={{ textAlign: 'center', fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
                        +{orders.length - 3} รายการอื่นๆ
                      </div>
                    )}
                  </div>
                ) : (
                  /* แสดงเมื่อยังไม่มีคำสั่งซื้อ */
                  <div className="no-order">
                    <span className="no-order-icon">📋</span>
                    <span>ยังไม่มีการสั่งซื้อ</span>
                  </div>
                )}
              </div>

              {/* ปุ่มตรวจสอบสถานะ (เปิด modal) */}
              <button className="status-btn" onClick={handleCheckStatus}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                ตรวจสอบสถานะ
              </button>
            </div>
          </div>
        </main>

        {/* ===== Footer ===== */}
        <footer className="home-footer">
          <div className="footer-content">
            <p>&copy; 2025 Digital Signage Content Management System</p>
            <div className="footer-links">
              <a href="#privacy">นโยบายความเป็นส่วนตัว</a>
              <a href="#terms">ข้อกำหนดการใช้งาน</a>
            </div>
          </div>
        </footer>

        {/* ===== Modal: รายละเอียดสถานะคำสั่งซื้อทั้งหมด ===== */}
        {showModal && (
          <div className="modal-overlay" onClick={handleCloseModal}>
            <div className="modal-content status-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>รายละเอียดคำสั่งซื้อ ({orders.length})</h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {orders.length > 0 && (
                    <button
                      onClick={handleDeleteAllOrders}
                      disabled={deletingOrderId === 'all'}
                      style={{
                        background: 'none', border: '1px solid #fecaca', borderRadius: '8px',
                        color: '#ef4444', padding: '6px 12px', fontSize: '12px', fontWeight: '600',
                        cursor: deletingOrderId === 'all' ? 'not-allowed' : 'pointer',
                        opacity: deletingOrderId === 'all' ? 0.5 : 1, whiteSpace: 'nowrap'
                      }}
                    >
                      {deletingOrderId === 'all' ? 'กำลังลบ...' : '🗑️ ลบทั้งหมด'}
                    </button>
                  )}
                  {/* ปุ่มปิด modal */}
                  <button className="close-button" onClick={handleCloseModal}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="modal-body">
                {statusLoading ? (
                  /* สถานะกำลังโหลด */
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
                    <p>กำลังตรวจสอบสถานะ...</p>
                  </div>
                ) : orders.length > 0 ? (
                  /* รายการคำสั่งซื้อทั้งหมด */
                  <div className="order-summary-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {orders.map((ord, index) => {
                      const stat = ordersStatus[ord.orderId];
                      const isExpanded = expandedOrderId === ord.orderId;
                      const isPending = stat?.status === 'pending';
                      const statusColor = stat?.status === 'rejected' ? '#ef4444' :
                        stat?.status === 'pending' ? '#f59e0b' :
                          stat?.status === 'playing' ? '#0ea5e9' :
                            stat?.status === 'approved' ? '#3b82f6' :
                              stat?.status === 'completed' ? '#10b981' : '#6b7280';
                      const statusBg = stat?.status === 'rejected' ? '#fee2e2' :
                        stat?.status === 'pending' ? '#fef3c7' :
                          stat?.status === 'playing' ? '#e0f2fe' :
                            stat?.status === 'approved' ? '#dbeafe' :
                              stat?.status === 'completed' ? '#d1fae5' : '#f3f4f6';

                      return (
                        <div key={ord.orderId || index} style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                          {/* ===== ส่วน Compact (แสดงเสมอ) ===== */}
                          <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                            onClick={() => setExpandedOrderId(isExpanded ? null : ord.orderId)}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
                                รายการที่ {orders.length - index} • {getOrderTypeLabel(ord.type)}
                              </div>
                              <div style={{ fontSize: '13px', color: '#64748b' }}>
                                ราคา: {ord.price === 0 ? 'ฟรี' : `฿${ord.price}`}
                                {ord.type === 'gift' && ord.tableNumber ? ` • โต๊ะ #${ord.tableNumber}` : ''}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                background: statusBg, color: statusColor, padding: '5px 12px',
                                borderRadius: '8px', fontSize: '12px', fontWeight: '700'
                              }}>
                                {stat?.statusText || '...'}
                              </span>
                              <span style={{ color: '#94a3b8', fontSize: '16px', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                            </div>
                          </div>

                          {/* ===== ส่วน Expanded (กดดูเพิ่มเติม) ===== */}
                          {isExpanded && (
                            <div style={{ borderTop: '1px solid #f1f5f9', padding: '16px', background: '#f8fafc' }}>
                              {/* สถานะ */}
                              {stat && (
                                <div style={{
                                  background: statusBg, padding: '12px 16px', borderRadius: '12px', marginBottom: '12px',
                                  borderLeft: `4px solid ${statusColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                  <div>
                                    <span style={{ fontWeight: '700', color: '#334155' }}>สถานะ: </span>
                                    <span style={{ fontWeight: '700', color: statusColor }}>{stat.statusText}</span>
                                  </div>
                                </div>
                              )}

                              {/* ตำแหน่งคิว */}
                              {stat?.order?.queuePosition && (
                                <div className="summary-item">
                                  <span className="item-label">ตำแหน่งคิว:</span>
                                  <span className="item-value queue-highlight">#{stat.order.queuePosition} / {stat.order.totalQueue}</span>
                                </div>
                              )}

                              {/* เวลาแสดงโดยประมาณ */}
                              {stat?.order?.waitingForApproval ? (
                                <div className="summary-item">
                                  <span className="item-label">เวลาแสดงโดยประมาณ:</span>
                                  <span className="item-value" style={{ color: '#f59e0b', fontWeight: '600' }}>รอตรวจสอบ</span>
                                </div>
                              ) : stat?.status === 'playing' && stat?.order?.remainingSeconds !== undefined ? (
                                <div className="summary-item">
                                  <span className="item-label">เวลาคงเหลือ:</span>
                                  <span className="item-value" style={{ color: '#0ea5e9', fontWeight: '600' }}>{stat.order.remainingSeconds} วินาที</span>
                                </div>
                              ) : (
                                <>
                                  {stat?.order?.estimatedWaitSeconds !== undefined && (
                                    <div className="summary-item">
                                      <span className="item-label">เวลารอประมาณ:</span>
                                      <span className="item-value">{stat.order.estimatedWaitSeconds} วินาที</span>
                                    </div>
                                  )}
                                  {stat?.order?.estimatedStartTime && (
                                    <div className="summary-item">
                                      <span className="item-label">เวลาแสดงโดยประมาณ:</span>
                                      <span className="item-value">
                                        {new Date(stat.order.estimatedStartTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                        {' - '}
                                        {new Date(stat.order.estimatedEndTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                                      </span>
                                    </div>
                                  )}
                                </>
                              )}

                              {/* ประเภท */}
                              <div className="summary-item">
                                <span className="item-label">ประเภท:</span>
                                <span className="item-value">{getOrderTypeLabel(ord.type, { includeEmoji: false })}</span>
                              </div>

                              {/* โซเชียล (สำหรับ image + text) */}
                              {stat?.order?.socialType && stat?.order?.socialName && (
                                <div className="summary-item">
                                  <span className="item-label">โซเชียล:</span>
                                  <span className="item-value" style={{ color: '#7c3aed' }}>
                                    {stat.order.socialType === 'ig' ? '📷 IG' : stat.order.socialType === 'fb' ? '📘 FB' : stat.order.socialType === 'line' ? '💬 LINE' : stat.order.socialType === 'tiktok' ? '🎵 TikTok' : stat.order.socialType}
                                    {' : '}{stat.order.socialName}
                                  </span>
                                </div>
                              )}

                              {/* ข้อความที่พิมพ์ (สำหรับ image + text) */}
                              {(stat?.order?.text || stat?.order?.content) && (ord.type === 'image' || ord.type === 'text') && (
                                <div className="summary-item">
                                  <span className="item-label">ข้อความ:</span>
                                  <span className="item-value" style={{ wordBreak: 'break-word' }}>
                                    "{stat.order.text || stat.order.content}"
                                  </span>
                                </div>
                              )}

                              {/* โน้ตเพิ่มเติม (สำหรับ gift) */}
                              {stat?.order?.note && ord.type === 'gift' && (
                                <div className="summary-item">
                                  <span className="item-label">โน้ตเพิ่มเติม:</span>
                                  <span className="item-value" style={{ fontStyle: 'italic', wordBreak: 'break-word' }}>
                                    "{stat.order.note}"
                                  </span>
                                </div>
                              )}

                              {/* ราคา */}
                              <div className="summary-item">
                                <span className="item-label">ราคา:</span>
                                <span className="item-value price-highlight">{ord.price === 0 ? 'ฟรี' : `฿${ord.price}`}</span>
                              </div>

                              {/* ระยะเวลาแสดง */}
                              {(stat?.order?.time || stat?.order?.duration || ord.time) && (
                                <div className="summary-item">
                                  <span className="item-label">ระยะเวลาแสดง:</span>
                                  <span className="item-value">{stat?.order?.time || stat?.order?.duration || ord.time} วินาที</span>
                                </div>
                              )}

                              {/* เวลาที่ส่ง */}
                              {stat?.order?.receivedAt && (
                                <div className="summary-item">
                                  <span className="item-label">เวลาที่ส่ง:</span>
                                  <span className="item-value">{formatDateTime(stat.order.receivedAt)}</span>
                                </div>
                              )}

                              {/* เริ่มแสดง - จบการแสดง */}
                              {stat?.order?.startedAt && (
                                <div className="summary-item">
                                  <span className="item-label">เริ่มแสดง:</span>
                                  <span className="item-value">{formatDateTime(stat.order.startedAt)}</span>
                                </div>
                              )}
                              {stat?.order?.endedAt && (
                                <div className="summary-item">
                                  <span className="item-label">จบการแสดง:</span>
                                  <span className="item-value">{formatDateTime(stat.order.endedAt)}</span>
                                </div>
                              )}

                              {/* Gift: โต๊ะ + รายการ */}
                              {ord.type === "gift" && (
                                <>
                                  <div className="summary-item">
                                    <span className="item-label">โต๊ะ:</span>
                                    <span className="item-value">#{ord.tableNumber}</span>
                                  </div>
                                  {ord.giftItems && ord.giftItems.length > 0 && (
                                    <div className="summary-item">
                                      <span className="item-label">รายการ:</span>
                                      <span className="item-value gift-items-value">
                                        {ord.giftItems.map((item) => `${item.name} x${item.quantity}`).join(", ")}
                                      </span>
                                    </div>
                                  )}
                                </>
                              )}

                              {/* รูปภาพที่อัปโหลด */}
                              {stat?.order?.mediaUrl && (
                                <div style={{ marginTop: '8px' }}>
                                  <span className="item-label" style={{ display: 'block', marginBottom: '6px' }}>รูปภาพที่ส่ง:</span>
                                  <img src={stat.order.mediaUrl} alt="อัปโหลด" style={{
                                    width: '100%', maxHeight: '200px', objectFit: 'contain',
                                    borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff'
                                  }} />
                                </div>
                              )}

                              {/* ปุ่มลบรายการ (ทุกสถานะ) */}
                              <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteOrder(ord.orderId); }}
                                  disabled={deletingOrderId === ord.orderId}
                                  style={{
                                    flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #fecaca',
                                    background: '#fff', color: '#ef4444', fontWeight: '600', fontSize: '14px',
                                    cursor: deletingOrderId === ord.orderId ? 'not-allowed' : 'pointer', opacity: deletingOrderId === ord.orderId ? 0.5 : 1
                                  }}
                                >
                                  {deletingOrderId === ord.orderId ? 'กำลังลบ...' : '🗑️ ลบรายการ'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* แสดงเมื่อไม่มีคำสั่งซื้อ */
                  <div className="no-order-modal">
                    <div className="empty-state">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M8 12h8" />
                      </svg>
                      <h4>ไม่มีคำสั่งซื้อ</h4>
                      <p>คุณยังไม่มีการสั่งซื้อบริการ</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== Modal: แสดงรายการสิทธิพิเศษสำหรับสมาชิกพรีเมี่ยม ===== */}
        {showPerkModal && (
          <div className="modal-overlay" onClick={() => setShowPerkModal(false)}>
            <div className="modal-content perk-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>สิทธิพิเศษสำหรับสมาชิกพรีเมี่ยม</h3>
                {/* ปุ่มปิด modal */}
                <button className="close-button" onClick={() => setShowPerkModal(false)}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="modal-body">
                {/* รายการสิทธิพิเศษ (ดึงจาก Admin) */}
                <ul className="perk-list">
                  {perks.map((perk, index) => (
                    <li key={index}>{perk}</li>
                  ))}
                </ul>
                {/* ปุ่ม CTA เริ่มต้นสนับสนุน */}
                <button className="primary-btn perk-action" onClick={() => navigate("/select?type=image")}>เริ่มต้นสนับสนุน</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
