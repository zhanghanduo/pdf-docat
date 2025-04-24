import React, { useCallback, useState } from "react";
import { UploadCloud, File } from "lucide-react";
import { cn, isPdfFile } from "@/lib/utils";
import { PDFViewer } from "@/components/ui/pdf-viewer";
import { useToast } from "@/hooks/use-toast";

interface PDFDropzoneProps {
  onFileSelected: (file: File) => void;
  maxSize?: number; // in bytes
  className?: string;
}

export const PDFDropzone: React.FC<PDFDropzoneProps> = ({
  onFileSelected,
  maxSize = 50 * 1024 * 1024, // 50MB default max size
  className,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const validateFile = useCallback(
    (file: File): boolean => {
      // Check if file is a PDF
      if (!isPdfFile(file)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF file.",
          variant: "destructive",
        });
        return false;
      }

      // Check file size
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: `The file exceeds the maximum size of ${Math.round(maxSize / (1024 * 1024))}MB.`,
          variant: "destructive",
        });
        return false;
      }

      return true;
    },
    [maxSize, toast]
  );

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (validateFile(file)) {
          setSelectedFile(file);
          onFileSelected(file);
        }
      }
    },
    [onFileSelected, validateFile]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        if (validateFile(file)) {
          setSelectedFile(file);
          onFileSelected(file);
        }
      }
    },
    [onFileSelected, validateFile]
  );

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
  }, []);

  return (
    <div className={className}>
      {selectedFile ? (
        <PDFViewer file={selectedFile} onRemove={handleRemoveFile} />
      ) : (
        <div
          className={cn(
            "flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md transition-colors duration-200 hover:border-primary",
            isDragging && "border-primary bg-primary/5",
            className
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="space-y-1 text-center">
            <UploadCloud
              className={cn(
                "mx-auto h-12 w-12 text-gray-400",
                isDragging && "text-primary"
              )}
            />
            <div className="flex text-sm text-gray-600">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary/90 focus-within:outline-none"
              >
                <span>Upload a file</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  accept="application/pdf"
                  onChange={handleFileInputChange}
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">
              PDF up to {Math.round(maxSize / (1024 * 1024))}MB
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
