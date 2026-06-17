import app from "./app";
import { logger } from "./lib/logger";
import path from "path";
import express from "express";
// 1. إضافة مكتبات Node.js الأساسية لتعريف __dirname في نظام ESM
import { fileURLToPath } from "url";
import { dirname } from "path";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// ==========================================
// 🟢 تعريف __dirname الخاص بـ ES Modules
// ==========================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ==========================================
// 🟢 حل مشكلة Cannot GET / وتشغيل الواجهة الأمامية
// ==========================================

// 2. تم تغيير anon-app إلى tifo ليتطابق مع اسم مجلدك الفعلي
// تعديل المسار ليدخل إلى مجلد public الفعلي الذي بناه Vite
const frontendPath = path.join(__dirname, "../../tifo/dist/public");

// تفعيل تشغيل الملفات الثابتة (Static Files)
app.use(express.static(frontendPath));

// حل Express 5 الشامل: توجيه أي مسار لملف index.html
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ==========================================

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
