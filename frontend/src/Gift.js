import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Gift.css";

const API_BASE = "http://localhost:4000";
const REALTIME_BASE = "http://localhost:4005";
const ADMIN_API_BASE = "http://localhost:5001";

const resolveImageSrc = (url) => {
	if (!url) return "";
	return url.startsWith("http") ? url : `${ADMIN_API_BASE}${url}`;
};

function Gift() {
	const navigate = useNavigate();
	const [settings, setSettings] = useState({ items: [], tableCount: 0 });
	const [quantities, setQuantities] = useState({});
	const [tableNumber, setTableNumber] = useState("");
	const [note, setNote] = useState("");
	const [senderName, setSenderName] = useState("");
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [giftDisabled, setGiftDisabled] = useState(false);
	const [statusChecked, setStatusChecked] = useState(false);
	const [giftStatusMessage, setGiftStatusMessage] = useState("");

	useEffect(() => {
		const storedUser = localStorage.getItem("user");
		if (storedUser) {
			try {
				const parsed = JSON.parse(storedUser);
				setSenderName(parsed.name || parsed.username || "");
			} catch {
				/* ignore */
			}
		}
	}, []);

	useEffect(() => {
		const checkGiftStatus = async () => {
			try {
				const response = await fetch(`${REALTIME_BASE}/api/status`);
				if (!response.ok) throw new Error("CONFIG_ERROR");
				const data = await response.json();
				const allowed = (data.systemOn ?? true) && (data.enableGift ?? true);
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

	useEffect(() => {
		if (!statusChecked) return;
		if (giftDisabled) {
			setLoading(false);
			return;
		}

		const loadSettings = async () => {
			try {
				const response = await fetch(`${API_BASE}/api/gifts`);
				if (!response.ok) throw new Error("NETWORK_ERROR");
				const data = await response.json();
				if (!data.success) throw new Error(data.message || "โหลดข้อมูลไม่สำเร็จ");
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

	const selectedItems = useMemo(() => {
		return (settings.items || [])
			.map((item) => ({
				...item,
				quantity: quantities[item.id] || 0,
			}))
			.filter((item) => item.quantity > 0);
	}, [settings.items, quantities]);

	const totalPrice = useMemo(() => {
		return selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
	}, [selectedItems]);

	const handleQuantityChange = (id, delta) => {
		setQuantities((prev) => {
			const nextValue = Math.max(0, (prev[id] || 0) + delta);
			return { ...prev, [id]: nextValue };
		});
	};

	const formatCurrency = (amount) => `฿${Number(amount || 0).toLocaleString("th-TH")}`;

	const handleResetSelection = () => {
		setQuantities({});
	};

	const handleSubmit = async () => {
		if (submitting) return;
		setErrorMessage("");

		if (selectedItems.length === 0) {
			setErrorMessage("กรุณาเลือกสินค้าอย่างน้อย 1 รายการ");
			return;
		}
		if (!tableNumber) {
			setErrorMessage("กรุณาระบุเลขโต๊ะที่ต้องการส่ง");
			return;
		}

		setSubmitting(true);
		try {
			const payload = {
				senderName,
				note,
				tableNumber: Number(tableNumber),
				items: selectedItems.map((item) => ({ id: item.id, quantity: item.quantity })),
			};

				const response = await fetch(`${API_BASE}/api/gifts/order`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			const data = await response.json();
			if (!response.ok || !data.success) {
				throw new Error(data.message || "ไม่สามารถสร้างคำสั่งซื้อได้");
			}

			navigate(`/payment?type=gift&price=${data.order.totalPrice}&orderId=${data.order.id}`);
		} catch (error) {
			console.error("Create gift order error", error);
			setErrorMessage(error.message || "เกิดข้อผิดพลาด กรุณาลองใหม่");
		} finally {
			setSubmitting(false);
		}
	};

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
		</div>
	);
}

export default Gift;
