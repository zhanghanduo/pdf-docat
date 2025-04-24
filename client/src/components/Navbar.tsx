import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface NavbarProps {
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onLogout }) => {
  const [location, setLocation] = useLocation();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user data from local storage
  const userDataString = localStorage.getItem("user");
  const userData = userDataString ? JSON.parse(userDataString) : null;
  const isAdmin = userData?.role === "admin";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    queryClient.clear();
    toast({
      title: "Logged out successfully",
      description: "You have been logged out of your account",
    });
    setLocation("/login");
    if (onLogout) onLogout();
  };

  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <button
                onClick={toggleMobileMenu}
                className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                {showMobileMenu ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
              <span className="text-2xl font-bold text-primary">DocuMind</span>
            </div>
            <div className="hidden md:ml-6 md:flex md:space-x-8">
              <Link href="/dashboard">
                <a
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    location === "/dashboard"
                      ? "border-primary text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  Dashboard
                </a>
              </Link>
              <Link href="/history">
                <a
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    location === "/history"
                      ? "border-primary text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  History
                </a>
              </Link>
              {isAdmin && (
                <Link href="/settings">
                  <a
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      location === "/settings"
                        ? "border-primary text-gray-900"
                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    }`}
                  >
                    Settings
                  </a>
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center">
            <div className="ml-3 relative">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-700 mr-2">
                  {userData?.email}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="ml-2 p-1 border-2 border-transparent text-gray-400 rounded-full hover:text-gray-500 focus:outline-none focus:text-gray-500 focus:bg-gray-100 transition duration-150 ease-in-out"
                >
                  <LogOut className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {showMobileMenu && (
        <div className="md:hidden">
          <div className="pt-2 pb-3 space-y-1">
            <Link href="/dashboard">
              <a
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  location === "/dashboard"
                    ? "border-primary text-primary bg-primary-50"
                    : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                }`}
                onClick={() => setShowMobileMenu(false)}
              >
                Dashboard
              </a>
            </Link>
            <Link href="/history">
              <a
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  location === "/history"
                    ? "border-primary text-primary bg-primary-50"
                    : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                }`}
                onClick={() => setShowMobileMenu(false)}
              >
                History
              </a>
            </Link>
            {isAdmin && (
              <Link href="/settings">
                <a
                  className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                    location === "/settings"
                      ? "border-primary text-primary bg-primary-50"
                      : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                  }`}
                  onClick={() => setShowMobileMenu(false)}
                >
                  Settings
                </a>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
