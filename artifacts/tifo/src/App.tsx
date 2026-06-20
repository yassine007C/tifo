import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Create from "@/pages/create";
import Join from "@/pages/join";
import Lobby from "@/pages/lobby";
import Display from "@/pages/display";
import Admin from "@/pages/admin";
import Login from "./pages/login";


حسب مكتبة التوجيه لديك
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/create" component={Create} />
      <Route path="/join" component={Join} />
      <Route path="/server/:id" component={Lobby} />
      <Route path="/server/:id/display" component={Display} />
      <Route path="/server/:id/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
      <Route path="/login" component={Login} /> 
    </QueryClientProvider>
  );
}

export default App;
