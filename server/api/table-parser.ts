/**
 * Enhanced table parsing logic
 * 
 * This function improves table detection and parsing from raw text content
 * extracted from PDFs. It handles various table formats including:
 * 1. Markdown tables with | delimiters
 * 2. ASCII art tables with + and - characters
 * 3. Structured lists with proper indentation
 */

// Import the types we need
type ContentItem = {
  type: "text" | "heading" | "code" | "table";
  content?: string;
  translatedContent?: string;
  language?: string;
  headers?: string[];
  translatedHeaders?: string[];
  rows?: string[][];
  translatedRows?: string[][];
};

function parseTablesFromText(content: string, fileName: string): ContentItem[] {
  const contentItems: ContentItem[] = [];
  
  // Add initial welcome message
  contentItems.push({
    type: "heading",
    content: `Extracted Content from ${fileName}`,
  });
  
  // Advanced table detection with multiple patterns
  const markdownTableRegex = /\|(.+)\|/g;
  const asciiTableRegex = /\+[-+]+\+/;
  const structuredListRegex = /^[\s]*([a-zA-Z0-9]+[\)\.]\s+|[-•*]\s+).+(\n[\s]*([a-zA-Z0-9]+[\)\.]\s+|[-•*]\s+).+)+/m;
  
  const hasTable = markdownTableRegex.test(content) || asciiTableRegex.test(content);
  const hasStructuredList = structuredListRegex.test(content);
  
  console.log(`Content analysis: Tables detected: ${hasTable}, Structured lists detected: ${hasStructuredList}`);
  
  // Process content for tables, structured lists, and text sections
  if (hasTable || hasStructuredList) {
    console.log('Structured data detected, processing tables and lists');
    
    // First, identify page breaks and split content by pages if possible
    const pageBreakPattern = /\n-{3,}|={3,}|\n\s*Page\s+\d+\s*\n|\n\s*\[\s*Page\s+\d+\s*\]/gi;
    let pageChunks = content.split(pageBreakPattern);
    
    // If we couldn't detect page breaks or only have one chunk, try a different approach
    if (pageChunks.length === 1) {
      // Use regular expressions to identify potential section breaks
      const sectionBreakPattern = /\n\s*#{1,3}\s+|\n\s*\*{3,}\s*\n|\n\s*={3,}\s*\n|\n\s*-{3,}\s*\n/g;
      pageChunks = content.split(sectionBreakPattern);
    }
    
    // Process each chunk (page or section)
    for (const chunk of pageChunks) {
      if (chunk.trim().length === 0) continue;
      
      // Check if the chunk contains a table
      if (chunk.includes('|') && (chunk.includes('|-') || chunk.includes('|='))) {
        // This looks like a markdown table, try to parse it
        try {
          // Identify the table section (might be preceded by a title or description)
          let tableSection = chunk;
          const tableStart = chunk.indexOf('|');
          if (tableStart > 0) {
            // There's content before the table, separate it
            const preTableContent = chunk.substring(0, tableStart).trim();
            if (preTableContent.length > 0) {
              // Add the content before table as text or heading
              if (preTableContent.length < 100 && !preTableContent.includes('\n')) {
                contentItems.push({
                  type: "heading",
                  content: preTableContent,
                });
              } else {
                contentItems.push({
                  type: "text",
                  content: preTableContent,
                });
              }
            }
            tableSection = chunk.substring(tableStart);
          }
          
          // Improved table parser that handles various markdown table formats
          const tableLines = tableSection.split('\n')
            .filter(line => line.trim().length > 0)
            .filter(line => line.includes('|'));
          
          if (tableLines.length >= 3) { // Need at least header, separator, and one data row
            // Find the header and separator lines
            let headerLineIndex = 0;
            let separatorLineIndex = -1;
            
            // Look for the separator line (contains |--)
            for (let i = 0; i < tableLines.length; i++) {
              if (tableLines[i].includes('|-') || tableLines[i].includes('|=')) {
                separatorLineIndex = i;
                // The header is typically the line before the separator
                headerLineIndex = i > 0 ? i - 1 : 0;
                break;
              }
            }
            
            // If we found a separator line
            if (separatorLineIndex !== -1) {
              // Get the header line
              const headerLine = tableLines[headerLineIndex];
              
              // Extract headers, handling empty first/last cells properly
              const headerParts = headerLine.split('|');
              const headers = headerParts
                .slice(1, headerParts.length - 1) // Remove first/last empty items
                .map(cell => cell.trim());
                
              // Only proceed if we have valid headers
              if (headers.length > 0) {
                // Extract rows, starting after the separator line
                const rows = tableLines.slice(separatorLineIndex + 1)
                  .map(line => {
                    const parts = line.split('|');
                    // Handle empty first/last cells properly
                    return parts
                      .slice(1, parts.length - 1)
                      .map(cell => cell.trim());
                  })
                  .filter(row => row.length === headers.length); // Ensure rows match header count
                
                // Only add the table if we have rows
                if (rows.length > 0) {
                  console.log(`Parsed table with ${headers.length} columns and ${rows.length} rows`);
                  contentItems.push({
                    type: "table",
                    headers,
                    rows
                  });
                  continue; // Skip to next chunk after processing table
                }
              }
            }
          }
          
          // If we reach here, table parsing didn't succeed, try ASCII art tables
          if (asciiTableRegex.test(tableSection)) {
            console.log('Attempting to parse ASCII art table');
            try {
              // ASCII table parsing logic
              const asciiLines = tableSection.split('\n').filter(line => line.trim().length > 0);
              
              // Locate header row (first row between border rows)
              let headerRowIndex = -1;
              let dataStartIndex = -1;
              
              for (let i = 0; i < asciiLines.length; i++) {
                if (asciiLines[i].includes('+--') || asciiLines[i].includes('+==')) {
                  if (headerRowIndex === -1 && i + 1 < asciiLines.length) {
                    headerRowIndex = i + 1;
                  } else if (dataStartIndex === -1 && i > headerRowIndex) {
                    dataStartIndex = i + 1;
                    break;
                  }
                }
              }
              
              if (headerRowIndex !== -1 && dataStartIndex !== -1) {
                // Parse header row
                const headerRow = asciiLines[headerRowIndex];
                const headers = [];
                let currentHeader = '';
                let inCell = false;
                
                for (let i = 0; i < headerRow.length; i++) {
                  if (headerRow[i] === '|') {
                    if (inCell) {
                      headers.push(currentHeader.trim());
                      currentHeader = '';
                    }
                    inCell = !inCell;
                  } else if (inCell) {
                    currentHeader += headerRow[i];
                  }
                }
                
                // Parse data rows
                const rows = [];
                for (let i = dataStartIndex; i < asciiLines.length; i++) {
                  if (asciiLines[i].includes('+--') || asciiLines[i].includes('+==')) {
                    continue; // Skip separator rows
                  }
                  
                  if (asciiLines[i].includes('|')) {
                    const row = [];
                    let currentCell = '';
                    let inCell = false;
                    
                    for (let j = 0; j < asciiLines[i].length; j++) {
                      if (asciiLines[i][j] === '|') {
                        if (inCell) {
                          row.push(currentCell.trim());
                          currentCell = '';
                        }
                        inCell = !inCell;
                      } else if (inCell) {
                        currentCell += asciiLines[i][j];
                      }
                    }
                    
                    if (row.length > 0) {
                      rows.push(row);
                    }
                  }
                }
                
                if (headers.length > 0 && rows.length > 0) {
                  console.log(`Parsed ASCII table with ${headers.length} columns and ${rows.length} rows`);
                  contentItems.push({
                    type: "table",
                    headers,
                    rows
                  });
                  continue; // Skip to next chunk after processing table
                }
              }
            } catch (asciiTableError) {
              console.warn('ASCII table parsing failed:', asciiTableError);
            }
          }
          
          // If we get here, neither markdown nor ASCII table parsing succeeded
          contentItems.push({
            type: "text",
            content: chunk.trim(),
          });
        } catch (tableError) {
          console.warn('Table parsing failed:', tableError);
          contentItems.push({
            type: "text",
            content: chunk.trim(),
          });
        }
      } else if (structuredListRegex.test(chunk)) {
        // This is a structured list, try to format it properly
        try {
          const listLines = chunk.split('\n');
          let listContent = '';
          let isInList = false;
          
          for (let i = 0; i < listLines.length; i++) {
            const line = listLines[i].trim();
            
            if (/^[a-zA-Z0-9]+[\)\.]\s+|^[-•*]\s+/.test(line)) {
              // This is a list item
              if (!isInList) {
                // Start a new list
                listContent += '\n';
                isInList = true;
              }
              // Format list item properly
              listContent += line + '\n';
            } else if (isInList && line.length > 0 && !/^\s*$/.test(line)) {
              // This is a continuation of a list item
              listContent += '    ' + line + '\n';
            } else if (line.length > 0) {
              // Not part of a list
              if (isInList) {
                listContent += '\n';
                isInList = false;
              }
              listContent += line + '\n';
            }
          }
          
          contentItems.push({
            type: "text",
            content: listContent.trim(),
          });
        } catch (listError) {
          console.warn('List parsing failed:', listError);
          contentItems.push({
            type: "text",
            content: chunk.trim(),
          });
        }
      } else if (chunk.trim().length > 0) {
        // Regular text content
        contentItems.push({
          type: "text",
          content: chunk.trim(),
        });
      }
    }
  } else {
    // No tables or structured lists detected, split by headings instead
    const lines = content.split('\n');
    let currentSection = "";
    
    for (const line of lines) {
      // Check if this is a heading
      if (line.startsWith('# ')) {
        // Save previous section if it exists
        if (currentSection.trim().length > 0) {
          contentItems.push({
            type: "text",
            content: currentSection.trim(),
          });
        }
        
        // Add heading
        contentItems.push({
          type: "heading",
          content: line.substring(2).trim(),
        });
        
        // Reset current section
        currentSection = "";
      }
      // Check if this is a secondary heading 
      else if (line.startsWith('## ')) {
        // Save previous section if it exists
        if (currentSection.trim().length > 0) {
          contentItems.push({
            type: "text",
            content: currentSection.trim(),
          });
        }
        
        // Add heading
        contentItems.push({
          type: "heading",
          content: line.substring(3).trim(),
        });
        
        // Reset current section
        currentSection = "";
      }
      // Check if this might be code block
      else if (line.startsWith('```')) {
        // Save previous section if it exists
        if (currentSection.trim().length > 0) {
          contentItems.push({
            type: "text",
            content: currentSection.trim(),
          });
          currentSection = "";
        }
        
        // Extract the code block
        const codeLines = [];
        let language = null;
        let i = 1; // Start from next line
        
        // Check if language is specified
        if (line.length > 3) {
          language = line.substring(3).trim();
        }
        
        // Collect code block lines until closing ```
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        
        const codeContent = codeLines.join('\n');
        
        contentItems.push({
          type: "code",
          content: codeContent.trim(),
          language: language || undefined,
        });
        
        // Adjust line index to skip past the code block
        i = Math.min(i + 1, lines.length);
      }
      else {
        // Regular text, add to current section
        currentSection += line + '\n';
      }
    }
    
    // Add any remaining text
    if (currentSection.trim().length > 0) {
      contentItems.push({
        type: "text",
        content: currentSection.trim(),
      });
    }
  }
  
  return contentItems;
}

// Export the function for use in openrouter.ts
export { parseTablesFromText };