import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import GiftOrder from "./models/GiftOrder.js";
import Report from "./models/Report.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function migrateData() {
  try {
    // เชื่อมต่อ MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("✓ Connected to MongoDB");

    // ========================
    // Migrate Users
    // ========================
    const usersFile = path.join(process.cwd(), "users-data.json");
    if (fs.existsSync(usersFile)) {
      console.log("\n📦 Migrating users...");
      const usersData = JSON.parse(fs.readFileSync(usersFile, "utf8"));
      
      for (const userId in usersData) {
        const userData = usersData[userId];
        const existingUser = await User.findOne({ email: userData.email });
        
        if (!existingUser) {
          const newUser = new User({
            email: userData.email,
            username: userData.username,
            password: userData.password,
            avatar: userData.avatar,
            birthday: userData.birthday,
            authMethod: userData.authMethod || "email",
            emailVerified: userData.emailVerified || false,
          });
          await newUser.save();
          console.log(`  ✓ Migrated user: ${userData.email}`);
        } else {
          console.log(`  ⊘ User already exists: ${userData.email}`);
        }
      }
    }

    // ========================
    // Migrate Gift Orders
    // ========================
    const giftOrdersFile = path.join(process.cwd(), "gift-orders.json");
    if (fs.existsSync(giftOrdersFile)) {
      console.log("\n📦 Migrating gift orders...");
      const giftOrdersData = JSON.parse(fs.readFileSync(giftOrdersFile, "utf8"));
      
      for (const order of giftOrdersData) {
        const existingOrder = await GiftOrder.findOne({ orderId: order.id });
        
        if (!existingOrder) {
          const newOrder = new GiftOrder({
            orderId: order.id,
            senderName: order.senderName,
            tableNumber: order.tableNumber,
            note: order.note,
            items: order.items,
            totalPrice: order.totalPrice,
            status: order.status,
          });
          await newOrder.save();
          console.log(`  ✓ Migrated gift order: ${order.id}`);
        } else {
          console.log(`  ⊘ Gift order already exists: ${order.id}`);
        }
      }
    }

    // ========================
    // Migrate Reports
    // ========================
    const reportsFile = path.join(process.cwd(), "reports.json");
    if (fs.existsSync(reportsFile)) {
      console.log("\n📦 Migrating reports...");
      const reportsData = JSON.parse(fs.readFileSync(reportsFile, "utf8"));
      
      for (const report of reportsData) {
        const newReport = new Report({
          category: report.category,
          detail: report.detail,
          status: "open",
        });
        await newReport.save();
        console.log(`  ✓ Migrated report: ${report.category}`);
      }
    }

    console.log("\n✅ Migration completed!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration error:", error);
    process.exit(1);
  }
}

migrateData();
