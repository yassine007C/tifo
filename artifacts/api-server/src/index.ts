import app from "./app";
import { logger } from "./lib/logger";
import path from "path";
import express from "express";

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
// 🟢 حل مشكلة Cannot GET / وتشغيل الواجهة الأمامية
// ==========================================

// 1. التعديل الصحيح للمسار: الرجوع خطوتين للخلف والدخول إلى مجلد الفرونت إند anon-app
const frontendPath = path.join(__dirname, "../../anon-app/dist"); 

// 2. تفعيل تشغيل الملفات الثابتة (Static Files مثل الصور والـ CSS والـ JS)
app.use(express.static(frontendPath));

// 3. حل Express 5 الشامل: توجيه أي مسار أو تحديث صفحة (Refresh) لملف index.html
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
