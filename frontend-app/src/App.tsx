import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { QueryClient, QueryClientProvider, useMutation, useQuery } from '@tanstack/react-query';
import { pdfApi, TranslateRequest } from './lib/api';

// Create a query client
const queryClient = new QueryClient();

const PDFTranslator: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceLang, setSourceLang] = useState<string>('en');
  const [targetLang, setTargetLang] = useState<string>('zh');
  const [dualMode, setDualMode] = useState<boolean>(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  // Get supported languages
  const { data: languagesData } = useQuery({
    queryKey: ['languages'],
    queryFn: pdfApi.getSupportedLanguages,
  });

  // Health check
  const { data: healthData } = useQuery({
    queryKey: ['health'],
    queryFn: pdfApi.healthCheck,
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Translation mutation
  const translateMutation = useMutation({
    mutationFn: async (request: TranslateRequest) => {
      const result = await pdfApi.translatePdf(request);
      setCurrentTaskId(result.task_id);
      return result;
    },
  });

  // Download mutation
  const downloadMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const blob = await pdfApi.downloadPdf(taskId);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `translated_${taskId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Cleanup files
      await pdfApi.cleanupFiles(taskId);
      setCurrentTaskId(null);
      setSelectedFile(null);
    },
  });

  // File drop handler
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
  });

  const handleTranslate = () => {
    if (!selectedFile) return;

    translateMutation.mutate({
      file: selectedFile,
      source_lang: sourceLang,
      target_lang: targetLang,
      dual: dualMode,
    });
  };

  const handleDownload = () => {
    if (!currentTaskId) return;
    downloadMutation.mutate(currentTaskId);
  };

  const isServiceAvailable = healthData?.pdftranslate_available ?? false;
  const languages = languagesData?.languages ?? {};

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">PDF Translator</h1>
        <p className="text-gray-600">
          Translate PDF documents while preserving formatting and mathematical expressions
        </p>
      </div>

      {/* Service Status */}
      <div className="flex items-center justify-center space-x-2">
        {healthData ? (
          <>
            <div className={`w-3 h-3 rounded-full ${isServiceAvailable ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              Service Status: {isServiceAvailable ? 'Available' : 'Unavailable'}
            </span>
          </>
        ) : (
          <>
            <div className="w-3 h-3 rounded-full bg-gray-500 animate-pulse"></div>
            <span className="text-sm text-gray-600">Checking service status...</span>
          </>
        )}
      </div>

      {!isServiceAvailable && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            PDF translation service is currently unavailable. Please try again later.
          </p>
        </div>
      )}

      {/* File Upload */}
      <div className="space-y-4">
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            ${!isServiceAvailable ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} disabled={!isServiceAvailable} />
          {selectedFile ? (
            <div className="space-y-2">
              <div className="text-4xl">📄</div>
              <p className="text-lg font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-4xl">📁</div>
              <p className="text-lg text-gray-600">
                {isDragActive ? 'Drop the PDF file here' : 'Drop a PDF file here or click to select'}
              </p>
              <p className="text-sm text-gray-500">Only PDF files are supported</p>
            </div>
          )}
        </div>

        {selectedFile && (
          <button
            onClick={() => setSelectedFile(null)}
            className="w-full py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Remove File
          </button>
        )}
      </div>

      {/* Translation Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Source Language</label>
          <select
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {Object.entries(languages).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Target Language</label>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {Object.entries(languages).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Dual Language Mode</label>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="dual-mode"
              checked={dualMode}
              onChange={(e) => setDualMode(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">
              {dualMode ? 'Show both languages' : 'Target language only'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-4">
        {!currentTaskId ? (
          <button
            onClick={handleTranslate}
            disabled={!selectedFile || !isServiceAvailable || translateMutation.isPending}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {translateMutation.isPending ? (
              <>
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                Translating...
              </>
            ) : (
              <>
                🌐 Translate PDF
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleDownload}
            disabled={downloadMutation.isPending}
            className="w-full py-3 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloadMutation.isPending ? (
              <>
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                Preparing Download...
              </>
            ) : (
              <>
                💾 Download Translated PDF
              </>
            )}
          </button>
        )}
      </div>

      {/* Success/Error Messages */}
      {translateMutation.isSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">
            ✅ Translation completed successfully! You can now download the translated PDF.
          </p>
        </div>
      )}

      {translateMutation.isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            ❌ Translation failed: {translateMutation.error?.message}
          </p>
        </div>
      )}

      {downloadMutation.isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            ❌ Download failed: {downloadMutation.error?.message}
          </p>
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <PDFTranslator />
      </div>
    </QueryClientProvider>
  );
}

export default App; 