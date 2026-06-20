import React, { useState } from "react";
import { Link } from "wouter";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (response.ok) {
        window.location.href = "/"; // توجيه للرئيسية بعد التسجيل
      } else {
        const data = await response.json();
        setError(data.error || "فشل إنشاء الحساب");
      }
    } catch (err) {
      setError("حدث خطأ في الاتصال بالسيرفر");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-xl border shadow-lg">
        <h2 className="text-2xl font-bold text-center">إنشاء حساب جديد</h2>
        {error && <div className="text-red-500 text-sm">{error}</div>}
        
        <form onSubmit={handleRegister} className="space-y-4">
          <input className="w-full p-2 border rounded" placeholder="الاسم الكامل" value={name} onChange={e => setName(e.target.value)} required />
          <input className="w-full p-2 border rounded" type="email" placeholder="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} required />
          <input className="w-full p-2 border rounded" type="password" placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit" className="w-full py-2 bg-primary text-primary-foreground rounded font-bold uppercase">تسجيل</button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          لديك حساب بالفعل؟ <Link href="/login" className="text-primary font-bold">دخول</Link>
        </p>
      </div>
    </div>
  );
}
