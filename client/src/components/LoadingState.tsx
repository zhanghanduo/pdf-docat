import React from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { ProcessingStatus } from "@shared/schema";
import { Button } from "@/components/ui/button";

interface LoadingStateProps {
  status: ProcessingStatus;
  progress: number;
  engine: string;
  errorMessage?: string;
  onRetry?: () => void;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  status,
  progress,
  engine,
  errorMessage,
  onRetry,
}) => {
  if (status === "error") {
    const isApiKeyError = errorMessage && (
      errorMessage.toLowerCase().includes("api key") || 
      errorMessage.toLowerCase().includes("authentication") ||
      errorMessage.toLowerCase().includes("openrouter")
    );

    return (
      <div className="text-center py-8 max-w-xl mx-auto">
        <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          Processing Error
        </h3>
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">
            {isApiKeyError ? (
              <>
                <strong>API Authentication Error:</strong> The system cannot connect to the OpenRouter AI service. 
                <br /><br />
                This is likely due to an invalid or expired API key. Please contact the administrator to update the API key.
              </>
            ) : (
              errorMessage || "An unknown error occurred while processing your document."
            )}
          </p>
        </div>
        
        {onRetry && (
          <Button 
            onClick={onRetry} 
            className="mt-4 bg-primary hover:bg-primary/90"
          >
            Try Again
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <Loader2 className="animate-spin mx-auto h-10 w-10 text-primary" />
      <h3 className="mt-4 text-lg font-medium text-gray-900">
        {status === "uploading" && "Uploading your document..."}
        {status === "processing" && `Processing with ${engine}...`}
      </h3>
      <div className="mt-2">
        <div className="relative pt-1">
          <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
            <div
              style={{ width: `${progress}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary transition-all duration-500"
            ></div>
          </div>
          <div className="text-right mt-1">
            <span className="text-xs font-semibold text-gray-600">{`${progress}%`}</span>
          </div>
        </div>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        This may take a few moments depending on the size and complexity of your document.
      </p>
    </div>
  );
};
