import React, { useState, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PDFDropzone } from "@/components/PDFDropzone";
import { ProcessingOptions } from "@/components/ProcessingOptions";
import { TranslationOptions } from "@/components/TranslationOptions";
import { LoadingState } from "@/components/LoadingState";
import { ExtractedContent } from "@/components/ExtractedContent";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();

  const handleFileSelected = useCallback((file: File) => {
    setSelectedFile(file);
  }, []);

  const handleEngineChange = useCallback((engine: EngineType) => {
    setProcessingEngine(engine);
  }, []);

  const processFile = useCallback(async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please upload a PDF file to process",
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
  }, [selectedFile, processingEngine]);

  const processPDF = async () => {
    try {
      if (!selectedFile) return;
      
      const response = await pdfApi.processPDF(
        selectedFile,
        processingEngine,
        fileAnnotations || undefined
      );
      
      setExtractedContent(response.extractedContent);
      setFileAnnotations(response.fileAnnotations);
      setProcessingStatus("completed");
      
      toast({
        title: "Processing complete",
        description: "Your PDF has been successfully processed",
      });
    } catch (error: any) {
      setProcessingStatus("error");
      
      toast({
        title: "Processing failed",
        description: error.message || "An error occurred while processing the PDF",
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
  }, []);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          PDF Content Extraction
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload your PDF to extract structured content using AI.
        </p>

        {/* Main processing card */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Document Processing
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Upload a PDF file to extract text, tables, and structured content.
                </p>
              </div>
            </div>

            {processingStatus === "idle" && (
              <>
                <PDFDropzone
                  onFileSelected={handleFileSelected}
                  className="mb-6"
                />

                <ProcessingOptions
                  engine={processingEngine}
                  onChange={handleEngineChange}
                />

                <TranslationOptions
                  enabled={translationEnabled}
                  onEnabledChange={setTranslationEnabled}
                  targetLanguage={targetLanguage}
                  onTargetLanguageChange={setTargetLanguage}
                  dualLanguage={dualLanguage}
                  onDualLanguageChange={setDualLanguage}
                />

                <div className="mt-6">
                  <Button
                    onClick={processFile}
                    disabled={!selectedFile}
                    className={!selectedFile ? "bg-gray-300 cursor-not-allowed" : ""}
                  >
                    Process Document
                  </Button>
                </div>
              </>
            )}

            {(processingStatus === "uploading" || processingStatus === "processing") && (
              <LoadingState
                status={processingStatus}
                progress={loadingProgress}
                engine={processingEngine}
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
          />
        )}
      </div>
    </Layout>
  );
};

export default DashboardPage;
