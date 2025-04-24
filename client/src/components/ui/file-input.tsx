import React, { forwardRef, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Upload } from "lucide-react";

export interface FileInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> {
  onFileChange?: (file: File | null) => void;
  accept?: string;
  maxSize?: number;
  className?: string;
  buttonText?: string;
  helperText?: string;
  error?: string;
}

const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  (
    {
      className,
      onFileChange,
      accept = "application/pdf",
      maxSize,
      id,
      buttonText = "Select file",
      helperText,
      error,
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState<string>("");

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) {
        setFileName("");
        onFileChange && onFileChange(null);
        return;
      }

      const file = files[0];

      // Check file size if maxSize is provided
      if (maxSize && file.size > maxSize) {
        setFileName("");
        onFileChange && onFileChange(null);
        alert(`File is too large. Maximum size is ${maxSize / (1024 * 1024)}MB.`);
        return;
      }

      setFileName(file.name);
      onFileChange && onFileChange(file);
    };

    const handleButtonClick = () => {
      inputRef.current?.click();
    };

    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleButtonClick}
            className="flex items-center space-x-2"
          >
            <Upload className="h-4 w-4" />
            <span>{buttonText}</span>
          </Button>
          {fileName && (
            <span className="text-sm text-muted-foreground truncate max-w-[200px]">
              {fileName}
            </span>
          )}
        </div>
        {helperText && !error && (
          <p className="text-sm text-muted-foreground">{helperText}</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <input
          id={id}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={handleFileChange}
          ref={(node) => {
            // Handle both the ref passed from the parent and our internal ref
            if (typeof ref === "function") {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
            inputRef.current = node;
          }}
          {...props}
        />
      </div>
    );
  }
);

FileInput.displayName = "FileInput";

export { FileInput };
