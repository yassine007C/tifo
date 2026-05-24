import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Layout } from "@/components/layout";
import { useCreateServer, getListMyServersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  targetWidth: z.coerce.number().min(10).max(200).default(50),
  targetHeight: z.coerce.number().min(10).max(200).default(30),
});

export default function Create() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      targetWidth: 50,
      targetHeight: 30,
    },
  });

  const createServer = useCreateServer();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!imageBase64) {
      toast({
        title: "Image required",
        description: "Please upload an image for your Tifo.",
        variant: "destructive",
      });
      return;
    }

    createServer.mutate({
      data: {
        name: values.name,
        targetWidth: values.targetWidth,
        targetHeight: values.targetHeight,
        imageData: imageBase64,
      }
    }, {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListMyServersQueryKey() });
        toast({
          title: "Server Created!",
          description: `Access Code: ${data.accessCode}`,
        });
        setLocation(`/server/${data.id}`);
      },
      onError: (error) => {
        toast({
          title: "Error creating server",
          description: error.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Link href="/" className="inline-flex items-center text-sm font-bold text-muted-foreground hover:text-primary uppercase tracking-wider transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Link>
        
        <Card className="bg-card">
          <CardHeader className="border-b border-border pb-6">
            <CardTitle className="text-3xl font-black uppercase tracking-tight">Create Tifo</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                <div className="space-y-4">
                  <h3 className="text-lg font-bold uppercase tracking-wider text-muted-foreground">1. Upload Artwork</h3>
                  <div className="border-2 border-dashed border-border p-8 text-center bg-background hover:border-primary/50 transition-colors relative group">
                    <input 
                      type="file" 
                      accept="image/jpeg,image/png,image/webp" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      onChange={handleImageUpload}
                    />
                    
                    {imageBase64 ? (
                      <div className="space-y-4">
                        <img src={imageBase64} alt="Preview" className="max-h-48 mx-auto object-contain" />
                        <p className="text-sm font-bold text-primary uppercase tracking-wider">Click to change image</p>
                      </div>
                    ) : (
                      <div className="space-y-4 pointer-events-none">
                        <Upload className="w-12 h-12 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
                        <div>
                          <p className="font-bold text-lg">Drag & drop or click to upload</p>
                          <p className="text-sm text-muted-foreground">JPEG, PNG, or WEBP</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-bold uppercase tracking-wider text-muted-foreground">2. Details</h3>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold uppercase tracking-wider">Server Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. North Curve Derby" className="text-lg py-6" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="targetWidth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold uppercase tracking-wider">Grid Width</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormDescription>Columns of pixels</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="targetHeight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold uppercase tracking-wider">Grid Height</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormDescription>Rows of pixels</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full text-lg py-8 font-black uppercase tracking-widest"
                  disabled={createServer.isPending}
                >
                  {createServer.isPending ? (
                    <><Loader2 className="w-6 h-6 mr-2 animate-spin" /> Creating...</>
                  ) : (
                    "Initialize Tifo"
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
