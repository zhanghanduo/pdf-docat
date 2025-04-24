import React, { useState, useCallback } from "react";
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
import { pdfApi } from "@/lib/api";
import { 
  ProcessingStatus, 
  EngineType, 
  TargetLanguage,
  ExtractedContent as ExtractedContentType 
} from "@shared/schema";

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
  const { toast } = useToast();
  const { t } = useLanguage();

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

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-10 text-center">
          <h1 className="gradient-heading text-4xl font-bold mb-4">
            {t("PDF Content Extraction")}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("Upload your PDF to extract structured content using advanced AI technology.")}
          </p>
        </div>

        {/* Main processing card */}
        <Card className="dashboard-card mt-8 border-0 shadow-md bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">
                  {t("Document Processing")}
                </h2>
                <p className="mt-2 text-muted-foreground">
                  {t("Upload a PDF file to extract text, tables, and structured content.")}
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
                    <span className="font-medium">Smart Detection:</span> DocCat will automatically determine if your PDF contains scanned images or structured text and apply the optimal processing method.
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
                    Process Document
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
