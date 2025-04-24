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
            "flex justify-center px-8 py-10 border-2 border-dashed rounded-xl transition-all duration-300 bg-secondary/30",
            isDragging ? "border-primary bg-primary/10 shadow-lg" : "border-gray-300 hover:border-primary/70 hover:bg-secondary/50",
            className
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="space-y-4 text-center max-w-md">
            <div className={cn(
              "mx-auto h-20 w-20 rounded-full flex items-center justify-center bg-white shadow-sm transition-all duration-300",
              isDragging ? "text-primary bg-primary/10 scale-110" : "text-muted-foreground"
            )}>
              <UploadCloud className="h-10 w-10" />
            </div>
            
            <h3 className="text-xl font-medium text-foreground">
              Upload your PDF document
            </h3>
            
            <p className="text-muted-foreground">
              Drag and drop your file here, or click to browse your files
            </p>
            
            <div className="pt-4">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer inline-flex items-center justify-center rounded-lg px-6 py-3 font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus-within:outline-none"
              >
                <File className="mr-2 h-5 w-5" />
                <span>Select PDF file</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  accept="application/pdf"
                  onChange={handleFileInputChange}
                />
              </label>
            </div>
            
            <p className="text-sm text-muted-foreground pt-2">
              PDF files up to {Math.round(maxSize / (1024 * 1024))}MB supported
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
