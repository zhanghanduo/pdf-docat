import React, { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Download, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { pdfApi } from "@/lib/api";
import { ProcessingLog, ExtractedContent } from "@shared/schema";
import { formatRelativeTime, exportAsText, exportAsJson, exportAsMarkdown } from "@/lib/utils";
import { Pagination } from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { ViewLogContent } from "@/components/ViewLogContent";
import { useLanguage } from "@/hooks/use-language";

const HistoryPage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState<{
    id: number;
    fileName: string;
    extractedContent: ExtractedContent;
    processingTime?: number;
  } | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/processing-logs", currentPage],
    queryFn: async () => {
      const res = await pdfApi.getProcessingLogs(currentPage);
      return res;
    },
  });

  useEffect(() => {
    if (data) {
      setTotalPages(data.pagination.pages);
    }
  }, [data]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleViewLog = async (logId: number) => {
    try {
      // Show loading toast
      const loadingToast = toast({
        title: t('loading_content'),
        description: t('retrieving_content'),
      });
      
      const log = await pdfApi.getProcessingLog(logId);
      
      // Dismiss loading toast
      loadingToast.dismiss();
      
      if (log.extractedContent) {
        // Calculate processing time from metadata if available, or set a default
        let processingTime = 0;
        if (log.processingTime) {
          processingTime = log.processingTime;
        } else if (log.metadata?.processingTime) {
          processingTime = log.metadata.processingTime;
        }
        
        // Set the selected log and open the dialog
        setSelectedLog({
          id: log.id,
          fileName: log.fileName,
          extractedContent: log.extractedContent,
          processingTime: processingTime
        });
        setIsViewDialogOpen(true);
      } else {
        toast({
          title: t('no_content_available'),
          description: t('no_extracted_content'),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching log:", error);
      toast({
        title: t('error_title'),
        description: t('failed_fetch_details'),
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (logId: number) => {
    try {
      const log = await pdfApi.getProcessingLog(logId);
      
      if (log.extractedContent) {
        // Show a dropdown or run a specific export
        // For now, just export as markdown for better formatting
        exportAsMarkdown(log.extractedContent, log.fileName);
        
        toast({
          title: t('download_started'),
          description: t('document_downloaded')
        });
      } else {
        toast({
          title: t('no_content_available'),
          description: t('no_content_download'),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t('error_title'),
        description: t('failed_download'),
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          {t('processing_history')}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {t('view_processed_documents')}
        </p>

        <Card className="mt-8">
          <CardHeader>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {t('recent_documents')}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {t('processing_history_30days')}
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {t('document')}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {t('date')}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {t('engine')}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {t('status')}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {t('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                        {t('loading')}
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-red-500">
                        {t('error_loading_history')}
                      </td>
                    </tr>
                  ) : data?.logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                        {t('no_history_found')}
                      </td>
                    </tr>
                  ) : (
                    data?.logs.map((log: ProcessingLog, index: number) => (
                      <tr key={log.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div className="flex items-center">
                            <svg
                              className="h-5 w-5 text-destructive mr-2"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                              />
                            </svg>
                            {log.fileName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.timestamp ? formatRelativeTime(log.timestamp) : t('unknown_date')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.engine}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              log.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : log.status === "error"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {t(log.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary hover:text-primary/80"
                              onClick={() => handleViewLog(log.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              {t('view')}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary hover:text-primary/80"
                              onClick={() => handleDownload(log.id)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              {t('download')}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data && totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  {t('showing_page', `${currentPage} of ${totalPages}`)}
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* View Log dialog */}
      <ViewLogContent
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        log={selectedLog}
      />
    </Layout>
  );
};

export default HistoryPage;
