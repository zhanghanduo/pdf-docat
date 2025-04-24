import React from "react";
import { ExtractedContent as ExtractedContentType } from "@shared/schema";
import { Clock, FileText, AlertTriangle, InfoIcon, Zap, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";

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
  const { t } = useLanguage();
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
          {t('document_info')}
        </h4>
        
        <div className="space-y-4">
          <div>
            <h5 className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <FileText size={14} />
              {t('file_details')}
            </h5>
            <p className="text-sm text-gray-600 mt-1">
              {fileName}<br />
              {t('pages')}: {content.pages}
            </p>
          </div>
          
          {/* Processing Time and Stats */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <Clock size={14} />
              {t('processing_details')}
            </h5>
            <p className="text-sm text-gray-600 mt-1">
              {t('processed_on')}: {formattedDate} {t('at')} {formattedTime}<br />
              {t('word_count')}: {content.metadata.wordCount} {t('words')}<br />
              {t('confidence')}: {(content.metadata.confidence * 100).toFixed(1)}%
              {processingTime && (
                <><br />{t('processing_duration')}: {(processingTime / 1000).toFixed(1)} {t('seconds')}</>
              )}
            </p>
          </div>
          
          {/* Engine Info */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <Zap size={14} />
              {t('engine_details')}
            </h5>
            <p className="text-sm text-gray-600 mt-1">
              {t('model')}: Claude-3-Sonnet<br />
              {t('provider')}: Anthropic via OpenRouter
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
                {t('translation_information')}
              </h5>
              <p className="text-sm text-gray-600 mt-1">
                {t('source_language')}: {content.metadata.sourceLanguage || t('auto_detected')}<br />
                {t('target_language')}: {content.metadata.targetLanguage || t('english')}<br />
                {t('translation_type')}: {content.content.some(item => item.translatedContent) ? t('full_document') : t('partial')}
              </p>
            </div>
          )}
          
          {/* Error or warning log display (if any) */}
          {hasErrors && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <h5 className="text-sm font-medium text-amber-800 flex items-center gap-1">
                <AlertTriangle size={14} className="text-amber-500" />
                {t('processing_note')}
              </h5>
              <p className="text-sm text-amber-700 mt-1">
                {t('extraction_issues')}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};