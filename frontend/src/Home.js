import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { io } from "socket.io-client";
import "./Home.css";

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

const formatCurrency = (value) => Number(value || 0).toLocaleString("th-TH");

const ORDER_TYPE_META = {
  image: { emoji: "🖼️", label: "รูปภาพ + ข้อความ" },
  text: { emoji: "💬", label: "ข้อความ" },
  gift: { emoji: "🎁", label: "ส่งของขวัญ" },
  birthday: { emoji: "🎂", label: "อวยพรวันเกิด" },
};

const getOrderTypeLabel = (type, options = { includeEmoji: true }) => {
  const meta = ORDER_TYPE_META[type];
  if (!meta) return "";
  return options.includeEmoji ? `${meta.emoji} ${meta.label}` : meta.label;
};

function Home() {
  const navigate = useNavigate();
  const profileMenuRef = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [showPerkModal, setShowPerkModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  // State for multiple orders
  const [orders, setOrders] = useState([]);
  const [ordersStatus, setOrdersStatus] = useState({}); // Map { orderId: statusObj }

  // Restore missing state
  const [statusLoading, setStatusLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [alertMessage, setAlertMessage] = useState("");
  const [isBirthday, setIsBirthday] = useState(null);
  const [status, setStatus] = useState({
    systemOn: true,
    imageOn: true,
    textOn: true,
    giftOn: true,
    birthdayOn: true,
  });
  const [leaderboard, setLeaderboard] = useState([]);
  const [rankLoading, setRankLoading] = useState(true);
  const [rankError, setRankError] = useState("");
  const [rankingType, setRankingType] = useState("alltime"); // PUBLIC BROADCAST STATE
  const [birthdayEligibility, setBirthdayEligibility] = useState({
    eligible: false,
    totalSpent: 0,
    required: 100,
    reason: "not_checked"
  });
  const socketRef = useRef(null);

  const fetchAllOrderStatuses = useCallback(async (currentOrders) => {
    if (!currentOrders || currentOrders.length === 0) return;
    setStatusLoading(true);

    const newStatuses = {};

    // Fetch parallel
    await Promise.all(currentOrders.map(async (ord) => {
      if (!ord.orderId) return;
      try {
        const response = await fetch(`http://localhost:5001/api/order-status/${ord.orderId}`);
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

    setOrdersStatus(prev => ({ ...prev, ...newStatuses }));
    setStatusLoading(false);
  }, []);

  const loadOrders = useCallback(() => {
    try {
      // Priority 1: 'orders' array
      const storedOrders = localStorage.getItem("orders");
      if (storedOrders) {
        let parsed = JSON.parse(storedOrders);
        if (Array.isArray(parsed)) {
          // Sort newest first if they have timestamp? Or just assume push order (oldest first).
          // Let's reverse to show newest first
          parsed.reverse();
          setOrders(parsed);
          fetchAllOrderStatuses(parsed);
          return;
        }
      }

      // Priority 2: Fallback to single 'order'
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

  useEffect(() => {
    const getValidAvatar = () => {
      const val = localStorage.getItem("avatar");
      if (val && val !== "null" && val !== "undefined") return val;
      return null;
    };
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
    setProfileImage(getValidAvatar());

    // Load orders
    loadOrders();

    const fetchUserProfile = async () => {
      if (!token) return;
      try {
        const response = await fetch("http://localhost:4000/api/auth/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
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
          }
        }
      } catch (error) {
        console.error("[Home] Error fetching user profile:", error);
      }
    };
    fetchUserProfile();

    // Listen for storage changes
    const handleStorageChange = () => {
      setProfileImage(getValidAvatar());
      loadOrders();
    };

    window.addEventListener("storage", handleStorageChange);

    // Also listen for focus event
    const handleFocus = () => {
      setProfileImage(getValidAvatar());
      loadOrders();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadOrders]);



  useEffect(() => {
    const socketInstance = io("http://localhost:4005");
    socketRef.current = socketInstance;

    socketInstance.on("configUpdate", (newConfig) => {
      setStatus((prev) => ({
        ...prev,
        systemOn: newConfig.systemOn ?? prev.systemOn,
        imageOn: newConfig.enableImage ?? prev.imageOn,
        textOn: newConfig.enableText ?? prev.textOn,
        giftOn: newConfig.enableGift ?? prev.giftOn,
        birthdayOn: newConfig.enableBirthday ?? prev.birthdayOn,
      }));
    });
    socketInstance.on("status", (socketStatus) => {
      if (!socketStatus) return;
      setStatus((prev) => ({
        ...prev,
        systemOn: socketStatus.systemOn ?? prev.systemOn,
        imageOn: socketStatus.enableImage ?? prev.imageOn,
        textOn: socketStatus.enableText ?? prev.textOn,
        giftOn: socketStatus.enableGift ?? prev.giftOn,
        birthdayOn: socketStatus.enableBirthday ?? prev.birthdayOn,
      }));
    });

    // Listen for public ranking type broadcasts from Admin
    socketInstance.on("publicRankingTypeUpdated", (data) => {
      console.log("[User] Public ranking type updated:", data.type);
      setRankingType(data.type);
    });

    socketInstance.emit("getConfig");
    return () => socketInstance.disconnect();
  }, []);

  // ดึงสถานะล่าสุดจาก backend เมื่อเข้า Home
  useEffect(() => {
    fetch("http://localhost:4000/api/status")
      .then((res) => res.json())
      .then((data) => {
        setStatus({
          systemOn: data.systemOn ?? true,
          imageOn: (data.enableImage ?? data.imageOn) ?? true,
          textOn: (data.enableText ?? data.textOn) ?? true,
          giftOn: (data.enableGift ?? data.giftOn) ?? true,
          birthdayOn: (data.enableBirthday ?? data.birthdayOn) ?? true,
        });
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    // เรียก API จาก CMES-ADMIN โดยตรง with ranking type parameter
    setRankLoading(true);
    fetch(`http://localhost:5001/api/rankings/top?type=${rankingType}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          throw new Error("FAILED");
        }
        setLeaderboard(data.ranks || []);
        setRankError("");
      })
      .catch((err) => {
        console.error("[Home] Failed to fetch rankings:", err);
        setRankError("ยังไม่มีข้อมูลอันดับ");
      })
      .finally(() => setRankLoading(false));
  }, [rankingType]); // Reload when rankingType changes

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
    const [day, month] = birthday.split("/").map((part) => parseInt(part, 10));
    if (!day || !month) {
      setIsBirthday(false);
      return;
    }
    const today = new Date();
    setIsBirthday(day === today.getDate() && month === today.getMonth() + 1);
  }, [isLoggedIn]);

  // Check birthday eligibility (spending requirement)
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

    // Fetch eligibility from admin backend using email
    const encodedEmail = encodeURIComponent(email);
    fetch(`http://localhost:5001/api/birthday-eligibility/${encodedEmail}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setBirthdayEligibility({
            eligible: data.eligible,
            totalSpent: data.totalSpent || 0,
            required: data.required || 100,
            reason: data.reason || "unknown"
          });
        }
      })
      .catch(err => {
        console.error("[Home] Failed to check birthday eligibility:", err);
      });
  }, [isLoggedIn]);

  useEffect(() => {
    if (!showProfileMenu) return;
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showProfileMenu]);

  useEffect(() => {
    if (!alertMessage) return;
    const timeout = setTimeout(() => setAlertMessage(""), 3000);
    return () => clearTimeout(timeout);
  }, [alertMessage]);

  const handleSelect = (type) => navigate(`/select?type=${type}`);
  const handleGift = () => navigate("/gift");

  const handleCheckStatus = () => {
    setShowModal(true);
    if (orders.length > 0) {
      fetchAllOrderStatuses(orders);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };
  const handleLogout = () => {
    localStorage.clear();
    setShowProfileMenu(false);
    navigate("/");
    window.location.reload();
  };
  const handleBirthdayCardClick = () => {
    if (!isLoggedIn) {
      setAlertMessage("เข้าสู่ระบบเพื่อรับสิทธิ์วันเกิดฟรี");
      return;
    }

    // Check spending requirement first
    if (!birthdayEligibility.eligible) {
      const remaining = birthdayEligibility.required - birthdayEligibility.totalSpent;
      setAlertMessage(`ต้องใช้จ่ายอีก ${remaining.toLocaleString()} บาท เพื่อปลดล็อกฟีเจอร์วันเกิด`);
      return;
    }

    // Then check if it's birthday
    if (isBirthday === false) {
      setAlertMessage(`คุณใช้จ่ายครบแล้ว! รอถึงวันเกิดของคุณเพื่อใช้งานฟรี 🎂`);
      return;
    }

    // If both conditions met, proceed
    if (isBirthday) navigate("/select?type=birthday");
  };

  const weeklyTotal = useMemo(
    () => leaderboard.reduce((sum, entry) => sum + Number(entry.points || 0), 0),
    [leaderboard]
  );

  const renderNotice = (message) => <div style={NOTICE_STYLE}>{message}</div>;

  const inactiveImageAndText = !status.imageOn && !status.textOn;
  const showGiftOnlyNotice = inactiveImageAndText && status.giftOn;
  const showAllDisabledNotice = inactiveImageAndText && !status.giftOn;

  const serviceCards = [
    {
      key: "image",
      enabled: status.imageOn,
      className: "image-service",
      badge: "ภาพ + ข้อความ",
      title: "ส่งรูปขึ้นจอ",
      description: "อัปโหลดรูปภาพพร้อมข้อความแสดงบนหน้าจอดิจิทัล",
      features: ["📸 รองรับ JPG, PNG, GIF", "💬 เพิ่มข้อความได้", "🎨 เลือกสีข้อความ"],
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

  return (
    <div className="home-container">
      {/* Floating Background Elements */}
      <div className="floating-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      <div className="home-wrapper">
        <header className="home-header">
          <div className="header-brand">
            <div className="brand-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <div className="brand-text">
              <h1>Digital Signage CMS</h1>
              <p>University of Phayao, Thailand</p>
            </div>
          </div>

          <nav className="header-nav">
            {isLoggedIn ? (
              <div className="profile-menu-wrapper">
                <button
                  className={`profile-avatar-btn ${profileImage ? "has-image" : ""}`}
                  type="button"
                  onClick={() => setShowProfileMenu((prev) => !prev)}
                  title="เมนูโปรไฟล์"
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
                    {[
                      {
                        label: "แก้ไขโปรไฟล์",
                        icon: (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        ),
                        action: () => navigate("/profile"),
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
                        action: () => navigate("/report"),
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

        <main className="home-main">
          <div className="hero-section">
            <div className="hero-content">
              <div className="hero-badge">
                <span className="badge-dot"></span>
                <span>ระบบแสดงผลดิจิทัล</span>
              </div>
              <h2>แชร์เนื้อหาของคุณสู่หน้าจอ</h2>
              <p>เลือกส่งรูปภาพหรือข้อความไปแสดงบนหน้าจอดิจิทัลได้ง่ายๆ</p>
            </div>
            <div className="rank-panel premium">
              <div className="rank-panel-header">
                <div>
                  <span>VIP Supporters Club</span>
                  <small>
                    {rankingType === "daily" && "อันดับรายวัน"}
                    {rankingType === "monthly" && "อันดับรายเดือน"}
                    {rankingType === "alltime" && "อันดับตลอดกาล"}
                    {" • "}สะสมยอดสนับสนุนเพื่อปลดล็อกสิทธิพิเศษ
                  </small>
                </div>
                <div className="rank-total">
                  <label>ยอดรวมสัปดาห์นี้</label>
                  <strong>฿{formatCurrency(weeklyTotal)}</strong>
                </div>
              </div>
              <div className="rank-panel-body">
                {rankLoading ? (
                  <span className="rank-empty">กำลังโหลด...</span>
                ) : (
                  Array.from({ length: 3 }).map((_, index) => {
                    const entry = leaderboard[index];
                    
                    // Get points based on entry existence and ranking type
                    let points = 0;
                    if (entry) {
                      if (rankingType === "daily") points = entry.dailyPoints || 0;
                      else if (rankingType === "monthly") points = entry.monthlyPoints || 0;
                      else points = entry.points || 0;
                    }
                    
                    return (
                      <div
                        key={entry ? (entry.name || index) : `unknown-${index}`}
                        className={`rank-card tier-${index + 1} position-${index + 1}`}
                      >
                        <div className="rank-profile">
                          <img
                            src={entry?.avatar || `/avatars/default-${index + 1}.png`}
                            alt={entry?.name || `Unknown`}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = `/avatars/default-${index + 1}.png`;
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
              <button className="rank-cta" onClick={() => setShowPerkModal(true)}>ดูสิทธิพิเศษสำหรับพรีเมี่ยม</button>
            </div>
          </div>

          <div className="service-cards">
            {status.systemOn ? (
              <>
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
                            <span className="feature">📸 รองรับ JPG, PNG, GIF</span>
                          </>
                        ) : (
                          <>
                            <span className="feature">🎉 สิทธิ์ฟรีสำหรับเจ้าของวันเกิด</span>
                            <span className="feature">📸 รองรับ JPG, PNG, GIF</span>
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

                {showGiftOnlyNotice && renderNotice("ฟังก์ชันส่งรูป/ข้อความปิดชั่วคราว • ยังสามารถส่งของขวัญได้")}
                {showAllDisabledNotice && renderNotice("ขณะนี้ฟังก์ชันการส่งทั้งหมดปิดใช้งานชั่วคราว")}
              </>
            ) : (
              renderNotice("ขณะนี้ระบบปิดให้บริการชั่วคราว")
            )}
          </div>

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
                  <div className="orders-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {orders.slice(0, 3).map((ord) => {
                      const stat = ordersStatus[ord.orderId];
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
                              {ord.type === "gift" ? `โต๊ะ #${ord.tableNumber}` : `฿${ord.price}`}
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
                    {orders.length > 3 && (
                      <div style={{ textAlign: 'center', fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
                        +{orders.length - 3} รายการอื่นๆ
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="no-order">
                    <span className="no-order-icon">📋</span>
                    <span>ยังไม่มีการสั่งซื้อ</span>
                  </div>
                )}
              </div>

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

        <footer className="home-footer">
          <div className="footer-content">
            <p>&copy; 2025 Digital Signage Content Management System</p>
            <div className="footer-links">
              <a href="#privacy">นโยบายความเป็นส่วนตัว</a>
              <a href="#terms">ข้อกำหนดการใช้งาน</a>
            </div>
          </div>
        </footer>

        {/* Status Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={handleCloseModal}>
            <div className="modal-content status-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>รายละเอียดคำสั่งซื้อ</h3>
                <button className="close-button" onClick={handleCloseModal}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="modal-body">
                {statusLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
                    <p>กำลังตรวจสอบสถานะ...</p>
                  </div>
                ) : orders.length > 0 ? (
                  <div className="order-summary-list" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {orders.map((ord, index) => {
                      const stat = ordersStatus[ord.orderId];
                      return (
                        <div key={ord.orderId || index} className="order-summary-card" style={{ borderBottom: index < orders.length - 1 ? '1px solid #e2e8f0' : 'none', paddingBottom: index < orders.length - 1 ? '24px' : '0' }}>
                          <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#64748b' }}>รายการที่ {orders.length - index}</h4>

                          {/* สถานะออเดอร์ */}
                          {stat && (
                            <div className="summary-item" style={{
                              background: stat.status === 'rejected' ? '#fee2e2' :
                                stat.status === 'pending' ? '#fef3c7' :
                                  stat.status === 'playing' ? '#e0f2fe' :
                                    stat.status === 'approved' ? '#dbeafe' :
                                      stat.status === 'completed' ? '#d1fae5' : '#f3f4f6',
                              padding: '16px',
                              borderRadius: '12px',
                              marginBottom: '16px',
                              borderLeft: `4px solid ${stat.status === 'rejected' ? '#ef4444' :
                                stat.status === 'pending' ? '#f59e0b' :
                                  stat.status === 'playing' ? '#0ea5e9' :
                                    stat.status === 'approved' ? '#3b82f6' :
                                      stat.status === 'completed' ? '#10b981' : '#6b7280'
                                }`
                            }}>
                              <span className="item-label" style={{ fontWeight: '700', fontSize: '16px' }}>สถานะ:</span>
                              <span className="item-value" style={{
                                fontWeight: '700',
                                fontSize: '16px',
                                color: stat.status === 'rejected' ? '#ef4444' :
                                  stat.status === 'pending' ? '#f59e0b' :
                                    stat.status === 'playing' ? '#0ea5e9' :
                                      stat.status === 'approved' ? '#3b82f6' :
                                        stat.status === 'completed' ? '#10b981' : '#6b7280'
                              }}>
                                {stat.statusText}
                              </span>
                            </div>
                          )}

                          {/* ตำแหน่งคิว */}
                          {stat?.order?.queuePosition && (
                            <div className="summary-item">
                              <span className="item-label">ตำแหน่งคิว:</span>
                              <span className="item-value queue-highlight">#{stat.order.queuePosition} / {stat.order.totalQueue}</span>
                            </div>
                          )}

                          {/* เวลาประมาณการ */}
                          {stat?.order?.waitingForApproval ? (
                            <div className="summary-item">
                              <span className="item-label">เวลาแสดงโดยประมาณ:</span>
                              <span className="item-value" style={{ color: '#f59e0b', fontWeight: '600' }}>
                                รอตรวจสอบ
                              </span>
                            </div>
                          ) : stat?.status === 'playing' && stat?.order?.remainingSeconds !== undefined ? (
                            <div className="summary-item">
                              <span className="item-label">เวลาคงเหลือ:</span>
                              <span className="item-value" style={{ color: '#0ea5e9', fontWeight: '600' }}>
                                {stat.order.remainingSeconds} วินาที
                              </span>
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

                          <div className="summary-item">
                            <span className="item-label">ประเภท:</span>
                            <span className="item-value">{getOrderTypeLabel(ord.type, { includeEmoji: false })}</span>
                          </div>
                          {ord.type === "gift" ? (
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
                          ) : null}
                          <div className="summary-item">
                            <span className="item-label">ราคา:</span>
                            <span className="item-value price-highlight">฿{ord.price}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
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

        {showPerkModal && (
          <div className="modal-overlay" onClick={() => setShowPerkModal(false)}>
            <div className="modal-content perk-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>สิทธิพิเศษสำหรับสมาชิกพรีเมี่ยม</h3>
                <button className="close-button" onClick={() => setShowPerkModal(false)}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="modal-body">
                <ul className="perk-list">
                  <li>🎁 แสดงชื่อและโปรไฟล์บนหน้าจออันดับผู้สนับสนุน</li>
                  <li>🌟 ป้าย Diamond/Gold/Silver ที่ช่วยแยกความโดดเด่น</li>
                  <li>🚀 สิทธิ์เข้าถึงโปรโมชั่นหรือกิจกรรมก่อนใคร</li>
                  <li>💬 ช่องทางติดต่อพิเศษสำหรับเคสเร่งด่วน</li>
                </ul>
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