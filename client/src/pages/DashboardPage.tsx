import React, { useState, useCallback, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PDFDropzone } from "@/components/PDFDropzone";
import { ProcessingOptions } from "@/components/ProcessingOptions";
import { TranslationOptions } from "@/components/TranslationOptions";
import { LoadingState } from "@/components/LoadingState";
import { ExtractedContentNew as ExtractedContent } from "@/components/ExtractedContentNew";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { pdfApi, userApi } from "@/lib/api";
import { FileText, Languages, FileCode, CreditCard, BarChart, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ProcessingStatus, 
  EngineType, 
  TargetLanguage,
  ExtractedContent as ExtractedContentType, 
  USER_TIERS,
  CREDIT_COSTS
} from "@shared/schema";
import { 
  CreditInfoResponse, 
  CreditLog, 
  CreditLogResponse 
} from "@/lib/types";

const DashboardPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>("idle");
  const [processingEngine, setProcessingEngine] = useState<EngineType>("mistral-ocr");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [extractedContent, setExtractedContent] = useState<ExtractedContentType | null>(null);
  const [fileAnnotations, setFileAnnotations] = useState<string | null>(null);
  const [translationEnabled, setTranslationEnabled] = useState<boolean>(true);
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>("simplified-chinese");
  const [dualLanguage, setDualLanguage] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [processingTime, setProcessingTime] = useState<number>(0);
  const [activeTab, setActiveTab] = useState("process");
  const [creditInfo, setCreditInfo] = useState<CreditInfoResponse | null>(null);
  const [creditLogs, setCreditLogs] = useState<CreditLog[]>([]);
  const [isLoadingCredits, setIsLoadingCredits] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  
  // Fetch user credit information
  useEffect(() => {
    const fetchCreditInfo = async () => {
      try {
        setIsLoadingCredits(true);
        const creditsResponse = await userApi.getCredits();
        setCreditInfo(creditsResponse);
        
        const logsResponse = await userApi.getCreditLogs();
        setCreditLogs(logsResponse.logs);
      } catch (error: any) {
        toast({
          title: t("Error fetching credit information"),
          description: error.message || t("Could not retrieve your usage data"),
          variant: "destructive",
        });
      } finally {
        setIsLoadingCredits(false);
      }
    };
    
    fetchCreditInfo();
  }, []);

  const handleFileSelected = useCallback((file: File) => {
    setSelectedFile(file);
  }, []);

  const handleEngineChange = useCallback((engine: EngineType) => {
    setProcessingEngine(engine);
  }, []);

  const processFile = useCallback(async () => {
    if (!selectedFile) {
      toast({
        title: t("No file selected"),
        description: t("Please upload a PDF file to process"),
        variant: "destructive",
      });
      return;
    }

    // Start uploading state
    setProcessingStatus("uploading");
    
    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setLoadingProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        setProcessingStatus("processing");
        
        // Process the file with the API
        processPDF();
      }
    }, 100);
  }, [selectedFile, processingEngine, translationEnabled, targetLanguage, dualLanguage]);

  const processPDF = async () => {
    try {
      if (!selectedFile) return;
      
      // Reset error message but increment retry count if there was an error before
      if (processingStatus === "error") {
        setRetryCount(prevCount => prevCount + 1);
      } else {
        setRetryCount(0);
      }
      setErrorMessage(undefined);
      
      // Start timing the processing
      const startTime = performance.now();
      
      // Prepare translation options
      const translationOpts = {
        enabled: translationEnabled,
        targetLanguage: targetLanguage,
        dualLanguage: dualLanguage
      };
      
      const response = await pdfApi.processPDF(
        selectedFile,
        processingEngine,
        fileAnnotations || undefined,
        translationOpts
      );
      
      // Calculate total processing time
      const endTime = performance.now();
      const totalProcessingTime = endTime - startTime;
      setProcessingTime(totalProcessingTime);
      
      setExtractedContent(response.extractedContent);
      setFileAnnotations(response.fileAnnotations);
      setProcessingStatus("completed");
      
      // Check if this was a cached response
      if (response.cached) {
        toast({
          title: t("Duplicate Document Detected"),
          description: t(`This file was previously processed. Using cached results (completed in ${(totalProcessingTime / 1000).toFixed(1)} seconds)`),
          variant: "default",
          className: "bg-blue-50 border-blue-200",
        });
      } else {
        toast({
          title: t("Processing complete"),
          description: t(`Your PDF has been successfully processed in ${(totalProcessingTime / 1000).toFixed(1)} seconds`),
        });
      }
    } catch (error: any) {
      // Store the error message for display in the LoadingState component
      const errorMsg = error.message || t("An unknown error occurred while processing the PDF");
      setErrorMessage(errorMsg);
      setProcessingStatus("error");
      
      // Show toast notification for the error
      toast({
        title: t("Processing failed"),
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  const resetProcessing = useCallback(() => {
    setSelectedFile(null);
    setProcessingStatus("idle");
    setLoadingProgress(0);
    setExtractedContent(null);
    setFileAnnotations(null);
    setErrorMessage(undefined);
    setRetryCount(0); // Reset retry count when starting over
    setProcessingTime(0); // Reset processing time
  }, []);

  // Format the credit usage as a percentage
  const getCreditUsagePercentage = () => {
    if (!creditInfo) return 0;
    const { used, limit } = creditInfo;
    // For "unlimited" tier, show a small percentage
    if (limit === -1) return 5;
    return Math.min(Math.round((used / limit) * 100), 100);
  };

  // Get color based on usage percentage
  const getCreditUsageColor = () => {
    const percentage = getCreditUsagePercentage();
    if (percentage < 50) return "bg-green-500";
    if (percentage < 80) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Format tier name for display
  const formatTierName = (tier: string) => {
    switch (tier) {
      case USER_TIERS.FREE:
        return "Free";
      case USER_TIERS.PLUS:
        return "Plus";
      case USER_TIERS.PRO:
        return "Pro";
      default:
        return tier;
    }
  };

  // Format credit limit for display
  const formatCreditLimit = (limit: number) => {
    if (limit === -1) return "Unlimited";
    return limit.toLocaleString();
  };

  // Format date for credit logs
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    } catch (e) {
      return "";
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-10 text-center">
          <h1 className="gradient-heading text-4xl font-bold mb-4">
            DocCat
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('pdf_extraction')}
          </p>
        </div>
        
        {/* Main tabs for process/usage */}
        <div className="mb-8">
          <div className="grid w-full max-w-md mx-auto grid-cols-2 bg-gray-100 p-1 rounded-lg">
            <button 
              className={`py-2 px-4 rounded-md flex items-center justify-center text-sm font-medium transition-colors
                ${activeTab === "process" 
                  ? "bg-white shadow-sm text-primary" 
                  : "text-gray-600 hover:text-primary"}`}
              onClick={() => setActiveTab("process")}
            >
              <FileText className="w-4 h-4 mr-2" />
              {t('Process PDF')}
            </button>
            <button 
              className={`py-2 px-4 rounded-md flex items-center justify-center text-sm font-medium transition-colors
                ${activeTab === "usage" 
                  ? "bg-white shadow-sm text-primary" 
                  : "text-gray-600 hover:text-primary"}`}
              onClick={() => setActiveTab("usage")}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {t('Usage & Credits')}
            </button>
          </div>
        </div>
        
        {/* Tab contents */}
        {activeTab === "process" && (
          <div className="mt-6">
            {/* Feature introduction section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {/* PDF Content Extraction */}
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-6 text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-blue-600 dark:text-blue-300" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-blue-700 dark:text-blue-300">{t('feature_pdf_extraction')}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">{t('feature_pdf_extraction_desc')}</p>
              </div>
              
              {/* Multi-language Translation */}
              <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-6 text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
                    <Languages className="h-8 w-8 text-green-600 dark:text-green-300" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-green-700 dark:text-green-300">{t('feature_translation')}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">{t('feature_translation_desc')}</p>
              </div>
              
              {/* Structured Markdown */}
              <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-6 text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 rounded-full bg-purple-100 dark:bg-purple-800 flex items-center justify-center">
                    <FileCode className="h-8 w-8 text-purple-600 dark:text-purple-300" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-purple-700 dark:text-purple-300">{t('feature_markdown')}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">{t('feature_markdown_desc')}</p>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === "usage" && (
          <div className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Credit Usage Card */}
              <Card className="shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{t('Credit Usage')}</h3>
                    <CreditCard className="h-5 w-5 text-blue-500" />
                  </div>
                  
                  {isLoadingCredits ? (
                    <div className="h-20 flex items-center justify-center">
                      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-2">
                        <div className="flex justify-between text-sm">
                          <span>{creditInfo?.used || 0} used</span>
                          <span>{formatCreditLimit(creditInfo?.limit || 0)} total</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                          <div 
                            className={`h-2.5 rounded-full ${getCreditUsageColor()}`} 
                            style={{ width: `${getCreditUsagePercentage()}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="mt-4 px-4 py-2 bg-gray-100 rounded-md">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Current Tier:</span>
                          <span className="text-sm font-bold">{formatTierName(creditInfo?.tier || USER_TIERS.FREE)}</span>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
              
              {/* Processing Costs Card */}
              <Card className="shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{t('Processing Costs')}</h3>
                    <BarChart className="h-5 w-5 text-green-500" />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-2 bg-gray-100 rounded-md">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                        <span className="text-sm">Structured PDF</span>
                      </div>
                      <span className="font-semibold">{CREDIT_COSTS.STRUCTURED} credits</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-100 rounded-md">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                        <span className="text-sm">Scanned PDF (OCR)</span>
                      </div>
                      <span className="font-semibold">{CREDIT_COSTS.SCANNED} credits</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      <p>Document type is automatically detected upon upload.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Tier Benefits Card */}
              <Card className="shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{t('Your Plan Benefits')}</h3>
                    <div className="h-5 w-5 flex items-center justify-center text-amber-500 font-bold">
                      ✦
                    </div>
                  </div>
                  
                  {isLoadingCredits ? (
                    <div className="h-20 flex items-center justify-center">
                      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {creditInfo?.tier === USER_TIERS.FREE && (
                        <>
                          <div className="flex items-center text-sm"><span className="text-green-500 mr-2">✓</span> 500 credits monthly</div>
                          <div className="flex items-center text-sm"><span className="text-green-500 mr-2">✓</span> Basic extraction features</div>
                          <div className="flex items-center text-sm"><span className="text-green-500 mr-2">✓</span> Translation to 6 languages</div>
                          <div className="mt-3 text-center">
                            <Button variant="outline" size="sm" className="text-xs">
                              Upgrade to Plus
                            </Button>
                          </div>
                        </>
                      )}
                      
                      {creditInfo?.tier === USER_TIERS.PLUS && (
                        <>
                          <div className="flex items-center text-sm"><span className="text-green-500 mr-2">✓</span> 50,000 credits monthly</div>
                          <div className="flex items-center text-sm"><span className="text-green-500 mr-2">✓</span> Advanced extraction features</div>
                          <div className="flex items-center text-sm"><span className="text-green-500 mr-2">✓</span> Priority processing</div>
                          <div className="flex items-center text-sm"><span className="text-green-500 mr-2">✓</span> Email support</div>
                          <div className="mt-3 text-center">
                            <Button variant="outline" size="sm" className="text-xs">
                              Upgrade to Pro
                            </Button>
                          </div>
                        </>
                      )}
                      
                      {creditInfo?.tier === USER_TIERS.PRO && (
                        <>
                          <div className="flex items-center text-sm"><span className="text-green-500 mr-2">✓</span> Unlimited credits</div>
                          <div className="flex items-center text-sm"><span className="text-green-500 mr-2">✓</span> Premium features</div>
                          <div className="flex items-center text-sm"><span className="text-green-500 mr-2">✓</span> Priority processing</div>
                          <div className="flex items-center text-sm"><span className="text-green-500 mr-2">✓</span> 24/7 support</div>
                          <div className="flex items-center text-sm"><span className="text-green-500 mr-2">✓</span> Custom exports</div>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Credit Usage History */}
            <Card className="shadow-md mb-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">{t('Recent Credit Usage')}</h3>
                  <Clock className="h-5 w-5 text-gray-500" />
                </div>
                
                {isLoadingCredits ? (
                  <div className="h-20 flex items-center justify-center">
                    <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                ) : creditLogs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No credit usage history yet.</p>
                    <p className="text-sm mt-2">Process your first document to start tracking usage.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                          <th className="px-4 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {creditLogs.map((log) => (
                          <tr key={log.id}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatDate(log.createdAt)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{log.description}</td>
                            <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${log.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {log.amount > 0 ? `+${log.amount}` : log.amount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main processing card - only show in process tab */}
        {activeTab === "process" && (
          <Card className="dashboard-card mt-8 border-0 shadow-md bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">
                    {t('document_processing')}
                  </h2>
                  <p className="mt-2 text-muted-foreground">
                    {t('upload_instruction')}
                  </p>
                </div>
              </div>

              {processingStatus === "idle" && (
                <>
                  <PDFDropzone
                    onFileSelected={handleFileSelected}
                    className="mb-6"
                  />
                  
                  {/* The ProcessingOptions component is now hidden but still manages state */}
                  <ProcessingOptions
                    engine={processingEngine}
                    onChange={handleEngineChange}
                  />
                  
                  {/* Add an informative message about intelligent detection */}
                  <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <span className="font-medium">{t('smart_detection')}:</span> {t('detection_description')}
                    </p>
                  </div>

                  <TranslationOptions
                    enabled={translationEnabled}
                    onEnabledChange={setTranslationEnabled}
                    targetLanguage={targetLanguage}
                    onTargetLanguageChange={setTargetLanguage}
                    dualLanguage={dualLanguage}
                    onDualLanguageChange={setDualLanguage}
                  />

                  <div className="mt-10 flex justify-center">
                    <Button
                      onClick={processFile}
                      disabled={!selectedFile}
                      className={`text-lg px-8 py-6 rounded-xl font-medium transition-all shadow-md ${
                        !selectedFile 
                          ? "bg-gray-300 cursor-not-allowed" 
                          : "bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:-translate-y-1"
                      }`}
                    >
                      {t('process_document')}
                    </Button>
                  </div>
                </>
              )}

              {(processingStatus === "uploading" || processingStatus === "processing" || processingStatus === "error") && (
                <LoadingState
                  status={processingStatus}
                  progress={loadingProgress}
                  engine={processingEngine}
                  errorMessage={errorMessage}
                  onRetry={processFile}
                  retryCount={retryCount}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Results section */}
        {processingStatus === "completed" && extractedContent && (
          <ExtractedContent
            content={extractedContent}
            fileName={selectedFile?.name || "document.pdf"}
            onProcessAnother={resetProcessing}
            processingTime={processingTime}
          />
        )}
      </div>
    </Layout>
  );
};

export default DashboardPage;
