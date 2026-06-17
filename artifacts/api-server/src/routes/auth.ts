import { Router, type IRouter, type Request, type Response } from "express";
import {
  GetCurrentAuthUserResponse,
  // يمكنك الاحتفاظ بملفات zod للـ mobile إذا كنت تستخدمها لاحقاً
  LogoutMobileSessionResponse,
} from "@workspace/api-zod";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import {
  clearSession,
  getSessionId,
  createSession,
  deleteSession,
  SESSION_COOKIE,
  SESSION_TTL,
  type SessionData,
} from "../lib/auth";

const router: IRouter = Router();

// دالة مساعدة لتشفير كلمة المرور لحمايتها في قاعدة البيانات
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

function getSafeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

// =========================================================
// 1. جلب بيانات المستخدم الحالي (Session Check)
// =========================================================
router.get("/auth/user", (req: Request, res: Response) => {
  res.json(
    GetCurrentAuthUserResponse.parse({
      user: req.isAuthenticated() ? req.user : null,
    }),
  );
});

// =========================================================
// 2. مسار إنشاء حساب جديد (Register) -> تطلب Name, Email, Password
// =========================================================
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "جميع الحقول (الاسم، البريد، كلمة المرور) مطلوبة." });
    }

    // التحقق من أن البريد الإلكتروني غير مستخدم مسبقاً
    const existingUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(400).json({ error: "البريد الإلكتروني مسجل بالفعل." });
    }

    const hashedPassword = hashPassword(password);
    const userId = crypto.randomUUID(); // توليد معرف فريد للمستخدم الجديد

    // تقسيم الاسم الأول والأخير بناءً على المدخل (اختياري ليتوافق مع الـ Schema لديك)
    const nameParts = name.trim().split(" ");
    const firstName = nameParts[0] || "User";
    const lastName = nameParts.slice(1).join(" ") || null;

    // حفظ المستخدم في قاعدة بيانات Neon
    const [newUser] = await db
      .insert(usersTable)
      .values({
        id: userId,
        email: email,
        firstName: firstName,
        lastName: lastName,
        // إذا كان لديك حقل password مخصص في الـ usersTable قم بفك التعليق عنه بالأسفل:
        // password: hashedPassword, 
      })
      .returning();

    // إنشاء جلسة مباشرة للمستخدم بعد التسجيل بنجاح
    const now = Math.floor(Date.now() / 1000);
    const sessionData: SessionData = {
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        profileImageUrl: newUser.profileImageUrl,
      },
      expires_at: now + Math.floor(SESSION_TTL / 1000),
    };

    const sid = await createSession(sessionData);
    setSessionCookie(res, sid);

    return res.status(201).json({ success: true, user: sessionData.user });
  } catch (error) {
    req.log?.error({ error }, "Register error");
    return res.status(500).json({ error: "حدث خطأ داخلي أثناء إنشاء الحساب." });
  }
});

// =========================================================
// 3. مسار تسجيل الدخول العادي (Login) -> يستقبل Email و Password
// =========================================================
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const returnTo = getSafeReturnTo(req.query.returnTo || "/");

    if (!email || !password) {
      return res.status(400).json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان." });
    }

    // البحث عن المستخدم بواسطة البريد الإلكتروني
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (!user) {
      return res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة." });
    }

    // التحقق من تطابق كلمة المرور 
    // (ملاحظة: إذا كانت قاعدة البيانات القديمة لا تحتوي على حقل باسوورد، تأكد من تحديث الـ schema لإضافته)
    const hashedPassword = hashPassword(password);
    
    // تفعيل التحقق عند ربط الحقل بالـ Schema:
    // if (user.password !== hashedPassword) { return res.status(401).json({ error: "البريد أو كلمة المرور غير صحيحة" }); }

    // توليد الجلسة وتخزينها في السيرفر/الكوكيز بنفس الأسلوب القديم للمشروع
    const now = Math.floor(Date.now() / 1000);
    const sessionData: SessionData = {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
      },
      expires_at: now + Math.floor(SESSION_TTL / 1000),
    };

    const sid = await createSession(sessionData);
    setSessionCookie(res, sid);

    // إذا كان الطلب قادماً من واجهة برمجة تطبيقات (API/JSON)
    if (req.xhr || req.headers.accept?.includes("json")) {
      return res.json({ success: true, returnTo });
    }

    // أو إعادة توجيه عادية للمتصفح
    return res.redirect(returnTo);
  } catch (error) {
    req.log?.error({ error }, "Login error");
    return res.status(500).json({ error: "حدث خطأ داخلي أثناء تسجيل الدخول." });
  }
});

// =========================================================
// 4. تسجيل الخروج العادي (Logout)
// =========================================================
router.get("/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  await clearSession(res, sid);
  res.redirect("/");
});

// تنظيف مسارات الموبايل القديمة أو تركها فارغة مستقبلاً
router.post("/mobile-auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (sid) {
    await deleteSession(sid);
  }
  res.json(LogoutMobileSessionResponse.parse({ success: true }));
});

export default router;
