import { ReactNode } from "react";
import { Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";

export function Layout({ children, hideNav = false }: { children: ReactNode, hideNav?: boolean }) {
  const { user, isAuthenticated } = useAuth();

  // توجيه تسجيل الخروج للمسار العادي الذي برمجناه في السيرفر
  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {!hideNav && (
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="font-black text-2xl tracking-tighter text-primary hover:text-primary/80 transition-colors uppercase">
              TIFO
            </Link>
            
            {/* التحقق: إذا كان مسجلاً نعرض بياناته، وإذا لم يكن نعرض زر الدخول */}
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-muted-foreground hidden md:inline-block">
                  {user?.firstName || user?.email}
                </span>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="font-bold uppercase tracking-wider text-xs">
                  Log out
                </Button>
              </div>
            ) : (
              // الزر الجديد الذي يوجه المستخدم لصفحة الواجهة
              <Link href="/login">
                <Button variant="default" size="sm" className="font-bold uppercase tracking-wider text-xs">
                  Log in
                </Button>
              </Link>
            )}
          </div>
        </header>
      )}
      
      <main className="flex-1 p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
