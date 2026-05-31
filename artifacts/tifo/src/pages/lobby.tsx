import { useMemo, useState } from "react";
import { useRoute, Link } from "wouter";
import { Layout } from "@/components/layout";
import {
  useGetServer,
  useGetMyAssignment,
  useListParticipants,
  useUpdateMyPosition,
  useGetServerPixels,
  getGetServerQueryKey,
  getGetMyAssignmentQueryKey,
  getListParticipantsQueryKey,
  getGetServerPixelsQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Maximize, Settings, Loader2 } from "lucide-react";

export default function Lobby() {
  const [, params] = useRoute("/server/:id");
  const id = params?.id ? parseInt(params.id, 10) : 0;
  const { user } = useAuth();
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  const [manualX, setManualX] = useState("");
  const [manualY, setManualY] = useState("");
  const [manualSeat, setManualSeat] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);

  const { data: server, isLoading: isServerLoading } = useGetServer(id, {
    query: { enabled: !!id, queryKey: getGetServerQueryKey(id) },
  });

  const { data: assignment, isLoading: isAssignmentLoading } = useGetMyAssignment(id, {
    query: { enabled: !!id, queryKey: getGetMyAssignmentQueryKey(id) },
  });

  const { data: participants } = useListParticipants(id, {
    query: {
      enabled: !!id,
      queryKey: getListParticipantsQueryKey(id),
      refetchInterval: 3000,
    },
  });

  const { data: pixelData } = useGetServerPixels(id, {
    query: { enabled: !!id, queryKey: getGetServerPixelsQueryKey(id) },
  });

  const updatePosition = useUpdateMyPosition();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleMoveToCell = (x: number, y: number) => {
    const occupants = participantMap.get(`${x},${y}`) ?? [];
    const othersHere = occupants.filter((o) => o.userId !== user?.id);
    if (othersHere.length >= 3) return; // seat full
    if (assignment?.x === x && assignment?.y === y) return; // already here

    updatePosition.mutate(
      { serverId: id, data: { x, y } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMyAssignmentQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListParticipantsQueryKey(id) });
          toast({ title: "Position Updated", description: `Moved to X:${x} Y:${y}` });
        },
        onError: (error: any) => {
          toast({
            title: "Move Failed",
            description: error?.error ?? "That spot may be taken.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const totalPixels = server ? server.width * server.height : 0;

  const seatToCoords = (seat: number) => ({
    x: (seat - 1) % (server?.width ?? 1),
    y: Math.floor((seat - 1) / (server?.width ?? 1)),
  });

  const coordsToSeat = (x: number, y: number) =>
    (server ? y * server.width + x + 1 : 0);

  const handleManualMove = () => {
    if (!server) return;
    setManualError(null);

    const x = parseInt(manualX, 10);
    const y = parseInt(manualY, 10);

    if (isNaN(x) || isNaN(y) || x < 0 || x >= server.width || y < 0 || y >= server.height) {
      setManualError(`X must be 0–${server.width - 1}, Y must be 0–${server.height - 1}`);
      return;
    }

    const occupants = participantMap.get(`${x},${y}`) ?? [];
    const othersHere = occupants.filter((o) => o.userId !== user?.id);
    if (othersHere.length >= 3) {
      setManualError(`Seat ${coordsToSeat(x, y)} is full (3/3)`);
      return;
    }

    handleMoveToCell(x, y);
    setManualX("");
    setManualY("");
    setManualSeat("");
  };

  const onSeatChange = (raw: string) => {
    setManualSeat(raw);
    setManualError(null);
    const seat = parseInt(raw, 10);
    if (!isNaN(seat) && seat >= 1 && seat <= totalPixels) {
      const { x, y } = seatToCoords(seat);
      setManualX(String(x));
      setManualY(String(y));
    } else {
      setManualX("");
      setManualY("");
    }
  };

  const onXChange = (raw: string) => {
    setManualX(raw);
    setManualError(null);
    const x = parseInt(raw, 10);
    const y = parseInt(manualY, 10);
    if (!isNaN(x) && !isNaN(y) && server) {
      setManualSeat(String(coordsToSeat(x, y)));
    } else {
      setManualSeat("");
    }
  };

  const onYChange = (raw: string) => {
    setManualY(raw);
    setManualError(null);
    const x = parseInt(manualX, 10);
    const y = parseInt(raw, 10);
    if (!isNaN(x) && !isNaN(y) && server) {
      setManualSeat(String(coordsToSeat(x, y)));
    } else {
      setManualSeat("");
    }
  };

  const isCreator = server?.creatorId === user?.id;

  const participantMap = useMemo(() => {
    const map = new Map<string, (typeof participants)[0][]>();
    if (participants) {
      participants.forEach((p) => {
        const key = `${p.x},${p.y}`;
        const arr = map.get(key) ?? [];
        arr.push(p);
        map.set(key, arr);
      });
    }
    return map;
  }, [participants]);

  if (isServerLoading || isAssignmentLoading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (!server) {
    return <Layout><div className="text-center pt-24 text-xl">Server not found</div></Layout>;
  }

  const hovered = hoveredCell;
  const hoveredOccupants = hovered ? (participantMap.get(`${hovered.x},${hovered.y}`) ?? []) : [];
  const hoveredIsMe = hovered ? assignment?.x === hovered.x && assignment?.y === hovered.y : false;
  const hoveredIsFull = hoveredOccupants.length >= 3;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-end">
          <div>
            <Link
              href="/"
              className="inline-flex items-center text-sm font-bold text-muted-foreground hover:text-primary uppercase tracking-wider transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Link>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight">{server.name}</h1>
            <div className="flex gap-4 mt-4">
              <Badge
                variant={server.isActive ? "default" : "secondary"}
                className="uppercase font-bold tracking-wider"
              >
                {server.isActive ? "Live" : "Standby"}
              </Badge>
              <Badge variant="outline" className="uppercase font-bold tracking-wider">
                {server.participantCount} / {server.totalPixels * 3} seats
              </Badge>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            {isCreator && (
              <Link href={`/server/${id}/admin`} className="flex-1 md:flex-none">
                <Button variant="secondary" className="w-full font-bold uppercase tracking-wider">
                  <Settings className="w-4 h-4 mr-2" /> Admin
                </Button>
              </Link>
            )}
            <Link href={`/server/${id}/display`} className="flex-1 md:flex-none">
              <Button className="w-full font-bold uppercase tracking-wider h-12 px-8">
                <Maximize className="w-5 h-5 mr-2" /> Enter Display
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: assignment + participants */}
          <div className="lg:col-span-1 space-y-6">
            {/* My assignment */}
            {assignment ? (
              <Card className="bg-card border-2 border-primary/30">
                <CardContent className="pt-6 space-y-4">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground text-center">
                    Your Pixel
                  </p>
                  <div className="flex items-center gap-4">
                    <div
                      className="w-14 h-14 rounded-md border-2 border-white/20 flex-shrink-0 shadow-lg"
                      style={{ backgroundColor: assignment.color }}
                      data-testid="assignment-color"
                    />
                    <div>
                      <div className="text-3xl font-black font-mono">#{assignment.pixelNumber}</div>
                      <div className="text-sm font-bold font-mono text-muted-foreground mt-1">
                        X:{assignment.x} &nbsp; Y:{assignment.y}
                      </div>
                      <div className="text-xs font-mono text-muted-foreground">{assignment.color}</div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
                    Click any empty cell in the grid to move there
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card">
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No pixel assigned yet.
                </CardContent>
              </Card>
            )}

            {/* Jump to Position */}
            {assignment && (
              <Card className="bg-card border border-border">
                <CardContent className="pt-5 space-y-3">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    Jump to Position
                  </p>

                  {/* Seat number */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Seat # <span className="normal-case font-normal">(1–{totalPixels})</span>
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={totalPixels}
                        placeholder={`1–${totalPixels}`}
                        value={manualSeat}
                        onChange={(e) => onSeatChange(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleManualMove()}
                        className="font-mono h-8 text-sm"
                      />
                    </div>
                  </div>

                  {/* X / Y */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Coordinates
                    </label>
                    <div className="flex gap-2 items-center">
                      <span className="text-xs font-mono font-bold text-muted-foreground w-5">X</span>
                      <Input
                        type="number"
                        min={0}
                        max={(server?.width ?? 1) - 1}
                        placeholder={`0–${(server?.width ?? 1) - 1}`}
                        value={manualX}
                        onChange={(e) => onXChange(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleManualMove()}
                        className="font-mono h-8 text-sm"
                      />
                      <span className="text-xs font-mono font-bold text-muted-foreground w-5">Y</span>
                      <Input
                        type="number"
                        min={0}
                        max={(server?.height ?? 1) - 1}
                        placeholder={`0–${(server?.height ?? 1) - 1}`}
                        value={manualY}
                        onChange={(e) => onYChange(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleManualMove()}
                        className="font-mono h-8 text-sm"
                      />
                    </div>
                  </div>

                  {manualError && (
                    <p className="text-xs text-destructive font-bold">{manualError}</p>
                  )}

                  <Button
                    size="sm"
                    className="w-full font-bold uppercase tracking-wider"
                    disabled={(!manualSeat && (!manualX || !manualY)) || updatePosition.isPending}
                    onClick={handleManualMove}
                  >
                    {updatePosition.isPending ? (
                      <><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Moving…</>
                    ) : "Move Here"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Position move feedback */}
            {updatePosition.isPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-bold uppercase tracking-wider">
                <Loader2 className="w-4 h-4 animate-spin" /> Moving...
              </div>
            )}

            {/* Participants list */}
            <div className="space-y-3">
              <h3 className="font-bold uppercase tracking-wider text-muted-foreground text-sm">
                Participants ({participants?.length ?? 0})
              </h3>
              <div className="h-56 overflow-y-auto border border-border rounded-md p-3 bg-background space-y-1">
                {participants?.length ? (
                  participants.map((p) => (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between text-sm p-2 rounded-sm ${p.userId === user?.id ? "bg-primary/10 border border-primary/20" : "hover:bg-card"}`}
                      data-testid={`participant-row-${p.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-sm border border-white/10 flex-shrink-0"
                          style={{ backgroundColor: p.color }}
                        />
                        <span className="font-bold truncate max-w-[100px]">{p.displayName}</span>
                        {p.userId === user?.id && (
                          <span className="text-xs text-primary font-bold uppercase">You</span>
                        )}
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">
                        {p.x},{p.y}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground text-sm pt-4">No participants yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Right column: interactive pixel grid */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold uppercase tracking-wider text-muted-foreground text-sm">
                Grid Overview — {server.width} &times; {server.height}
              </h3>
              {hovered && (
                <div className="text-xs font-mono font-bold text-muted-foreground">
                  X:{hovered.x} Y:{hovered.y} &nbsp;
                  <span className={hoveredIsFull ? "text-destructive" : hoveredOccupants.length > 0 ? "text-yellow-400" : "text-green-500"}>
                    {hoveredOccupants.length}/3
                  </span>
                  {hoveredIsMe && <span className="text-primary ml-2">— you're here</span>}
                  {!hoveredIsMe && hoveredIsFull && <span className="text-destructive ml-2">— full</span>}
                  {!hoveredIsMe && !hoveredIsFull && hoveredOccupants.length > 0 && (
                    <span className="text-yellow-400 ml-2">— click to join</span>
                  )}
                  {!hoveredIsMe && hoveredOccupants.length === 0 && (
                    <span className="text-green-500 ml-2">— click to move here</span>
                  )}
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-white/20 border border-white/10" style={{ opacity: 0.35 }} />
                Empty (0/3)
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-white/80 border border-white/10" style={{ opacity: 0.6 }} />
                1–2 joined
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-white border border-white/10" />
                Full (3/3)
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm border-2 border-white" />
                You
              </div>
            </div>

            <div className="border-2 border-card rounded-xl overflow-hidden bg-[#0a0a0a] p-3 relative">
              <div className="overflow-auto" style={{ maxHeight: "520px" }}>
                <div
                  className="grid gap-[2px]"
                  style={{ gridTemplateColumns: `repeat(${server.width}, minmax(0, 1fr))` }}
                >
                  {Array.from({ length: server.height }).map((_, y) =>
                    Array.from({ length: server.width }).map((_, x) => {
                      const pixelIndex = y * server.width + x;
                      const imageColor = pixelData?.pixels?.[pixelIndex] ?? "#1f1f1f";
                      const occupants = participantMap.get(`${x},${y}`) ?? [];
                      const count = occupants.length;
                      const isMe = assignment?.x === x && assignment?.y === y;
                      const isFull = count >= 3 && !isMe;
                      const isEmpty = count === 0;
                      const isHovered = hoveredCell?.x === x && hoveredCell?.y === y;

                      const ringClass = isMe
                        ? "ring-2 ring-white ring-offset-1 ring-offset-black scale-125 z-10"
                        : "";
                      const cursor = isMe ? "default" : isFull ? "not-allowed" : "pointer";
                      // Graduated brightness: 0→35%, 1→60%, 2→80%, 3→100%
                      const opacity = count === 0 ? 0.35 : count === 1 ? 0.6 : count === 2 ? 0.8 : 1;
                      const titleLines = isEmpty
                        ? `Empty (0/3) — X:${x} Y:${y}\nclick to move here`
                        : `${count}/3 — X:${x} Y:${y}\n${occupants.map((o) => `• ${o.displayName}${o.userId === user?.id ? " (you)" : ""}`).join("\n")}${!isFull && !isMe ? "\nclick to join" : isFull ? "\nfull" : ""}`;

                      return (
                        <div
                          key={`${x}-${y}`}
                          className={`relative transition-all duration-150 ${ringClass}`}
                          style={{
                            backgroundColor: imageColor,
                            aspectRatio: "1",
                            cursor,
                            minWidth: "10px",
                            opacity,
                            filter: !isFull && !isMe && isHovered ? "brightness(1.6)" : "none",
                          }}
                          title={titleLines}
                          onMouseEnter={() => setHoveredCell({ x, y })}
                          onMouseLeave={() => setHoveredCell(null)}
                          onClick={() => { if (!isFull && !isMe) handleMoveToCell(x, y); }}
                          data-testid={`grid-cell-${x}-${y}`}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
