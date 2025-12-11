#!/usr/bin/env node

/**
 * Migrate data from JSON files to MongoDB
 * Run this once to migrate all existing data
 * Usage: node migrate-complete.js
 */

import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Import models
import GiftOrder from "./models/GiftOrder.js";
import GiftSetting from "./models/GiftSetting.js";
import Report from "./models/Report.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://admin:password@cluster0.mongodb.net/?retryWrites=true&w=majority";

async function migrate() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("✓ Connected to MongoDB");

    // Migrate Gift Orders
    console.log("\n📦 Migrating gift orders...");
    const giftOrdersPath = path.join(__dirname, "gift-orders.json");
    if (fs.existsSync(giftOrdersPath)) {
      const giftOrders = JSON.parse(fs.readFileSync(giftOrdersPath, "utf8"));
      for (const order of giftOrders) {
        const exists = await GiftOrder.findOne({ orderId: order.id });
        if (!exists) {
          await GiftOrder.create({
            orderId: order.id,
            senderName: order.senderName || "",
            tableNumber: order.tableNumber || 0,
            note: order.note || "",
            items: order.items || [],
            totalPrice: order.totalPrice || 0,
            status: order.status || "pending_payment",
            paymentMethod: order.paymentMethod || "",
          });
          console.log(`  ✓ Migrated gift order: ${order.id}`);
        } else {
          console.log(`  ⊘ Gift order already exists: ${order.id}`);
        }
      }
    }

    // Migrate Gift Settings
    console.log("\n📦 Migrating gift settings...");
    const giftSettingsPath = path.join(__dirname, "gift-settings.json");
    if (fs.existsSync(giftSettingsPath)) {
      const giftSettings = JSON.parse(fs.readFileSync(giftSettingsPath, "utf8"));
      for (const setting of giftSettings) {
        const exists = await GiftSetting.findOne({ giftId: setting.id });
        if (!exists) {
          await GiftSetting.create({
            giftId: setting.id,
            giftName: setting.name || "",
            description: setting.description || "",
            price: setting.price || 0,
            available: setting.available !== false,
            stock: setting.stock || 0,
            image: setting.image || "",
            category: setting.category || "",
          });
          console.log(`  ✓ Migrated gift setting: ${setting.id}`);
        } else {
          console.log(`  ⊘ Gift setting already exists: ${setting.id}`);
        }
      }
    }

    // Migrate Reports
    console.log("\n📦 Migrating reports...");
    const reportsPath = path.join(__dirname, "reports.json");
    if (fs.existsSync(reportsPath)) {
      const reports = JSON.parse(fs.readFileSync(reportsPath, "utf8"));
      for (const report of reports) {
        const exists = await Report.findOne({ category: report.category });
        if (!exists) {
          await Report.create({
            category: report.category || "other",
            detail: report.detail || "",
            status: report.status || "open",
          });
          console.log(`  ✓ Migrated report: ${report.category}`);
        } else {
          console.log(`  ⊘ Report already exists: ${report.category}`);
        }
      }
    }

    console.log("\n✅ Migration completed!");
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrate();
