import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ExtractedContent as ExtractedContentType } from "@shared/schema";
import { exportAsText, exportAsJson, exportAsMarkdown, formatExtractedContentAsMarkdown } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { DocumentInfo } from "@/components/DocumentInfo";

interface ExtractedContentProps {
  content: ExtractedContentType;
  fileName: string;
  onProcessAnother: () => void;
}

export const ExtractedContentNew: React.FC<ExtractedContentProps> = ({
  content,
  fileName,
  onProcessAnother,
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
          <div className="md:col-span-1">
            <DocumentInfo content={content} fileName={fileName} />
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
                          {!item.headers || !item.rows || item.headers.length === 0 || item.rows.length === 0 ? (
                            <div className="p-4 border border-gray-200 rounded bg-gray-50">
                              <p className="text-gray-500">Table could not be rendered (missing data)</p>
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
                            <h4 className="text-md font-medium mb-2 text-blue-600">Translated Table</h4>
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
                  <div dangerouslySetInnerHTML={{ 
                    __html: formatExtractedContentAsMarkdown(content)
                      .replace(/\n/g, '<br/>')
                      .replace(/Heading: (.*)/g, '<h3 class="text-xl font-bold my-4">$1</h3>')
                      .replace(/Section: (.*)/g, '<h2 class="text-2xl font-bold my-4">$1</h2>')
                      .replace(/Subheading: (.*)/g, '<h4 class="text-lg font-semibold my-3">$1</h4>')
                      .replace(/Page break/g, '<hr class="my-6 border-t-2 border-gray-300" />')
                      .replace(/Page separator/g, '<hr class="my-4 border-t border-gray-200" />')
                      .replace(/Table:/g, '<div class="my-4 font-semibold">Table:</div>')
                      .replace(/End table/g, '')
                      .replace(/End translated table/g, '')
                      .replace(/Row: /g, '<div class="grid grid-cols-6 gap-2 mb-1">')
                      .replace(/\[(.*?)\] /g, '<div class="border border-gray-300 p-2 text-sm">$1</div>')
                      .replace(/\n/g, '</div>')
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