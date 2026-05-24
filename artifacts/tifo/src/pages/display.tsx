import { useEffect, useRef, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetServerStatus, getGetServerStatusQueryKey } from "@workspace/api-client-react";

export default function Display() {
  const [, params] = useRoute("/server/:id/display");
  const [, setLocation] = useLocation();
  const id = params?.id ? parseInt(params.id, 10) : 0;
  
  const wakeLockRef = useRef<any>(null);
  const [wakeLockError, setWakeLockError] = useState(false);

  const { data: status } = useGetServerStatus(id, {
    query: {
      enabled: !!id,
      queryKey: getGetServerStatusQueryKey(id),
      refetchInterval: 2000, // Poll every 2 seconds
    }
  });

  useEffect(() => {
    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.error(`${err.name}, ${err.message}`);
        setWakeLockError(true);
      }
    }
    
    requestWakeLock();
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleExit = () => {
    setLocation(`/server/${id}`);
  };

  if (!status) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center cursor-pointer" onClick={handleExit}>
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status.isActive && status.myColor) {
    return (
      <div 
        className="fixed inset-0 cursor-pointer transition-colors duration-1000 ease-in-out z-50 flex flex-col items-center justify-end pb-8"
        style={{ backgroundColor: status.myColor }}
        onClick={handleExit}
      >
        <div className="opacity-30 mix-blend-difference text-white font-black uppercase tracking-widest text-sm pointer-events-none animate-pulse">
          Hold phone up • Tap to exit
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center cursor-pointer z-50 p-8" onClick={handleExit}>
      <div className="relative w-32 h-32 mb-12">
        <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
        <div className="absolute inset-4 bg-primary/40 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
        <div className="absolute inset-8 bg-primary rounded-full animate-pulse" />
      </div>
      
      <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-widest text-center mb-4">
        Standby
      </h1>
      <p className="text-white/60 text-lg md:text-xl font-medium tracking-wider text-center uppercase max-w-sm">
        Waiting for admin to activate the display...
      </p>
      
      <div className="absolute bottom-8 opacity-50 text-white/50 font-bold uppercase tracking-widest text-sm">
        Tap anywhere to return
      </div>
    </div>
  );
}
