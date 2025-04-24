import React from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { Toaster } from "@/components/ui/toaster";

interface LayoutProps {
  children: React.ReactNode;
  showNavbar?: boolean;
  showFooter?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  showNavbar = true,
  showFooter = true,
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {showNavbar && <Navbar />}
      <main className="flex-1 py-10">{children}</main>
      {showFooter && <Footer />}
      <Toaster />
    </div>
  );
};
