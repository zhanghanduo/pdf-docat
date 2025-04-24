import React from "react";
import { FileText, Github } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white mt-auto">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 md:flex md:items-center md:justify-between lg:px-8">
        <div className="flex justify-center space-x-6 md:order-2">
          <a
            href="#"
            className="text-gray-400 hover:text-gray-500"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="sr-only">Documentation</span>
            <FileText className="h-6 w-6" />
          </a>
          <a
            href="https://github.com"
            className="text-gray-400 hover:text-gray-500"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="sr-only">GitHub</span>
            <Github className="h-6 w-6" />
          </a>
        </div>
        <div className="mt-8 md:mt-0 md:order-1">
          <p className="text-center text-base text-gray-400">
            &copy; {new Date().getFullYear()} DocuMind. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
