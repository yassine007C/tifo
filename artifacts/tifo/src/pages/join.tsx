import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Layout } from "@/components/layout";
import { useJoinServer, getListMyServersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const formSchema = z.object({
  accessCode: z.string().length(6, "Access code must be exactly 6 characters").toUpperCase(),
});

export default function Join() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accessCode: "",
    },
  });

  const joinServer = useJoinServer();

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    joinServer.mutate({
      data: {
        accessCode: values.accessCode,
      }
    }, {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListMyServersQueryKey() });
        toast({
          title: "Joined Successfully!",
          description: `You are now in ${data.server.name}`,
        });
        setLocation(`/server/${data.server.id}`);
      },
      onError: (error) => {
        toast({
          title: "Error joining",
          description: error.error || "Invalid access code",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto space-y-6 pt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Link href="/" className="inline-flex items-center text-sm font-bold text-muted-foreground hover:text-primary uppercase tracking-wider transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Link>
        
        <Card className="bg-card">
          <CardHeader className="border-b border-border pb-6 text-center">
            <CardTitle className="text-3xl font-black uppercase tracking-tight">Join Tifo</CardTitle>
          </CardHeader>
          <CardContent className="pt-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                <FormField
                  control={form.control}
                  name="accessCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold uppercase tracking-wider text-center block">Enter Access Code</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="XXXXXX" 
                          className="text-4xl h-20 text-center uppercase font-mono tracking-[0.5em] bg-background" 
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormMessage className="text-center" />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full text-lg py-8 font-black uppercase tracking-widest"
                  disabled={joinServer.isPending}
                >
                  {joinServer.isPending ? (
                    <><Loader2 className="w-6 h-6 mr-2 animate-spin" /> Joining...</>
                  ) : (
                    "Join Stadium"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
