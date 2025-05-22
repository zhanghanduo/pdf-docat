import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ExtractedContent as ExtractedContentType } from "@shared/schema";
import { exportAsText, exportAsJson, exportAsMarkdown, formatExtractedContentAsMarkdown } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Clock, FileText, AlertTriangle, InfoIcon, HelpCircle } from "lucide-react";

interface ExtractedContentProps {
  content: ExtractedContentType;
  fileName: string;
  onProcessAnother: () => void;
  processingTime?: number;
}

export const ExtractedContent: React.FC<ExtractedContentProps> = ({
  content,
  fileName,
  onProcessAnother,
  processingTime,
}) => {
  const [viewMode, setViewMode] = useState<"rendered" | "markdown">("rendered");

  const handleExportText = () => {
    exportAsText(content, fileName);
  };

  const handleExportJSON = () => {
    exportAsJson(content, fileName);
  };

  const handleExportMarkdown = () => {
    exportAsMarkdown(content, fileName);
  };

  const isTranslated = content.metadata.isTranslated ||
    content.content.some(item => !!item.translatedContent);

  return (
    <Card className="mt-8">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Extracted Content</h3>
          <p className="text-sm text-gray-500">
            Content extracted from your document
            {isTranslated && " (with translation)"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleExportText}>
            Export as TXT
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportMarkdown}>
            Export as MD
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportJSON}>
            Export as JSON
          </Button>
          <Button size="sm" onClick={onProcessAnother}>
            Process Another
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Left sidebar with document information */}
          <div className="md:col-span-1 bg-gray-50 p-4 rounded-lg border border-gray-200">
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
                  {processingTime ? `Processing time: ${(processingTime / 1000).toFixed(1)}s` :
                    `Extraction time: ${content.metadata.extractionTime}`}<br />
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
              {(content.content.some(item => item.content?.includes("很抱歉") || item.content?.includes("error")) ||
                content.metadata.warning) && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <h5 className="text-sm font-medium text-amber-800 flex items-center gap-1">
                    <AlertTriangle size={14} className="text-amber-500" />
                    Processing Note
                  </h5>
                  <p className="text-sm text-amber-700 mt-1">
                    {content.metadata.warning ||
                      "The extraction encountered some issues. Please check the content or try uploading again."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right content area */}
          <div className="md:col-span-3">
            <div className="flex justify-between items-start mb-4">
              <h4 className="text-xl font-semibold">{content.title}</h4>

              <div className="flex items-center space-x-2">
                <Tabs defaultValue="rendered" onValueChange={(v) => setViewMode(v as "rendered" | "markdown")}>
                  <TabsList>
                    <TabsTrigger value="rendered">Rendered</TabsTrigger>
                    <TabsTrigger value="markdown">Markdown</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            <Separator className="mb-6" />

            {viewMode === "rendered" ? (
              <div className="prose prose-sm max-w-none">
                {content.content.map((item, index) => (
                  <div key={index} className="mb-4">
                    {/* Text content */}
                    {item.type === "text" && (
                      <div className={isTranslated ? "grid grid-cols-1 md:grid-cols-2 gap-4" : ""}>
                        <div>
                          <p className="text-gray-900">{item.content}</p>
                        </div>

                        {item.translatedContent && (
                          <div className="bg-gray-50 p-3 rounded border-l-4 border-blue-500">
                            <p className="text-gray-900">{item.translatedContent}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Heading content */}
                    {item.type === "heading" && (
                      <div>
                        <h3 className="text-lg font-semibold mt-6 mb-2">{item.content}</h3>
                        {item.translatedContent && (
                          <h4 className="text-md font-medium mt-1 mb-2 text-blue-600">
                            {item.translatedContent}
                          </h4>
                        )}
                      </div>
                    )}

                    {/* Code content */}
                    {item.type === "code" && (
                      <div className={isTranslated ? "grid grid-cols-1 md:grid-cols-2 gap-4" : ""}>
                        <div className="bg-gray-800 text-gray-100 p-3 rounded-md overflow-x-auto">
                          <pre className="text-xs">{item.content}</pre>
                        </div>

                        {item.translatedContent && (
                          <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                            <p className="text-sm text-gray-800">{item.translatedContent}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Table content */}
                    {item.type === "table" && (
                      <div className={isTranslated && item.translatedHeaders && item.translatedRows
                        ? "grid grid-cols-1 gap-6 mt-4"
                        : ""}>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                {item.headers?.map((header, headerIndex) => (
                                  <th
                                    key={headerIndex}
                                    scope="col"
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                  >
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {item.rows?.map((row, rowIndex) => (
                                <tr
                                  key={rowIndex}
                                  className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}
                                >
                                  {row.map((cell, cellIndex) => (
                                    <td
                                      key={cellIndex}
                                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                                    >
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {item.translatedHeaders && item.translatedRows && (
                          <div className="overflow-x-auto mt-4">
                            <h4 className="text-md font-medium mb-2 text-blue-600">Translated Table</h4>
                            <table className="min-w-full divide-y divide-blue-100 border border-blue-200">
                              <thead className="bg-blue-50">
                                <tr>
                                  {item.translatedHeaders?.map((header, headerIndex) => (
                                    <th
                                      key={headerIndex}
                                      scope="col"
                                      className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider"
                                    >
                                      {header}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-blue-100">
                                {item.translatedRows?.map((row, rowIndex) => (
                                  <tr
                                    key={rowIndex}
                                    className={rowIndex % 2 === 0 ? "bg-white" : "bg-blue-50"}
                                  >
                                    {row.map((cell, cellIndex) => (
                                      <td
                                        key={cellIndex}
                                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-700"
                                      >
                                        {cell}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <div className="prose max-w-none">
                  <div dangerouslySetInnerHTML={{
                    __html: formatExtractedContentAsMarkdown(content)
                      .replace(/\n/g, '<br/>')
                      .replace(/#{3,} (.*)/g, '<h3>$1</h3>')
                      .replace(/#{2} (.*)/g, '<h2>$1</h2>')
                      .replace(/#{1} (.*)/g, '<h1>$1</h1>')
                  }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
