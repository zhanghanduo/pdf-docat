import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ExtractedContent as ExtractedContentType } from "@shared/schema";
import { exportAsText, exportAsJson } from "@/lib/utils";

interface ExtractedContentProps {
  content: ExtractedContentType;
  fileName: string;
  onProcessAnother: () => void;
}

export const ExtractedContent: React.FC<ExtractedContentProps> = ({
  content,
  fileName,
  onProcessAnother,
}) => {
  const handleExportText = () => {
    exportAsText(content, fileName);
  };

  const handleExportJSON = () => {
    exportAsJson(content, fileName);
  };

  return (
    <Card className="mt-8">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Extracted Content</h3>
          <p className="text-sm text-gray-500">
            Content extracted from your document
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handleExportText}>
            Export as TXT
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
        <div className="flex justify-between items-start">
          <div>
            <h4 className="text-xl font-semibold">{content.title}</h4>
            <p className="text-sm text-gray-500">
              {content.pages} pages • Extraction time: {content.metadata.extractionTime} • Word
              count: {content.metadata.wordCount} • Confidence:{" "}
              {(content.metadata.confidence * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="mt-6 prose prose-sm max-w-none">
          {content.content.map((item, index) => (
            <div key={index} className="mb-4">
              {/* Text content */}
              {item.type === "text" && <p className="text-gray-900">{item.content}</p>}

              {/* Heading content */}
              {item.type === "heading" && (
                <h3 className="text-lg font-semibold mt-6 mb-2">{item.content}</h3>
              )}

              {/* Code content */}
              {item.type === "code" && (
                <div className="bg-gray-800 text-gray-100 p-3 rounded-md overflow-x-auto">
                  <pre className="text-xs">{item.content}</pre>
                </div>
              )}

              {/* Table content */}
              {item.type === "table" && (
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
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
