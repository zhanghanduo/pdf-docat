import { useEffect, useState } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/hooks/use-language";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/DashboardPage";
import HistoryPage from "@/pages/HistoryPage";
import SettingsPage from "@/pages/SettingsPage";
import UsagePage from "@/pages/UsagePage";
import DebugAuth from "@/components/DebugAuth";
import RegisterPage from "@/pages/RegisterPage"; // Added import for RegisterPage


// Protected route component
const ProtectedRoute = ({ component: Component, adminOnly = false, ...rest }: any) => {
  const [location, setLocation] = useLocation();
  const token = localStorage.getItem("token");
  const userDataString = localStorage.getItem("user");
  const userData = userDataString ? JSON.parse(userDataString) : null;
  const isAdmin = userData?.role === "admin";

  useEffect(() => {
    if (!token) {
      // Redirect to auth page if not authenticated
      setLocation("/auth");
    } else if (adminOnly && !isAdmin) {
      // Redirect to dashboard if not admin but trying to access admin-only page
      setLocation("/dashboard");
    }
  }, [token, isAdmin, adminOnly, setLocation]);

  if (!token) {
    return null; // Will redirect via useEffect
  }

  if (adminOnly && !isAdmin) {
    return null; // Will redirect via useEffect
  }

  return <Component {...rest} />;
};

// Auth redirect component
const AuthRedirect = () => {
  const [, setLocation] = useLocation();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (token) {
      setLocation("/dashboard");
    }
  }, [token, setLocation]);

  return <AuthPage />;
};

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthRedirect} />
      <Route path="/register" component={RegisterPage} /> {/* Added register route */}
      <Route path="/dashboard">
        <ProtectedRoute component={DashboardPage} />
      </Route>
      <Route path="/history">
        <ProtectedRoute component={HistoryPage} />
      </Route>
      <Route path="/usage">
        <ProtectedRoute component={UsagePage} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={SettingsPage} adminOnly={true} />
      </Route>
      <Route path="/">
        <Redirect to="/auth" />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
          {process.env.NODE_ENV !== 'production' && <DebugAuth />}
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;