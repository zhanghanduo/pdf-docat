import { useEffect, useState } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import HistoryPage from "@/pages/HistoryPage";
import SettingsPage from "@/pages/SettingsPage";

// Protected route component
const ProtectedRoute = ({ component: Component, adminOnly = false, ...rest }: any) => {
  const [location, setLocation] = useLocation();
  const token = localStorage.getItem("token");
  const userDataString = localStorage.getItem("user");
  const userData = userDataString ? JSON.parse(userDataString) : null;
  const isAdmin = userData?.role === "admin";

  useEffect(() => {
    if (!token) {
      // Redirect to login if not authenticated
      setLocation("/login");
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

// Login redirect component
const LoginRedirect = () => {
  const [, setLocation] = useLocation();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (token) {
      setLocation("/dashboard");
    }
  }, [token, setLocation]);

  return <LoginPage />;
};

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginRedirect} />
      <Route path="/dashboard">
        <ProtectedRoute component={DashboardPage} />
      </Route>
      <Route path="/history">
        <ProtectedRoute component={HistoryPage} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={SettingsPage} adminOnly={true} />
      </Route>
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
