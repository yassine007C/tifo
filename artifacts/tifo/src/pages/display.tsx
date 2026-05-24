import { useEffect, useRef, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetServerStatus, getGetServerStatusQueryKey, useGetMyAssignment, getGetMyAssignmentQueryKey } from "@workspace/api-client-react";

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
      refetchInterval: 2000,
    }
  });

  // Fetch assignment separately so we always have the color even before activation
  const { data: assignment } = useGetMyAssignment(id, {
    query: {
      enabled: !!id,
      queryKey: getGetMyAssignmentQueryKey(id),
    }
  });

  // Prefer status.myColor (returned when active) then fall back to assignment color
  const myColor = status?.myColor ?? assignment?.color ?? null;

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
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      wakeLockRef.current?.release();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleExit = () => {
    setLocation(`/server/${id}`);
  };

  // Still loading initial status
  if (!status && !assignment) {
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

  // Display is active — fill screen with pixel color
  if (status?.isActive) {
    const bgColor = myColor ?? "#111111";
    return (
      <div
        className="fixed inset-0 cursor-pointer transition-colors duration-700 ease-in-out z-50 flex flex-col items-center justify-end pb-8"
        style={{ backgroundColor: bgColor }}
        onClick={handleExit}
        data-testid="display-active"
      >
        <div className="opacity-40 text-white font-black uppercase tracking-widest text-sm pointer-events-none">
          Hold phone up &bull; Tap to exit
        </div>
      </div>
    );
  }

  // Standby — waiting for admin to activate
  return (
    <div
      className="fixed inset-0 bg-black flex flex-col items-center justify-center cursor-pointer z-50 p-8"
      onClick={handleExit}
      data-testid="display-standby"
    >
      {myColor && (
        <div
          className="w-16 h-16 rounded-full border-4 border-white/20 mb-8 shadow-2xl"
          style={{ backgroundColor: myColor }}
          title="Your assigned color"
        />
      )}

      <div className="relative w-24 h-24 mb-10">
        <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" style={{ animationDuration: "3s" }} />
        <div className="absolute inset-4 bg-primary/40 rounded-full animate-ping" style={{ animationDuration: "2s" }} />
        <div className="absolute inset-8 bg-primary rounded-full animate-pulse" />
      </div>

      <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-widest text-center mb-4">
        Standby
      </h1>
      <p className="text-white/60 text-base md:text-lg font-medium tracking-wider text-center uppercase max-w-xs">
        Waiting for admin to go live
      </p>

      <div className="absolute bottom-8 opacity-40 text-white/50 font-bold uppercase tracking-widest text-xs">
        Tap anywhere to return
      </div>
    </div>
  );
}
