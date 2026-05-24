import { useEffect, useMemo, useState } from "react";
import { useRoute, Link } from "wouter";
import { Layout } from "@/components/layout";
import { 
  useGetServer, 
  useGetMyAssignment, 
  useListParticipants, 
  useUpdateMyPosition,
  getGetServerQueryKey,
  getGetMyAssignmentQueryKey,
  getListParticipantsQueryKey
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

  const { data: server, isLoading: isServerLoading } = useGetServer(id, {
    query: {
      enabled: !!id,
      queryKey: getGetServerQueryKey(id),
    }
  });

  const { data: assignment, isLoading: isAssignmentLoading } = useGetMyAssignment(id, {
    query: {
      enabled: !!id,
      queryKey: getGetMyAssignmentQueryKey(id),
    }
  });

  const { data: participants } = useListParticipants(id, {
    query: {
      enabled: !!id,
      queryKey: getListParticipantsQueryKey(id),
      refetchInterval: 5000, // Refresh participants list every 5s
    }
  });

  const updatePosition = useUpdateMyPosition();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleUpdatePosition = (x: number, y: number) => {
    updatePosition.mutate(
      { id, data: { x, y } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMyAssignmentQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListParticipantsQueryKey(id) });
          toast({
            title: "Position Updated",
            description: `You are now at X:${x} Y:${y}`,
          });
        },
        onError: (error) => {
          toast({
            title: "Update Failed",
            description: error.error || "Failed to update position",
            variant: "destructive",
          });
        }
      }
    );
  };

  const isCreator = server?.creatorId === user?.id;

  const participantMap = useMemo(() => {
    const map = new Map();
    if (participants) {
      participants.forEach(p => {
        map.set(`${p.x},${p.y}`, p);
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

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-end">
          <div>
            <Link href="/" className="inline-flex items-center text-sm font-bold text-muted-foreground hover:text-primary uppercase tracking-wider transition-colors mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Link>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight">{server.name}</h1>
            <div className="flex gap-4 mt-4">
              <Badge variant={server.isActive ? "default" : "secondary"} className="uppercase font-bold tracking-wider">
                {server.isActive ? "Live" : "Standby"}
              </Badge>
              <Badge variant="outline" className="uppercase font-bold tracking-wider">
                {server.participantCount} / {server.totalPixels}
              </Badge>
            </div>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
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
          <div className="lg:col-span-1 space-y-8">
            {assignment ? (
              <Card className="bg-card border-2 border-primary/20">
                <CardContent className="pt-6 space-y-6">
                  <div className="text-center">
                    <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">Your Pixel</p>
                    <div className="text-5xl font-black font-mono">#{assignment.pixelNumber}</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-center border-t border-border pt-6">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Position</p>
                      <p className="text-xl font-bold font-mono mt-1">X:{assignment.x} Y:{assignment.y}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Color</p>
                      <div className="flex items-center justify-center gap-2 mt-1">
                        <div 
                          className="w-6 h-6 rounded-sm border border-border" 
                          style={{ backgroundColor: assignment.color }} 
                        />
                        <span className="font-mono font-bold uppercase">{assignment.color}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card">
                <CardContent className="pt-6 text-center text-muted-foreground">
                  You are not assigned a pixel yet.
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              <h3 className="font-bold uppercase tracking-wider text-muted-foreground">Participants ({participants?.length || 0})</h3>
              <div className="h-64 overflow-y-auto border border-border rounded-md p-4 bg-background space-y-2">
                {participants?.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm p-2 hover:bg-card rounded-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-sm border border-border" style={{ backgroundColor: p.color }} />
                      <span className="font-bold">{p.displayName}</span>
                    </div>
                    <span className="font-mono text-muted-foreground">#{p.pixelNumber}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-bold uppercase tracking-wider text-muted-foreground">Grid Overview</h3>
            <div className="border-4 border-card rounded-xl overflow-hidden bg-black p-4 relative">
              <div className="overflow-auto w-full h-[600px] flex items-center justify-center">
                <div 
                  className="grid gap-[1px] bg-border p-[1px]"
                  style={{
                    gridTemplateColumns: `repeat(${server.width}, minmax(12px, 1fr))`,
                    gridTemplateRows: `repeat(${server.height}, minmax(12px, 1fr))`,
                    width: 'fit-content'
                  }}
                >
                  {Array.from({ length: server.height }).map((_, y) => 
                    Array.from({ length: server.width }).map((_, x) => {
                      const participant = participantMap.get(`${x},${y}`);
                      const isMe = assignment?.x === x && assignment?.y === y;
                      return (
                        <div 
                          key={`${x}-${y}`} 
                          className={`w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 transition-all duration-300 ${isMe ? 'ring-2 ring-primary scale-125 z-10' : ''}`}
                          style={{ 
                            backgroundColor: participant ? participant.color : '#1f1f1f',
                            opacity: participant ? 1 : 0.5
                          }}
                          title={participant ? `${participant.displayName} (${x},${y})` : `Empty (${x},${y})`}
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
