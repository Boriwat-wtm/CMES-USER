/**
 * Gift.js
 * หน้าสำหรับเลือกและสั่งซื้อของขวัญส่งถึงโต๊ะต่างๆ ในงาน
 * มีระบบเลือกสินค้า คำนวณราคา และชำระเงิน
 */
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Gift.css";
import { incrementQueueNumber } from "../utils";

import API_BASE_URL, { REALTIME_URL } from '../config/apiConfig';

// API endpoints สำหรับเชื่อมต่อกับ backend
const API_BASE = API_BASE_URL;
const REALTIME_BASE = REALTIME_URL;

// Admin API สำหรับดึงรูปภาพสินค้า
const ADMIN_API_BASE = process.env.REACT_APP_ADMIN_API_URL || 'https://cmes-admin-server.onrender.com';


/**
 * แปลง URL รูปภาพให้เป็น absolute URL
 * @param {string} url - URL ของรูปภาพ (อาจเป็น relative หรือ absolute)
 * @returns {string} - URL ที่สมบูรณ์
 */
const resolveImageSrc = (url) => {
	if (!url) return "";
	return url.startsWith("http") ? url : `${ADMIN_API_BASE}${url}`;
};

function Gift() {
	const navigate = useNavigate();
	const shopId = new URLSearchParams(window.location.search).get("shopId") || localStorage.getItem("shopId") || "";
	console.log("[Gift] shopId:", shopId);

	// State สำหรับข้อมูลสินค้าและการตั้งค่า
	const [settings, setSettings] = useState({ items: [], tableCount: 0 }); // ข้อมูลสินค้าและจำนวนโต๊ะสูงสุด
	const [quantities, setQuantities] = useState({}); // จำนวนสินค้าที่เลือกแต่ละรายการ { itemId: quantity }

	// State สำหรับข้อมูลการสั่งซื้อ
	const [tableNumber, setTableNumber] = useState(""); // เลขโต๊ะปลายทาง
	const [note, setNote] = useState(""); // ข้อความถึงผู้รับ
	const [senderName, setSenderName] = useState(""); // ชื่อผู้ส่ง
	const [senderPhone, setSenderPhone] = useState(""); // เบอร์โทรผู้ส่ง

	// State สำหรับการจัดการ UI
	const [loading, setLoading] = useState(true); // สถานะโหลดข้อมูล
	const [submitting, setSubmitting] = useState(false); // สถานะกำลังส่งคำสั่งซื้อ
	const [errorMessage, setErrorMessage] = useState(""); // ข้อความ error
	const [giftDisabled, setGiftDisabled] = useState(false); // ระบบปิดฟังก์ชันส่งของขวัญหรือไม่
	const [statusChecked, setStatusChecked] = useState(false); // ตรวจสอบสถานะระบบแล้วหรือยัง
	const [giftStatusMessage, setGiftStatusMessage] = useState(""); // ข้อความสถานะระบบ
	const [showConfirmModal, setShowConfirmModal] = useState(false); // แสดง Modal ยืนยันหรือไม่
	const [userAvatar, setUserAvatar] = useState(null); // รูป Avatar ของผู้ใช้

	/**
	 * โหลดข้อมูลผู้ใช้จาก localStorage
	 * ดึงชื่อและรูป avatar มาใส่เป็นค่า default
	 */
	useEffect(() => {
		const storedUser = localStorage.getItem("user");
		if (storedUser) {
			try {
				const parsed = JSON.parse(storedUser);
				// ตั้งชื่อผู้ส่งจากข้อมูล user
				setSenderName(parsed.name || parsed.username || "");
				// ตั้ง avatar URL
				if (parsed.avatar) {
					const avatarUrl = parsed.avatar.startsWith('http')
						? parsed.avatar
						: `${API_BASE}${parsed.avatar}`;
					setUserAvatar(avatarUrl);
				}
			} catch {
				/* ignore parsing error */
			}
		}
	}, []);

	/**
	 * ตรวจสอบสถานะระบบว่าเปิดรับคำสั่งซื้อของขวัญหรือไม่
	 * เช็คจาก realtime server ว่า systemOn และ enableGift เป็น true หรือไม่
	 */
	useEffect(() => {
		const checkGiftStatus = async () => {
			try {
				const response = await fetch(`${REALTIME_BASE}/api/status?shopId=${shopId}`, {
					headers: { 'x-shop-id': shopId }
				});
				if (!response.ok) throw new Error("CONFIG_ERROR");
				const data = await response.json();
				// ระบบต้องเปิดทั้ง systemOpen (จาก admin) และ enableGift
				const allowed = (data.systemOpen ?? data.systemOn ?? true) && (data.enableGift ?? true);
				setGiftDisabled(!allowed);
				if (!allowed) {
					setGiftStatusMessage("ขณะนี้ระบบปิดฟังก์ชันส่งของขวัญชั่วคราว");
				}
			} catch (error) {
				console.warn("ตรวจสอบสถานะฟังก์ชันส่งของขวัญไม่สำเร็จ", error);
			} finally {
				setStatusChecked(true);
			}
		};
		checkGiftStatus();
	}, []);

	/**
	 * โหลดข้อมูลสินค้าและการตั้งค่าจาก API
	 * ทำงานหลังจากตรวจสอบสถานะระบบเสร็จแล้ว
	 */
	useEffect(() => {
		if (!statusChecked) return; // รอให้ตรวจสอบสถานะก่อน
		if (giftDisabled) {
			// ถ้าระบบปิด ไม่ต้องโหลดข้อมูล
			setLoading(false);
			return;
		}

		const loadSettings = async () => {
			try {
				const response = await fetch(`${API_BASE}/api/gifts?shopId=${shopId}`, {
					headers: { "x-shop-id": shopId }
				});
				if (!response.ok) throw new Error("NETWORK_ERROR");
				const data = await response.json();
				if (!data.success) throw new Error(data.message || "โหลดข้อมูลไม่สำเร็จ");
				// บันทึกข้อมูลสินค้าและจำนวนโต๊ะสูงสุด
				setSettings(data.settings || { items: [], tableCount: 0 });
			} catch (error) {
				console.error("Gift settings load failed", error);
				setErrorMessage("ไม่สามารถโหลดรายการสินค้าได้");
			} finally {
				setLoading(false);
			}
		};

		loadSettings();
	}, [statusChecked, giftDisabled]);

	const tableLimit = settings.tableCount || 0;

	/**
	 * คำนวณรายการสินค้าที่ผู้ใช้เลือก (quantity > 0)
	 * ใช้ useMemo เพื่อ optimize performance
	 */
	const selectedItems = useMemo(() => {
		return (settings.items || [])
			.map((item) => ({
				...item,
				quantity: quantities[item.id] || 0,
			}))
			.filter((item) => item.quantity > 0); // เอาเฉพาะที่มีการเลือก
	}, [settings.items, quantities]);

	/**
	 * คำนวณราคารวมทั้งหมด
	 * ใช้ useMemo เพื่อคำนวณใหม่เฉพาะเมื่อ selectedItems เปลี่ยน
	 */
	const totalPrice = useMemo(() => {
		return selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
	}, [selectedItems]);

	/**
	 * เพิ่มหรือลดจำนวนสินค้า
	 * @param {number} id - ID ของสินค้า
	 * @param {number} delta - จำนวนที่จะเพิ่ม (+1) หรือลด (-1)
	 */
	const handleQuantityChange = (id, delta) => {
		setQuantities((prev) => {
			const nextValue = Math.max(0, (prev[id] || 0) + delta); // ป้องกันไม่ให้ติดลบ
			return { ...prev, [id]: nextValue };
		});
	};

	/**
	 * แปลงตัวเลขเป็นรูปแบบสกุลเงิน
	 * @param {number} amount - จำนวนเงิน
	 * @returns {string} - ข้อความแสดงราคา (เช่น "ฟรี" หรือ "฿100")
	 */
	const formatCurrency = (amount) => {
		const num = Number(amount || 0);
		return num === 0 ? 'ฟรี' : `฿${num.toLocaleString("th-TH")}`;
	};

	/**
	 * รีเซ็ตการเลือกสินค้าทั้งหมด
	 */
	const handleResetSelection = () => {
		setQuantities({});
	};

	/**
	 * ตรวจสอบข้อมูลก่อนแสดง Modal ยืนยัน
	 * เช็คว่ามีการเลือกสินค้าและระบุเลขโต๊ะหรือไม่
	 */
	const handleSubmit = () => {
		setErrorMessage("");

		// ตรวจสอบว่ามีการเลือกสินค้าหรือไม่
		if (selectedItems.length === 0) {
			setErrorMessage("กรุณาเลือกสินค้าอย่างน้อย 1 รายการ");
			return;
		}
		// ตรวจสอบว่าระบุเลขโต๊ะหรือไม่
		if (!tableNumber) {
			setErrorMessage("กรุณาระบุเลขโต๊ะที่ต้องการส่ง");
			return;
		}

		// แสดง Modal ยืนยัน
		setShowConfirmModal(true);
	};

	/**
	 * ยืนยันและส่งคำสั่งซื้อไปยัง backend
	 * ถ้าราคา 0 บาท จะยืนยันและไปหน้า home ทันที
	 * ถ้ามีราคา จะไปหน้าชำระเงิน
	 */
	const handleConfirmSubmit = async () => {
		if (submitting) return; // ป้องกันการกดซ้ำ
		setSubmitting(true);
		try {
			// เตรียมข้อมูลสำหรับส่งไปยัง API
			const payload = {
				senderName,
				note,
				tableNumber: Number(tableNumber),
				items: selectedItems.map((item) => ({
					id: item.id,
					name: item.name,
					price: item.price,
					image: item.image,
					quantity: item.quantity
				})),
				avatar: userAvatar || null,
				senderPhone: senderPhone.trim() || null
			};

			// ส่งคำสั่งซื้อไปยัง backend
			const response = await fetch(`${API_BASE}/api/gifts/order?shopId=${shopId}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-shop-id": shopId
				},
				body: JSON.stringify(payload),
			});

			const data = await response.json();
			if (!response.ok || !data.success) {
				throw new Error(data.message || "ไม่สามารถสร้างคำสั่งซื้อได้");
			}

			// กรณีพิเศษ: ถ้าของขวัญฟรี (ราคา 0 บาท) ให้ยืนยันและไปหน้า home ทันที
			if (data.order.totalPrice === 0) {
				try {
					// ดึงข้อมูล user จาก localStorage สำหรับยืนยันคำสั่งซื้อ
					let userId = null, email = null, avatar = null;
					try {
						const storedUser = localStorage.getItem("user");
						if (storedUser) {
							const userObj = JSON.parse(storedUser);
							userId = userObj.id || null;
							email = userObj.email || null;
							avatar = userObj.avatar || null;
						}
					} catch (err) {
						console.warn("[Gift] Cannot parse user data:", err);
					}

					// ยืนยันคำสั่งซื้อทันที (เพราะฟรี ไม่ต้องชำระเงิน)
					const confirmResponse = await fetch(`${API_BASE}/api/gifts/order/${data.order.id}/confirm?shopId=${shopId}`, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"x-shop-id": shopId
						},
						body: JSON.stringify({ userId, email, avatar })
					});
					const confirmData = await confirmResponse.json();
					if (!confirmResponse.ok || !confirmData.success) {
						throw new Error(confirmData.message || "ยืนยันคำสั่งซื้อไม่สำเร็จ");
					}

					// บันทึกคำสั่งซื้อลง localStorage เพื่อแสดงใน Home
					const currentQueueNumber = incrementQueueNumber();
					const newOrder = {
						type: "gift",
						price: confirmData.order.totalPrice,
						queueNumber: currentQueueNumber,
						tableNumber: confirmData.order.tableNumber,
						giftItems: confirmData.order.items,
						orderId: data.order.id
					};

					// เพิ่มคำสั่งซื้อใหม่เข้าไปในรายการ orders
					const existingOrders = JSON.parse(localStorage.getItem("orders") || "[]");
					existingOrders.push(newOrder);
					localStorage.setItem("orders", JSON.stringify(existingOrders));
					localStorage.setItem("order", JSON.stringify(newOrder)); // backward compatibility

					// ไปหน้า home แสดงสถานะคำสั่งซื้อ
					navigate(`/home${shopId ? `?shopId=${shopId}` : ''}`);
					return;
				} catch (confirmError) {
					console.error("[Gift] Free order confirmation error:", confirmError);
					setErrorMessage(confirmError.message || "เกิดข้อผิดพลาดในการยืนยันคำสั่งซื้อ");
					setSubmitting(false);
					return;
				}
			}

			// กรณีปกติ: มีค่าใช้จ่าย ไปหน้าชำระเงินตามปกติ
			navigate(`/payment?type=gift&price=${data.order.totalPrice}&orderId=${data.order.id}`);
		} catch (error) {
			console.error("Create gift order error", error);
			setErrorMessage(error.message || "เกิดข้อผิดพลาด กรุณาลองใหม่");
		} finally {
			setSubmitting(false);
		}
	};

	// แสดงหน้าเมื่อระบบปิดฟังก์ชันส่งของขวัญ
	if (giftDisabled) {
		return (
			<div className="gift-shell">
				<div className="gift-loader-card">
					<p>{giftStatusMessage || "ขณะนี้ระบบปิดการส่งของขวัญ"}</p>
					<button className="ghost-btn" onClick={() => navigate("/")}>
						กลับหน้าหลัก
					</button>
				</div>
			</div>
		);
	}

	// แสดงหน้าโหลดข้อมูล
	if (loading) {
		return (
			<div className="gift-shell">
				<div className="gift-loader-card">
					<div className="spinner"></div>
					<p>กำลังโหลดรายการสินค้า...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="gift-shell">
			<header className="gift-hero">
				<div className="hero-left">
					<button className="back-chip" onClick={() => navigate(-1)}>
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M19 12H5M12 19l-7-7 7-7" />
						</svg>
						<span>กลับ</span>
					</button>
					<div>
						<p className="eyebrow">CMS LIVE EXPERIENCE</p>
						<h1>ส่งของขวัญ</h1>
						<p className="subtitle">เลือกรายการสุดพิเศษ แล้วส่งตรงถึงโต๊ะที่ต้องการ</p>
					</div>
				</div>
				<div className="hero-meta">
					<span className="meta-pill">รองรับสูงสุด {tableLimit || "-"} โต๊ะ</span>
					<span className="meta-pill ghost">{(settings.items || []).length} รายการพร้อมสั่ง</span>
				</div>
			</header>

			<main className="gift-layout">
				<section className="gift-panel">
					<div className="panel-head">
						<div>
							<h2>เลือกสินค้า</h2>
							<p>แตะปุ่ม + เพื่อเพิ่มจำนวนให้ครบตามที่ต้องการ</p>
						</div>
						<button className="ghost-btn" onClick={handleResetSelection} disabled={selectedItems.length === 0}>
							รีเซ็ตการเลือก
						</button>
					</div>

					<div className="gift-grid">
						{(settings.items || []).length === 0 ? (
							<div className="empty-state">
								<p>ยังไม่มีสินค้าที่เปิดให้สั่ง</p>
							</div>
						) : (
							(settings.items || []).map((item) => (
								<div key={item.id} className={`gift-card ${quantities[item.id] ? "selected" : ""}`}>
									{item.imageUrl && (
										<div className="gift-card-image">
											<img src={resolveImageSrc(item.imageUrl)} alt={item.name} />
										</div>
									)}
									<div className="gift-card-header">
										<div>
											<h3>{item.name}</h3>
											{item.description && <p>{item.description}</p>}
										</div>
										<span className="price-tag">{formatCurrency(item.price)}</span>
									</div>
									<div className="gift-card-footer">
										<div className="quantity-control">
											<button onClick={() => handleQuantityChange(item.id, -1)}>-</button>
											<span>{quantities[item.id] || 0}</span>
											<button onClick={() => handleQuantityChange(item.id, 1)}>+</button>
										</div>
									</div>
								</div>
							))
						)}
					</div>
				</section>

				<aside className="gift-summary">
					<div className="summary-card">
						<div className="panel-head compact">
							<div>
								<h2>รายละเอียดคำสั่งซื้อ</h2>
								<p>ตรวจสอบข้อมูลก่อนกดไปหน้าชำระเงิน</p>
							</div>
						</div>

						<label className="input-label">ชื่อผู้ส่ง (optional)</label>
						<input
							type="text"
							className="input-field"
							placeholder="ระบุชื่อหรือแหล่งที่มา"
							value={senderName}
							onChange={(e) => setSenderName(e.target.value)}
						/>

						<label className="input-label">เลขโต๊ะที่ต้องการส่ง</label>
						<input
							type="number"
							className="input-field"
							min="1"
							max={tableLimit || undefined}
							value={tableNumber}
							onChange={(e) => setTableNumber(e.target.value)}
							placeholder={tableLimit ? `1 - ${tableLimit}` : "ระบุเลขโต๊ะ"}
						/>
						{tableLimit > 0 && (
							<small className="helper-text">รองรับสูงสุด {tableLimit} โต๊ะ</small>
						)}

						<label className="input-label">เบอร์โทรผู้ส่ง (สำหรับติดต่อกลับ)</label>
						<input
							type="tel"
							className="input-field"
							placeholder="0XX-XXX-XXXX"
							value={senderPhone}
							onChange={(e) => setSenderPhone(e.target.value)}
							maxLength={10}
						/>

						<label className="input-label">ข้อความถึงโต๊ะ</label>
						<textarea
							className="input-field"
							rows="3"
							placeholder="ระบุข้อความเพิ่มเติม"
							value={note}
							onChange={(e) => setNote(e.target.value)}
						/>

						<div className="selected-items">
							<div className="selected-head">
								<h3>รายการที่เลือก</h3>
								<span className="chip">{selectedItems.length} รายการ</span>
							</div>
							{selectedItems.length === 0 ? (
								<p className="empty-text">ยังไม่มีการเลือกสินค้า</p>
							) : (
								<ul>
									{selectedItems.map((item) => (
										<li key={item.id}>
											<span><strong>{item.name}</strong> x{item.quantity}</span>
											<strong>{formatCurrency(item.price * item.quantity)}</strong>
										</li>
									))}
								</ul>
							)}
						</div>

						<div className="total-row">
							<span>ยอดรวม</span>
							<strong>{formatCurrency(totalPrice)}</strong>
						</div>

						{errorMessage && (
							<div className="gift-alert">
								{errorMessage}
							</div>
						)}

						<button
							className="gift-submit"
							disabled={submitting || selectedItems.length === 0 || !tableNumber}
							onClick={handleSubmit}
						>
							{submitting ? "กำลังสร้างคำสั่งซื้อ..." : "ไปหน้าชำระเงิน"}
						</button>
					</div>
				</aside>
			</main>

			{/* Cyberpunk Confirmation Modal */}
			{showConfirmModal && (
				<div className="cyberpunk-modal-overlay" onClick={() => setShowConfirmModal(false)}>
					<div className="cyberpunk-modal-card" onClick={(e) => e.stopPropagation()}>
						{/* Header */}
						<div className="cyberpunk-header">
							<span className="neon-sparkle">✨</span>
							<h2 className="neon-title">NEW GIFT INCOMING!</h2>
							<span className="neon-sparkle">✨</span>
						</div>

						{/* Sender Avatar Section */}
						<div className="cyberpunk-sender">
							<div className="avatar-halo">
								<div className="avatar-inner">
									{userAvatar ? (
										<img
											src={userAvatar}
											alt={senderName || 'User'}
											className="avatar-image"
											onError={(e) => {
												e.target.style.display = 'none';
												e.target.nextSibling.style.display = 'flex';
											}}
										/>
									) : null}
									<span
										className="avatar-initial"
										style={{ display: userAvatar ? 'none' : 'flex' }}
									>
										{(senderName || 'A').charAt(0).toUpperCase()}
									</span>
								</div>
							</div>
							<h3 className="sender-display">
								⭐ คุณ {senderName || 'ผู้ใจดี'} ⭐
							</h3>
						</div>

						{/* Action Indicator */}
						<div className="cyberpunk-action">
							⬇️ Sending to ⬇️
						</div>

						{/* Receiver Table */}
						<div className="cyberpunk-receiver">
							<div className="neon-table-number">โต๊ะ {tableNumber}</div>
						</div>

						{/* Divider */}
						<div className="cyberpunk-divider"></div>

						{/* Item Grid */}
						<div className="cyberpunk-items">
							{selectedItems
								.sort((a, b) => (b.price * b.quantity) - (a.price * a.quantity)) // เรียงตามมูลค่ารวมสูงสุด
								.map((item) => (
									<div key={item.id} className="cyberpunk-item-box">
										{item.imageUrl ? (
											<img
												src={resolveImageSrc(item.imageUrl)}
												alt={item.name}
												className="item-icon"
											/>
										) : (
											<div className="item-icon-placeholder">
												{item.name.charAt(0)}
											</div>
										)}
										<span className="item-quantity-badge">x{item.quantity}</span>
										<p className="item-name-label">{item.name}</p>
									</div>
								))}
						</div>

						{/* Divider */}
						<div className="cyberpunk-divider"></div>

						{/* Message */}
						{note && (
							<div className="cyberpunk-message">
								<p>"{note}"</p>
							</div>
						)}

						{/* Total */}
						<div className="cyberpunk-total">
							<span>Total Price</span>
							<strong>{formatCurrency(totalPrice)}</strong>
						</div>

						{/* Action Buttons */}
						<div className="cyberpunk-actions">
							<button
								className="cyberpunk-btn cancel"
								onClick={() => setShowConfirmModal(false)}
							>
								ยกเลิก
							</button>
							<button
								className="cyberpunk-btn confirm"
								onClick={handleConfirmSubmit}
								disabled={submitting}
							>
								{submitting ? 'กำลังดำเนินการ...' : 'ยืนยันและชำระเงิน'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default Gift;
