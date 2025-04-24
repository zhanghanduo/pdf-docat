import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { File, XCircle, Download } from "lucide-react";
import { Button } from "./button";

export interface PDFViewerProps {
  file: File | null;
  className?: string;
  onRemove?: () => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ file, className, onRemove }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<{
    name: string;
    size: string;
    lastModified: string;
  } | null>(null);

  useEffect(() => {
    if (file) {
      // Create object URL for the file
      const objectUrl = URL.createObjectURL(file);
      setUrl(objectUrl);

      // Set file info
      setFileInfo({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        lastModified: new Date(file.lastModified).toLocaleDateString(),
      });

      // Clean up the URL when the component unmounts
      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    } else {
      setUrl(null);
      setFileInfo(null);
    }
  }, [file]);

  if (!file || !url || !fileInfo) {
    return null;
  }

  return (
    <div className={cn("bg-gray-50 p-4 rounded-md", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <File className="h-8 w-8 text-destructive" />
          <div className="ml-4">
            <h4 className="text-sm font-medium text-gray-900">{fileInfo.name}</h4>
            <p className="text-xs text-gray-500">
              {fileInfo.size} • Modified: {fileInfo.lastModified}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-gray-500"
            onClick={() => window.open(url, '_blank')}
          >
            <Download className="h-5 w-5" />
            <span className="sr-only">Download</span>
          </Button>
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-gray-500"
              onClick={onRemove}
            >
              <XCircle className="h-5 w-5" />
              <span className="sr-only">Remove</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export { PDFViewer };
