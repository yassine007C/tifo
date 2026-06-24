import React, { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        // إذا نجح الدخول، نرسله للصفحة الرئيسية
        window.location.href = "/";
      } else {
        const data = await response.json();
        setError(data.error || "login failed");
      }
    } catch (err) {
      setError("A connection error occurred.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-card text-card-foreground shadow-lg rounded-xl border">
        <h2 className="text-2xl font-bold text-center">Log in</h2>
        
        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-100 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-2 border rounded-md bg-background text-foreground"
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-2 border rounded-md bg-background text-foreground"
              dir="ltr"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 mt-4 text-white bg-primary rounded-md hover:bg-primary/90"
          >
            login
          </button>
        </form>

      </div>

       <p className="text-center text-sm text-muted-foreground">
        You do not have an account?{" "}
        <Link href="/register" className="text-primary font-bold">
          Register
        </Link>
      </p>

      
    </div>


  );
}
