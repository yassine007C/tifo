import { useEffect, useRef, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetMyAssignment, getGetMyAssignmentQueryKey } from "@workspace/api-client-react";

export default function Display() {
  const [, params] = useRoute("/server/:id/display");
  const [, setLocation] = useLocation();
  const id = params?.id ? parseInt(params.id, 10) : 0;

  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const [_wakeLockError, setWakeLockError] = useState(false);

  const { data: assignment } = useGetMyAssignment(id, {
    query: { enabled: !!id, queryKey: getGetMyAssignmentQueryKey(id) },
  });

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

  const myColor = assignment?.color ?? "#111111";

  return (
    <div
      className="fixed inset-0 cursor-pointer z-50"
      style={{ backgroundColor: myColor }}
      onClick={() => setLocation(`/server/${id}`)}
      data-testid="display-screen"
    />
  );
}
