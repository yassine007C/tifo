import { useEffect, useRef, useState } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useGetServerStatus,
  getGetServerStatusQueryKey,
  useGetMyAssignment,
  getGetMyAssignmentQueryKey,
} from "@workspace/api-client-react";

export default function Display() {
  const [, params] = useRoute("/server/:id/display");
  const [, setLocation] = useLocation();
  const id = params?.id ? parseInt(params.id, 10) : 0;

  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const [_wakeLockError, setWakeLockError] = useState(false);

  const { data: status } = useGetServerStatus(id, {
    query: {
      enabled: !!id,
      queryKey: getGetServerStatusQueryKey(id),
      refetchInterval: 1000,
    },
  });

  // Always fetch assignment so color is visible immediately, before go-live
  const { data: assignment } = useGetMyAssignment(id, {
    query: {
      enabled: !!id,
      queryKey: getGetMyAssignmentQueryKey(id),
    },
  });

  const myColor = status?.myColor ?? assignment?.color ?? null;
  const isActive = status?.isActive ?? false;

  useEffect(() => {
    async function requestWakeLock() {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
        }
      } catch {
        setWakeLockError(true);
      }
    }

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") requestWakeLock();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      wakeLockRef.current?.release();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleExit = () => setLocation(`/server/${id}`);

  // Still loading — show spinner
  if (!assignment && !status) {
    return (
      <div
        className="fixed inset-0 bg-black flex items-center justify-center cursor-pointer"
        onClick={handleExit}
        data-testid="display-loading"
      >
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Color is always shown as the background.
  // Before go-live: a dark overlay + standby message sits on top.
  // After go-live: overlay fades out, full pure color.
  return (
    <div
      className="fixed inset-0 cursor-pointer z-50 transition-colors duration-700"
      style={{ backgroundColor: myColor ?? "#111111" }}
      onClick={handleExit}
      data-testid="display-screen"
    >
      {/* Standby overlay — slides down off-screen when go-live is triggered */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center transition-transform duration-1000 ease-in-out"
        style={{ transform: isActive ? "translateY(100%)" : "translateY(0)", pointerEvents: isActive ? "none" : "auto" }}
      >
        {/* Dark wash so text is readable over any color */}
        <div className="absolute inset-0 bg-black/70" />

        <div className="relative z-10 flex flex-col items-center gap-6 px-8 text-center">
          {/* Color preview dot */}
          {myColor && (
            <div
              className="w-20 h-20 rounded-full border-4 border-white/30 shadow-2xl"
              style={{ backgroundColor: myColor }}
              data-testid="color-preview-dot"
            />
          )}

          {/* Pulse indicator */}
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 bg-primary/30 rounded-full animate-ping" style={{ animationDuration: "2.5s" }} />
            <div className="absolute inset-3 bg-primary/50 rounded-full animate-ping" style={{ animationDuration: "1.8s" }} />
            <div className="absolute inset-5 bg-primary rounded-full animate-pulse" />
          </div>

          <h1 className="text-4xl font-black text-white uppercase tracking-widest">Standby</h1>
          <p className="text-white/60 text-base uppercase tracking-wider font-bold">
            Waiting for admin to go live
          </p>
        </div>
      </div>

      {/* Active hint — visible only after go-live */}
      {isActive && (
        <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none">
          <p className="text-white/40 font-black uppercase tracking-widest text-sm">
            Hold phone up &bull; Tap to exit
          </p>
        </div>
      )}
    </div>
  );
}
