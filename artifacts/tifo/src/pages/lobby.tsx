import { useMemo, useState } from "react";
import { useRoute, Link } from "wouter";
import { Layout } from "@/components/layout";
import {
  useGetServer,
  useGetMyAssignment,
  useListParticipants,
  useUpdateMyPosition,
  getGetServerQueryKey,
  getGetMyAssignmentQueryKey,
  getListParticipantsQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Maximize, Settings, Loader2 } from "lucide-react";

export default function Lobby() {
  const [, params] = useRoute("/server/:id");
  const id = params?.id ? parseInt(params.id, 10) : 0;
  const { user } = useAuth();
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);

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

  const updatePosition = useUpdateMyPosition();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleMoveToCell = (x: number, y: number) => {
    const occupant = participantMap.get(`${x},${y}`);
    if (occupant && occupant.userId !== user?.id) return; // taken by someone else
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

  const isCreator = server?.creatorId === user?.id;

  const participantMap = useMemo(() => {
    const map = new Map<string, (typeof participants)[0]>();
    if (participants) {
      participants.forEach((p) => map.set(`${p.x},${p.y}`, p));
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
  const hoveredOccupant = hovered ? participantMap.get(`${hovered.x},${hovered.y}`) : null;
  const hoveredIsMe = hovered && assignment?.x === hovered.x && assignment?.y === hovered.y;
  const hoveredIsTaken = !!hoveredOccupant && !hoveredIsMe;

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
                {server.participantCount} / {server.totalPixels} pixels
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
                  X:{hovered.x} Y:{hovered.y}
                  {hoveredIsMe && <span className="text-primary ml-2">— you</span>}
                  {hoveredIsTaken && (
                    <span className="text-destructive ml-2">— taken by {hoveredOccupant?.displayName}</span>
                  )}
                  {!hoveredIsTaken && !hoveredIsMe && (
                    <span className="text-green-500 ml-2">— click to move here</span>
                  )}
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex gap-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-[#1f1f1f] border border-white/10" />
                Empty
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-primary border border-primary/50" />
                Taken
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm border-2 border-primary" />
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
                      const occupant = participantMap.get(`${x},${y}`);
                      const isMe = assignment?.x === x && assignment?.y === y;
                      const isEmpty = !occupant;
                      const isHovered = hoveredCell?.x === x && hoveredCell?.y === y;

                      let bgColor = "#1f1f1f";
                      let cursor = "default";
                      let ringClass = "";

                      if (occupant) {
                        bgColor = occupant.color;
                        if (isMe) {
                          ringClass = "ring-2 ring-white ring-offset-1 ring-offset-black scale-125 z-10";
                          cursor = "default";
                        }
                      }

                      if (isEmpty && !isMe) {
                        cursor = "pointer";
                        if (isHovered) bgColor = "#2a2a2a";
                      }

                      return (
                        <div
                          key={`${x}-${y}`}
                          className={`relative transition-all duration-150 ${ringClass} ${isEmpty && isHovered ? "brightness-150" : ""}`}
                          style={{
                            backgroundColor: bgColor,
                            aspectRatio: "1",
                            cursor,
                            minWidth: "10px",
                          }}
                          title={
                            occupant
                              ? `${occupant.displayName} — X:${x} Y:${y}`
                              : `Empty — X:${x} Y:${y} — click to move here`
                          }
                          onMouseEnter={() => setHoveredCell({ x, y })}
                          onMouseLeave={() => setHoveredCell(null)}
                          onClick={() => {
                            if (isEmpty) handleMoveToCell(x, y);
                          }}
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
