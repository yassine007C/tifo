import { useAuth } from "@workspace/replit-auth-web";
import { useListMyServers } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const { user, isLoading: isAuthLoading, isAuthenticated, login } = useAuth();
  
  const { data: servers, isLoading: isServersLoading } = useListMyServers({
    query: {
      enabled: isAuthenticated,
    }
  });

  if (isAuthLoading) {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center">
          <Skeleton className="w-12 h-12 rounded-full" />
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="space-y-4 max-w-2xl px-4">
            <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter text-primary">
              Be The Pixel
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-xl mx-auto">
              Turn the crowd into a giant living canvas. Join a Tifo server, hold up your phone, and become part of the art.
            </p>
          </div>
            <Link href="/register">
              <Button size="lg" className="text-xl px-12 py-8 font-bold uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground">
                Enter the Stadium
              </Button>
            </Link>
        </div>
      </Layout>
    );
  }

  const myServers = servers?.filter(s => s.creatorId === user?.id) || [];
  const joinedServers = servers?.filter(s => s.creatorId !== user?.id) || [];

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-12 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-end border-b border-border pb-8">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight">Your Tifos</h1>
            <p className="text-muted-foreground mt-2">Manage your servers or join a new one.</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <Link href="/join" className="flex-1 md:flex-none">
              <Button variant="secondary" className="w-full font-bold uppercase tracking-wider">Join Tifo</Button>
            </Link>
            <Link href="/create" className="flex-1 md:flex-none">
              <Button className="w-full font-bold uppercase tracking-wider">Create Tifo</Button>
            </Link>
          </div>
        </div>

        {isServersLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <div className="space-y-12">
            {myServers.length > 0 && (
              <section className="space-y-6">
                <h2 className="text-2xl font-bold uppercase tracking-tight text-muted-foreground">My Tifo Servers</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myServers.map(server => (
                    <ServerCard key={server.id} server={server} isCreator={true} />
                  ))}
                </div>
              </section>
            )}

            {joinedServers.length > 0 && (
              <section className="space-y-6">
                <h2 className="text-2xl font-bold uppercase tracking-tight text-muted-foreground">Servers I've Joined</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {joinedServers.map(server => (
                    <ServerCard key={server.id} server={server} isCreator={false} />
                  ))}
                </div>
              </section>
            )}

            {servers?.length === 0 && (
              <div className="text-center py-24 border-2 border-dashed border-border p-8 bg-card">
                <h3 className="text-2xl font-bold mb-4">No Tifos Yet</h3>
                <p className="text-muted-foreground mb-8">You haven't created or joined any Tifo servers.</p>
                <div className="flex justify-center gap-4">
                  <Link href="/join">
                    <Button variant="secondary" className="font-bold uppercase tracking-wider">Join Tifo</Button>
                  </Link>
                  <Link href="/create">
                    <Button className="font-bold uppercase tracking-wider">Create Tifo</Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

function ServerCard({ server, isCreator }: { server: any, isCreator: boolean }) {
  return (
    <Card className="hover:border-primary/50 transition-colors flex flex-col bg-card">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start mb-2">
          <Badge variant={server.isActive ? "default" : "secondary"} className="uppercase font-bold tracking-wider text-xs">
            {server.isActive ? "Live" : "Standby"}
          </Badge>
          {isCreator && (
            <Badge variant="outline" className="font-mono bg-background text-xs">
              Code: {server.accessCode}
            </Badge>
          )}
        </div>
        <CardTitle className="text-xl font-black uppercase line-clamp-1">{server.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex flex-col">
            <span className="font-bold text-foreground text-xl">{server.participantCount}</span>
            <span className="uppercase tracking-wider text-[10px]">Participants</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-foreground text-xl">{server.width}x{server.height}</span>
            <span className="uppercase tracking-wider text-[10px]">Grid</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-4 border-t border-border mt-auto">
        <Link href={`/server/${server.id}`} className="w-full">
          <Button variant="secondary" className="w-full font-bold uppercase tracking-wider">
            Enter Lobby
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
