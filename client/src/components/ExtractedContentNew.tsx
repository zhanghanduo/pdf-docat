import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ExtractedContent as ExtractedContentType } from "@shared/schema";
import { exportAsText, exportAsJson, exportAsMarkdown, formatExtractedContentAsMarkdown } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { DocumentInfo } from "@/components/DocumentInfo";
import { useLanguage } from "@/hooks/use-language";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ExtractedContentProps {
  content: ExtractedContentType;
  fileName: string;
  onProcessAnother: () => void;
  processingTime?: number; // in milliseconds
}

export const ExtractedContentNew: React.FC<ExtractedContentProps> = ({
  content,
  fileName,
  onProcessAnother,
  processingTime = 0,
}) => {
  const [viewMode, setViewMode] = useState<"rendered" | "markdown">("markdown");
  const { t } = useLanguage();
  
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
          <h3 className="text-lg font-medium text-gray-900">{t('extracted_content')}</h3>
          <p className="text-sm text-gray-500">
            {t('content_extracted')}
            {isTranslated && t('with_translation')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleExportText}>
            {t('export_txt')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportMarkdown}>
            {t('export_md')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportJSON}>
            {t('export_json')}
          </Button>
          <Button size="sm" onClick={onProcessAnother}>
            {t('process_another')}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Left sidebar with document information */}
          <div className="md:col-span-1">
            <DocumentInfo 
              content={content} 
              fileName={fileName} 
              processingTime={processingTime}
            />
          </div>
          
          {/* Right content area */}
          <div className="md:col-span-3">
            <div className="flex justify-between items-start mb-4">
              <h4 className="text-xl font-semibold">{content.title}</h4>
              
              <div className="flex items-center space-x-2">
                <Tabs defaultValue="markdown" onValueChange={(v) => setViewMode(v as "rendered" | "markdown")}>
                  <TabsList>
                    <TabsTrigger value="markdown">{t('enhanced_view')}</TabsTrigger>
                    <TabsTrigger value="rendered">{t('classic_view')}</TabsTrigger>
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
                          {!item.headers || !item.rows || item.headers.length === 0 || item.rows.length === 0 ? (
                            <div className="p-4 border border-gray-200 rounded bg-gray-50">
                              <p className="text-gray-500">{t('table_missing_data')}</p>
                            </div>
                          ) : (
                            <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  {item.headers?.map((header, headerIndex) => (
                                    <th
                                      key={headerIndex}
                                      scope="col"
                                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200"
                                    >
                                      {header}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {item.rows?.map((row, rowIndex) => {
                                  // Safe non-nullable reference to headers
                                  const headers = item.headers || [];
                                  // Ensure row has same number of cells as headers
                                  const safeRow = row.length < headers.length 
                                    ? [...row, ...Array(headers.length - row.length).fill('')] 
                                    : row.length > headers.length 
                                      ? row.slice(0, headers.length) 
                                      : row;
                                      
                                  return (
                                    <tr
                                      key={rowIndex}
                                      className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}
                                    >
                                      {safeRow.map((cell, cellIndex) => (
                                        <td
                                          key={cellIndex}
                                          className="px-6 py-4 text-sm text-gray-500 border border-gray-200"
                                        >
                                          {cell}
                                        </td>
                                      ))}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                        </div>
                        
                        {item.translatedHeaders && item.translatedRows && (
                          <div className="overflow-x-auto mt-4">
                            <h4 className="text-md font-medium mb-2 text-blue-600">{t('translated_table')}</h4>
                            <table className="min-w-full divide-y divide-blue-100 border border-blue-200">
                              <thead className="bg-blue-50">
                                <tr>
                                  {item.translatedHeaders?.map((header, headerIndex) => (
                                    <th
                                      key={headerIndex}
                                      scope="col"
                                      className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider border border-blue-200"
                                    >
                                      {header}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-blue-100">
                                {item.translatedRows?.map((row, rowIndex) => {
                                  // Safe non-nullable reference to translatedHeaders
                                  const translatedHeaders = item.translatedHeaders || [];
                                  // Ensure row has same number of cells as headers
                                  const safeRow = row.length < translatedHeaders.length 
                                    ? [...row, ...Array(translatedHeaders.length - row.length).fill('')] 
                                    : row.length > translatedHeaders.length 
                                      ? row.slice(0, translatedHeaders.length) 
                                      : row;
                                      
                                  return (
                                    <tr
                                      key={rowIndex}
                                      className={rowIndex % 2 === 0 ? "bg-white" : "bg-blue-50"}
                                    >
                                      {safeRow.map((cell, cellIndex) => (
                                        <td
                                          key={cellIndex}
                                          className="px-6 py-4 text-sm text-gray-700 border border-blue-100"
                                        >
                                          {cell}
                                        </td>
                                      ))}
                                    </tr>
                                  );
                                })}
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
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]} 
                    components={{
                      // Apply Tailwind classes to various elements
                      h1: ({node, ...props}) => <h1 className="text-3xl font-bold mb-4" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-2xl font-bold mb-4" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-xl font-semibold mb-3" {...props} />,
                      h4: ({node, ...props}) => <h4 className="text-lg font-medium mb-2" {...props} />,
                      p: ({node, ...props}) => <p className="my-4" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-5 my-3" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-3" {...props} />,
                      li: ({node, ...props}) => <li className="my-1" {...props} />,
                      table: ({node, ...props}) => <div className="overflow-x-auto my-4"><table className="min-w-full border border-gray-300" {...props} /></div>,
                      th: ({node, ...props}) => <th className="px-4 py-2 bg-gray-100 text-left font-medium" {...props} />,
                      td: ({node, ...props}) => <td className="px-4 py-2 border border-gray-200" {...props} />,
                      pre: ({node, ...props}) => <pre className="bg-gray-800 text-gray-100 p-3 rounded-md overflow-x-auto my-4" {...props} />,
                      code: ({node, ...props}) => 
                        <code className="bg-gray-100 text-red-500 px-1 py-0.5 rounded" {...props} />
                    }}
                  >
                    {formatExtractedContentAsMarkdown(content)}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};