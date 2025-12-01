import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useEffect, useState } from "react";
import Dashboard from "@/pages/Dashboard";
import Settings from "@/pages/Settings";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/not-found";
import ValuationConsole from "@/pages/ValuationConsole";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Connections from "@/pages/Connections";
import { User } from "@shared/schema";
import { ThemeProvider } from "@/contexts/ThemeContext";

function Router() {
  const [location] = useLocation();
  const showSidebar = location !== "/login" && location !== "/register" && location !== "/landing";
  const isLandingPage = location === "/landing";

  if (isLandingPage) {
    return (
      <>
        <Switch>
          <Route path="/landing" component={Landing} />
        </Switch>
        <Toaster />
      </>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {showSidebar && <Sidebar />}
      <div className="flex flex-col flex-1 w-0 overflow-hidden">
        {showSidebar && <Header />}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/valuation/550-w-surf-504" component={ValuationConsole} />
            <Route path="/connections" component={Connections} />
            <Route path="/settings" component={Settings} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
      <Toaster />
    </div>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auto-login for demo purposes
    fetch("/api/session")
      .then(res => res.json())
      .then(data => {
        setUser(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to get session:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Router />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
