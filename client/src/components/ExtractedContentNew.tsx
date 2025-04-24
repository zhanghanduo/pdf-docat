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
  processingTime?: number; // in milliseconds
}

export const ExtractedContentNew: React.FC<ExtractedContentProps> = ({
  content,
  fileName,
  onProcessAnother,
  processingTime = 0,
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
                <div className="prose prose-headings:my-4 prose-headings:font-bold prose-hr:my-4 max-w-none">
                  <div dangerouslySetInnerHTML={{ 
                    __html: formatExtractedContentAsMarkdown(content)
                      // Basic formatting - convert newlines to breaks
                      .replace(/\n\n/g, '</p><p>')
                      .replace(/\n/g, '<br/>')
                      
                      // Headers with proper hierarchy
                      .replace(/# (.*?)(\n|\r|$)/g, '<h1 class="text-3xl font-extrabold mt-6 mb-4 text-gray-900">$1</h1>')
                      .replace(/## (.*?)(\n|\r|$)/g, '<h2 class="text-2xl font-bold mt-5 mb-3 text-gray-800">$1</h2>')
                      .replace(/### (.*?)(\n|\r|$)/g, '<h3 class="text-xl font-semibold mt-4 mb-2 text-gray-800">$1</h3>')
                      .replace(/#### (.*?)(\n|\r|$)/g, '<h4 class="text-lg font-medium mt-3 mb-2 text-gray-700">$1</h4>')
                      
                      // Legacy format compatibility
                      .replace(/Heading: (.*?)(\n|\r|$)/g, '<h3 class="text-xl font-bold mt-4 mb-2">$1</h3>')
                      .replace(/Section: (.*?)(\n|\r|$)/g, '<h2 class="text-2xl font-bold mt-5 mb-3">$1</h2>')
                      .replace(/Subheading: (.*?)(\n|\r|$)/g, '<h4 class="text-lg font-medium mt-3 mb-2">$1</h4>')
                      
                      // Page separators
                      .replace(/---/g, '<hr class="my-6 border-t-2 border-gray-300" />')
                      .replace(/Page break/g, '<hr class="my-6 border-t-2 border-gray-300" />')
                      .replace(/Page separator/g, '<hr class="my-4 border-t border-gray-200" />')
                      
                      // Fix bullet points and lists
                      .replace(/- (.*?)(\n|\r|$)/g, '<li>$1</li>')
                      .replace(/<li>.*?<\/li>/g, match => `<ul class="list-disc pl-5 my-3">${match}</ul>`)
                      
                      // Code blocks - use proper syntax highlighting styling
                      .replace(/```(.*?)\n([\s\S]*?)```/g, '<pre class="bg-gray-800 text-gray-100 p-3 rounded-md overflow-x-auto my-4"><code>$2</code></pre>')
                      
                      // Proper table rendering with responsive design
                      // First, identify full markdown tables with headers, separator and rows
                      .replace(/\|(.*)\|\n\|([-:\s|]*)\|\n((\|.*\|\n)+)/g, (match: string, header: string, separator: string, rows: string) => {
                        // Process header row
                        const headers = header.split('|').map((cell: string) => cell.trim()).filter((cell: string) => cell !== '');
                        const headerRow = `<tr>${headers.map((h: string) => `<th class="px-4 py-2 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">${h}</th>`).join('')}</tr>`;
                        
                        // Process data rows
                        const dataRows = rows.trim().split('\n').map((row: string) => {
                          const cells = row.split('|').map((cell: string) => cell.trim()).filter((cell: string) => cell !== '');
                          return `<tr>${cells.map((cell: string) => `<td class="px-4 py-2 border-t border-gray-200 text-sm">${cell}</td>`).join('')}</tr>`;
                        }).join('');
                        
                        // Return complete table
                        return `<div class="overflow-x-auto my-6">
                          <table class="min-w-full divide-y divide-gray-300 border border-gray-200 rounded-md">
                            <thead>${headerRow}</thead>
                            <tbody class="bg-white divide-y divide-gray-200">${dataRows}</tbody>
                          </table>
                        </div>`;
                      })
                      
                      // Handle table section headers separately
                      .replace(/### Table\s*$/gm, '<h3 class="text-lg font-semibold mt-6 mb-2">Table</h3>')
                      .replace(/### Translated Table\s*$/gm, '<h3 class="text-lg font-semibold mt-6 mb-2 text-blue-600">Translated Table</h3>')
                      
                      // Format translations
                      .replace(/\*Translation:\*([\s\S]*?)(?=<h|<hr|$)/g, '<div class="bg-blue-50 p-3 mt-2 mb-4 rounded border-l-4 border-blue-500"><p class="text-gray-800">$1</p></div>')
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