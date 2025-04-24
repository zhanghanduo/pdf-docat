import React from "react";
import { ExtractedContent as ExtractedContentType } from "@shared/schema";
import { Clock, FileText, AlertTriangle, InfoIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface DocumentInfoProps {
  content: ExtractedContentType;
  fileName: string;
}

export const DocumentInfo: React.FC<DocumentInfoProps> = ({
  content,
  fileName,
}) => {
  const hasErrors = content.content.some(
    (item) => item.content?.includes("很抱歉") || item.content?.includes("error")
  );

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
          
          <div>
            <h5 className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <Clock size={14} />
              Processing Details
            </h5>
            <p className="text-sm text-gray-600 mt-1">
              Extraction time: {content.metadata.extractionTime}<br />
              Word count: {content.metadata.wordCount}<br />
              Confidence: {(content.metadata.confidence * 100).toFixed(1)}%
            </p>
          </div>
          
          {content.metadata.isTranslated && (
            <div>
              <h5 className="text-sm font-medium text-gray-700">Translation</h5>
              <p className="text-sm text-gray-600 mt-1">
                Source: {content.metadata.sourceLanguage || "Auto-detected"}<br />
                Target: {content.metadata.targetLanguage}
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