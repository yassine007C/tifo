import { useRoute, Link } from "wouter";
import { Layout } from "@/components/layout";
import { 
  useGetServer, 
  useListParticipants,
  useGetServerPixels,
  useActivateServer,
  useDeactivateServer,
  getGetServerQueryKey,
  getListParticipantsQueryKey,
  getGetServerPixelsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Play, Square, Users, Check, Copy, Grid3X3, Download } from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Admin() {
  const [, params] = useRoute("/server/:id/admin");
  const id = params?.id ? parseInt(params.id, 10) : 0;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [copied, setCopied] = useState(false);
  const [showSeatMap, setShowSeatMap] = useState(false);

  const { data: server, isLoading: isServerLoading } = useGetServer(id, {
    query: {
      enabled: !!id,
      queryKey: getGetServerQueryKey(id),
    }
  });

  const { data: participants } = useListParticipants(id, {
    query: {
      enabled: !!id,
      queryKey: getListParticipantsQueryKey(id),
      refetchInterval: 5000,
    }
  });

  const { data: pixelData } = useGetServerPixels(id, {
    query: {
      enabled: !!id && showSeatMap,
      queryKey: getGetServerPixelsQueryKey(id),
    },
  });

  const participantMap = useMemo(() => {
    const map = new Map<string, (typeof participants)[0][]>();
    participants?.forEach((p) => {
      const key = `${p.x},${p.y}`;
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    });
    return map;
  }, [participants]);

  const downloadSeatMap = useCallback(() => {
    if (!server || !pixelData?.pixels) return;

    const CELL = server.width <= 30 ? 28 : server.width <= 50 ? 22 : 16;
    const AXIS = 36;
    const STEP = server.width <= 20 ? 1 : server.width <= 50 ? 5 : 10;
    const fontSize = CELL >= 26 ? 7 : CELL >= 20 ? 5.5 : 4;
    const SCALE = 2; // retina

    const canvasW = AXIS + server.width * CELL;
    const canvasH = AXIS + server.height * CELL + AXIS;

    const canvas = document.createElement("canvas");
    canvas.width = canvasW * SCALE;
    canvas.height = canvasH * SCALE;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(SCALE, SCALE);

    // Background
    ctx.fillStyle = "#0d0d0d";
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Top X-axis labels
    ctx.fillStyle = "rgba(180,180,180,0.8)";
    ctx.font = `bold 8px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    for (let x = 0; x < server.width; x++) {
      if (x % STEP === 0)
        ctx.fillText(String(x), AXIS + x * CELL + CELL / 2, AXIS - 2);
    }

    // Cells + Y-axis labels
    for (let y = 0; y < server.height; y++) {
      if (y % STEP === 0) {
        ctx.fillStyle = "rgba(180,180,180,0.8)";
        ctx.font = `bold 8px monospace`;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(String(y), AXIS - 3, AXIS + y * CELL + CELL / 2);
      }

      for (let x = 0; x < server.width; x++) {
        const idx = y * server.width + x;
        const seat = idx + 1;
        const color = pixelData.pixels[idx] ?? "#2a2a2a";
        const count = participantMap.get(`${x},${y}`)?.length ?? 0;
        const cx = AXIS + x * CELL;
        const cy = AXIS + y * CELL;

        // 🛠️ الإصلاح هنا: تعريف متغير occupied 
        const occupied = count > 0;

        ctx.globalAlpha = count === 0 ? 0.25 : count === 1 ? 0.55 : count === 2 ? 0.78 : 1;
        ctx.fillStyle = color;
        ctx.fillRect(cx, cy, CELL, CELL);

        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(cx + 0.25, cy + 0.25, CELL - 0.5, CELL - 0.5);

        ctx.globalAlpha = occupied ? 0.85 : 0.6; // الآن سيعمل هذا السطر بنجاح
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(seat), cx + CELL / 2, cy + CELL / 2);
      }
    }
    ctx.globalAlpha = 1;

    // Bottom X-axis labels
    ctx.fillStyle = "rgba(180,180,180,0.8)";
    ctx.font = `bold 8px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let x = 0; x < server.width; x++) {
      if (x % STEP === 0)
        ctx.fillText(String(x), AXIS + x * CELL + CELL / 2, AXIS + server.height * CELL + 2);
    }

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tifo-seat-map-${server.accessCode}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }, [server, pixelData, participantMap]);

  const activateServer = useActivateServer();
  const deactivateServer = useDeactivateServer();

  const handleActivate = () => {
    activateServer.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetServerQueryKey(id) });
        toast({ title: "Display Activated", description: "All phones are now showing their colors." });
      }
    });
  };

  const handleDeactivate = () => {
    deactivateServer.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetServerQueryKey(id) });
        toast({ title: "Display Deactivated", description: "Phones returned to standby." });
      }
    });
  };

  const copyCode = () => {
    if (server) {
      navigator.clipboard.writeText(server.accessCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copied!", description: "Access code copied to clipboard" });
    }
  };

  if (isServerLoading) {
    return <Layout><div className="p-8"><Skeleton className="h-64" /></div></Layout>;
  }

  if (!server) return <Layout>Not found</Layout>;

  const fillPercentage = Math.round((server.participantCount / server.totalPixels) * 100);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
        <div>
          <Link href={`/server/${id}`} className="inline-flex items-center text-sm font-bold text-muted-foreground hover:text-primary uppercase tracking-wider transition-colors mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Lobby
          </Link>
          <h1 className="text-4xl font-black uppercase tracking-tight">Admin Controls</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="bg-card border-primary/20 border-2">
            <CardHeader>
              <CardTitle className="uppercase tracking-wider font-black">Activation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 border border-border bg-background rounded-md flex items-center justify-between">
                <div>
                  <p className="font-bold uppercase tracking-wider text-sm text-muted-foreground">Status</p>
                  <p className={`text-2xl font-black uppercase ${server.isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                    {server.isActive ? 'Live' : 'Standby'}
                  </p>
                </div>
                <div className="relative">
                  {server.isActive && <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />}
                  <div className={`w-6 h-6 rounded-full border-2 ${server.isActive ? 'bg-primary border-primary' : 'bg-transparent border-muted-foreground'}`} />
                </div>
              </div>

              {server.isActive ? (
                <Button 
                  size="lg" 
                  variant="destructive" 
                  className="w-full text-lg py-8 font-black uppercase tracking-widest"
                  onClick={handleDeactivate}
                  disabled={deactivateServer.isPending}
                >
                  <Square className="w-6 h-6 mr-2" /> Stop Display
                </Button>
              ) : (
                <Button 
                  size="lg" 
                  className="w-full text-lg py-8 font-black uppercase tracking-widest bg-primary hover:bg-primary/90"
                  onClick={handleActivate}
                  disabled={activateServer.isPending}
                >
                  <Play className="w-6 h-6 mr-2" /> Go Live
                </Button>
              )}
            </CardContent>
          </Card>

          <div className="space-y-8">
            <Card className="bg-card">
              <CardContent className="pt-6">
                <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Access Code</p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-background border border-border p-4 text-center text-4xl tracking-[0.2em] font-mono font-black rounded-md">
                    {server.accessCode}
                  </div>
                  <Button variant="outline" className="h-auto px-6" onClick={copyCode}>
                    {copied ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardContent className="pt-6 flex items-center gap-6">
                <div className="p-4 bg-primary/10 rounded-full text-primary">
                  <Users className="w-10 h-10" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-baseline mb-2">
                    <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Capacity</p>
                    <p className="font-mono font-bold text-xl">{server.participantCount} / {server.totalPixels}</p>
                  </div>
                  <div className="w-full h-4 bg-background border border-border rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-500" style={{ width: `${fillPercentage}%` }} />
                  </div>
                  <p className="text-xs text-right mt-1 font-bold text-muted-foreground">{fillPercentage}% Full</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        {/* Seat Map */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">Seat Map</h2>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mt-1">
                {server.width} × {server.height} grid — {server.participantCount} of {server.totalPixels} filled
              </p>
            </div>
            <Button
              variant={showSeatMap ? "default" : "outline"}
              className="font-bold uppercase tracking-wider"
              onClick={() => setShowSeatMap((v) => !v)}
            >
              <Grid3X3 className="w-4 h-4 mr-2" />
              {showSeatMap ? "Hide Map" : "Show Map"}
            </Button>
          </div>

          {showSeatMap && (
            <Card className="bg-card overflow-hidden">
              <CardContent className="p-4 space-y-3">
                {/* Legend + download */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex gap-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm border border-white/20 opacity-35 bg-white/20" />
                      Empty
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm border border-white/20 bg-primary" />
                      Occupied
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="font-bold uppercase tracking-wider shrink-0"
                    disabled={!pixelData?.pixels}
                    onClick={downloadSeatMap}
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Download PNG
                  </Button>
                </div>

                {/* Scrollable grid */}
                <div className="overflow-auto rounded border border-border bg-black/40">
                  {(() => {
                    const CELL = server.width <= 30 ? 28 : server.width <= 50 ? 22 : 16;
                    const AXIS = 32;
                    const STEP = server.width <= 20 ? 1 : server.width <= 50 ? 5 : 10;
                    const fontSize = CELL >= 26 ? 7 : CELL >= 20 ? 5.5 : 4;

                    return (
                      <div style={{ display: "inline-block", minWidth: "100%" }}>
                        {/* X-axis header */}
                        <div className="flex" style={{ paddingLeft: AXIS }}>
                          {Array.from({ length: server.width }, (_, x) => (
                            <div
                              key={x}
                              style={{ width: CELL, flexShrink: 0, fontSize: 8 }}
                              className="flex items-end justify-center pb-0.5 font-mono font-bold text-muted-foreground/70 leading-none"
                            >
                              {x % STEP === 0 ? x : ""}
                            </div>
                          ))}
                        </div>

                        {/* Data rows */}
                        {Array.from({ length: server.height }, (_, y) => (
                          <div key={y} className="flex">
                            {/* Y-axis label */}
                            <div
                              style={{ width: AXIS, flexShrink: 0, fontSize: 8 }}
                              className="flex items-center justify-end pr-1.5 font-mono font-bold text-muted-foreground/70 leading-none"
                            >
                              {y % STEP === 0 ? y : ""}
                            </div>

                            {/* Cells */}
                            {Array.from({ length: server.width }, (_, x) => {
                              const pixelIndex = y * server.width + x;
                              const seatNumber = pixelIndex + 1;
                              const imageColor = pixelData?.pixels?.[pixelIndex] ?? "#2a2a2a";
                              const occupants = participantMap.get(`${x},${y}`) ?? [];
                              const count = occupants.length;
                              const cellOpacity = count === 0 ? 0.25 : count === 1 ? 0.55 : count === 2 ? 0.78 : 1;

                              return (
                                <div
                                  key={x}
                                  title={`Seat ${seatNumber}  X:${x} Y:${y}  (${count}/3)${occupants.map((o) => `\n• ${o.displayName}`).join("")}`}
                                  style={{
                                    width: CELL,
                                    height: CELL,
                                    flexShrink: 0,
                                    backgroundColor: imageColor,
                                    opacity: cellOpacity,
                                    outline: "1px solid rgba(0,0,0,0.25)",
                                  }}
                                  className="relative flex items-center justify-center overflow-hidden"
                                >
                                  <span
                                    style={{ fontSize, lineHeight: 1 }}
                                    className="font-mono font-bold text-white/80 select-none drop-shadow-sm"
                                  >
                                    {seatNumber}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ))}

                        {/* X-axis footer (repeat for tall grids) */}
                        <div className="flex" style={{ paddingLeft: AXIS }}>
                          {Array.from({ length: server.width }, (_, x) => (
                            <div
                              key={x}
                              style={{ width: CELL, flexShrink: 0, fontSize: 8 }}
                              className="flex items-start justify-center pt-0.5 font-mono font-bold text-muted-foreground/70 leading-none"
                            >
                              {x % STEP === 0 ? x : ""}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
