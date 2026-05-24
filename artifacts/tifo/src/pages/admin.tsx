import { useRoute, Link } from "wouter";
import { Layout } from "@/components/layout";
import { 
  useGetServer, 
  useListParticipants, 
  useActivateServer,
  useDeactivateServer,
  getGetServerQueryKey,
  getListParticipantsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Play, Square, Users, Check, Copy } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Admin() {
  const [, params] = useRoute("/server/:id/admin");
  const id = params?.id ? parseInt(params.id, 10) : 0;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [copied, setCopied] = useState(false);

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
      </div>
    </Layout>
  );
}
