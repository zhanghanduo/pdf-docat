import React from "react";
import { FileText, Github, Cat, Heart } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t mt-auto">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 md:flex md:items-center md:justify-between lg:px-8">
        <div className="flex justify-center space-x-6 md:order-2">
          <a
            href="#"
            className="text-muted-foreground hover:text-primary transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="sr-only">Documentation</span>
            <FileText className="h-5 w-5" />
          </a>
          <a
            href="https://github.com"
            className="text-muted-foreground hover:text-primary transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="sr-only">GitHub</span>
            <Github className="h-5 w-5" />
          </a>
        </div>
        <div className="mt-8 md:mt-0 md:order-1">
          <div className="flex items-center justify-center gap-2">
            <Cat className="h-5 w-5 text-primary" />
            <p className="text-center text-muted-foreground">
              &copy; {new Date().getFullYear()} DocCat AI. Made with <Heart className="inline h-3 w-3 text-red-500 fill-red-500" /> by so-cat.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
