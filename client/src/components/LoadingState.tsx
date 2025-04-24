import React from "react";
import { Loader2 } from "lucide-react";
import { ProcessingStatus } from "@shared/schema";

interface LoadingStateProps {
  status: ProcessingStatus;
  progress: number;
  engine: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  status,
  progress,
  engine,
}) => {
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
