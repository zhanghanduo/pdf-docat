import React from "react";
import { ExtractedContent as ExtractedContentType } from "@shared/schema";
import { Clock, FileText, AlertTriangle, InfoIcon, Zap, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";

interface DocumentInfoProps {
  content: ExtractedContentType;
  fileName: string;
  processingTime?: number; // in milliseconds
}

export const DocumentInfo: React.FC<DocumentInfoProps> = ({
  content,
  fileName,
  processingTime
}) => {
  const hasErrors = content.content.some(
    (item) => item.content?.includes("很抱歉") || item.content?.includes("error")
  );
  
  // Format the extraction time
  const extractionDate = new Date(content.metadata.extractionTime);
  const formattedDate = extractionDate.toLocaleDateString();
  const formattedTime = extractionDate.toLocaleTimeString();

  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <h4 className="text-md font-semibold flex items-center gap-2 mb-4">
          <InfoIcon size={16} className="text-gray-500" />
          Document Information
        </h4>
        
        <div className="space-y-4">
          <div>
            <h5 className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <FileText size={14} />
              File Details
            </h5>
            <p className="text-sm text-gray-600 mt-1">
              {fileName}<br />
              Pages: {content.pages}
            </p>
          </div>
          
          {/* Processing Time and Stats */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <Clock size={14} />
              Processing Details
            </h5>
            <p className="text-sm text-gray-600 mt-1">
              Processed on: {formattedDate} at {formattedTime}<br />
              Word count: {content.metadata.wordCount} words<br />
              Confidence: {(content.metadata.confidence * 100).toFixed(1)}%
              {processingTime && (
                <><br />Processing time: {(processingTime / 1000).toFixed(1)} seconds</>
              )}
            </p>
          </div>
          
          {/* Engine Info */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <Zap size={14} />
              Engine Details
            </h5>
            <p className="text-sm text-gray-600 mt-1">
              Model: Claude-3-Sonnet<br />
              Provider: Anthropic via OpenRouter
            </p>
          </div>
          
          {content.metadata.isTranslated && (
            <div>
              <h5 className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 8 6 6" />
                  <path d="m5 14 6-6 2-3" />
                  <path d="M2 5h12" />
                  <path d="M9 3v2" />
                  <path d="m13 15 6 6" />
                  <path d="m13 21 6-6 2-3" />
                  <path d="M22 11H10" />
                  <path d="M15 9v2" />
                </svg>
                Translation Information
              </h5>
              <p className="text-sm text-gray-600 mt-1">
                Source language: {content.metadata.sourceLanguage || "Auto-detected"}<br />
                Target language: {content.metadata.targetLanguage || "English"}<br />
                Translation type: {content.content.some(item => item.translatedContent) ? "Full document" : "Partial"}
              </p>
            </div>
          )}
          
          {/* Error or warning log display (if any) */}
          {hasErrors && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <h5 className="text-sm font-medium text-amber-800 flex items-center gap-1">
                <AlertTriangle size={14} className="text-amber-500" />
                Processing Note
              </h5>
              <p className="text-sm text-amber-700 mt-1">
                The extraction encountered some issues. Please check the content or try uploading again.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};