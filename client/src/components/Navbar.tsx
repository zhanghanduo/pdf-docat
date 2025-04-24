import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, LogOut, FileText, History, Settings, Cat, Globe, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavbarProps {
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onLogout }) => {
  const [location, setLocation] = useLocation();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { language, setLanguage, t } = useLanguage();

  // Get user data from local storage
  const userDataString = localStorage.getItem("user");
  const userData = userDataString ? JSON.parse(userDataString) : null;
  const isAdmin = userData?.role === "admin";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    queryClient.clear();
    toast({
      title: t("Logged out successfully"),
      description: t("You have been logged out of your account"),
    });
    setLocation("/login");
    if (onLogout) onLogout();
  };

  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-50 glass-effect">
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
              <div className="flex items-center gap-2">
                <Cat className="w-8 h-8 text-primary" />
                <span className="text-2xl font-bold gradient-heading">DocCat</span>
              </div>
            </div>
            <div className="hidden md:ml-6 md:flex md:space-x-4">
              <button 
                onClick={() => setLocation("/dashboard")} 
                className={`nav-item ${location === "/dashboard" ? "active" : ""}`}
              >
                <FileText className="w-4 h-4" />
                {t('dashboard')}
              </button>
              <button 
                onClick={() => setLocation("/history")} 
                className={`nav-item ${location === "/history" ? "active" : ""}`}
              >
                <History className="w-4 h-4" />
                {t('history')}
              </button>
              <button 
                onClick={() => setLocation("/usage")} 
                className={`nav-item ${location === "/usage" ? "active" : ""}`}
              >
                <CreditCard className="w-4 h-4" />
                {t('usage')}
              </button>
              {isAdmin && (
                <button 
                  onClick={() => setLocation("/settings")} 
                  className={`nav-item ${location === "/settings" ? "active" : ""}`}
                >
                  <Settings className="w-4 h-4" />
                  {t('settings')}
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center">
            <div className="ml-3 relative">
              <div className="flex items-center">
                {/* Language selector */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="mr-3">
                      <Globe className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => setLanguage('zh-CN')}
                      className={language === 'zh-CN' ? 'bg-primary-50 text-primary' : ''}
                    >
                      简体中文
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setLanguage('en')}
                      className={language === 'en' ? 'bg-primary-50 text-primary' : ''}
                    >
                      English
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <span className="text-sm font-medium text-gray-700 mr-3">
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
            <button
              className={`block w-full text-left pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                location === "/dashboard"
                  ? "border-primary text-primary bg-primary-50"
                  : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
              }`}
              onClick={() => {
                setLocation("/dashboard");
                setShowMobileMenu(false);
              }}
            >
              {t('dashboard')}
            </button>
            <button
              className={`block w-full text-left pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                location === "/history"
                  ? "border-primary text-primary bg-primary-50"
                  : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
              }`}
              onClick={() => {
                setLocation("/history");
                setShowMobileMenu(false);
              }}
            >
              {t('history')}
            </button>
            <button
              className={`block w-full text-left pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                location === "/usage"
                  ? "border-primary text-primary bg-primary-50"
                  : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
              }`}
              onClick={() => {
                setLocation("/usage");
                setShowMobileMenu(false);
              }}
            >
              {t('usage')}
            </button>
            {isAdmin && (
              <button
                className={`block w-full text-left pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  location === "/settings"
                    ? "border-primary text-primary bg-primary-50"
                    : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                }`}
                onClick={() => {
                  setLocation("/settings");
                  setShowMobileMenu(false);
                }}
              >
                {t('settings')}
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
