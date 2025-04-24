import axios from 'axios';
import { EngineType, ExtractedContent } from '@shared/schema';
import { parseTablesFromText } from './table-parser';

const API_KEY = process.env.OPENROUTER_API_KEY || '';
const BASE_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Get the hostname for http-referer header
const HOSTNAME = process.env.REPL_SLUG ? `${process.env.REPL_SLUG}.replit.dev` : 'localhost:3000';
console.log(`HTTP Referer will be set to: https://${HOSTNAME}`);

// Function to validate API key format
function validateApiKey(key: string): boolean {
  // OpenRouter API keys typically start with "sk-or-" and should be non-empty
  return key.trim().length > 20 && key.startsWith('sk-or-');
}

// Log API key status (without revealing the key)
if (!API_KEY) {
  console.warn('OpenRouter API key is not set. PDF processing will not work.');
} else if (!validateApiKey(API_KEY)) {
  console.warn('OpenRouter API key may be malformed. It should start with "sk-or-". Please check the format.');
  console.log(`Current key starts with: ${API_KEY.substring(0, 5)}... (length: ${API_KEY.length} chars)`);
} else {
  console.log('OpenRouter API key is properly configured.');
  // For debugging only, log the first 5 characters
  console.log(`Key starts with: ${API_KEY.substring(0, 5)}... (length: ${API_KEY.length} chars)`);
}

// Helper to encode file to base64
export const encodeFileToBase64 = (buffer: Buffer): string => {
  return buffer.toString('base64');
};

// Process PDF with OpenRouter API
export async function processPDF(
  pdfBase64: string,
  fileName: string,
  engine: EngineType = 'mistral-ocr',
  fileAnnotations?: string,
  translationOptions?: {
    translateEnabled: boolean;
    targetLanguage: string;
    dualLanguage: boolean;
  }
): Promise<{
  extractedContent: ExtractedContent;
  fileAnnotations: string;
}> {
  try {
    console.log(`Starting PDF processing for file: ${fileName} with engine: ${engine}`);
    
    // Check if API key is available
    if (!API_KEY) {
      throw new Error('OpenRouter API key is not configured.');
    }
    
    console.log(`API Key format validation: ${API_KEY.startsWith('sk-or-') ? 'Looks valid' : 'Invalid format'}`);
    console.log(`API Key length: ${API_KEY.length} characters`);
    
    // Check PDF size
    const estimatedSize = pdfBase64.length * 0.75; // Rough estimate of base64 to raw size
    console.log(`Estimated PDF size: ${Math.round(estimatedSize / 1024 / 1024)} MB`);
    
    if (estimatedSize > 25 * 1024 * 1024) {
      throw new Error('PDF file is too large. Maximum allowed size is 25MB.');
    }
    
    // Prepare the message content
    let promptText = 'Please extract all content from this PDF including text, tables, and structured data. ' +
      'Please maintain the document structure exactly as presented in the PDF. ' +
      'Count the total number of pages in the PDF document and include that in your response. ' +
      'For tables: Preserve the exact structure with proper headers and row alignment. Tables should be formatted in a clean, consistent way that preserves all columns and rows. ' +
      'Make sure to clearly separate different sections and maintain proper indentation for nested elements. ' +
      'Break content by page, marking each page with a clear separator. ' +
      'Also summarize any diagrams or images if present.';
    
    // Add translation instructions if enabled
    if (translationOptions?.translateEnabled) {
      const targetLang = translationOptions.targetLanguage.replace('-', ' ');
      if (translationOptions.dualLanguage) {
        promptText += ` After extracting the content, please translate it to ${targetLang} and return the content in a structured JSON format where each section has both 'original' and 'translated' versions. The structure should be easy to parse programmatically. The format for each content block should be: {"type": "[content_type]", "content": "[original_text]", "translatedContent": "[translated_text]"}. For tables, include both the original and translated headers and rows. Make sure table format is preserved identically in both languages.`;
      } else {
        promptText += ` After extracting the content, please translate it to ${targetLang}. Return the translated content only.`;
      }
    }
    
    console.log('Building API request payload');
    
    let messageContent: any[] = [
      {
        type: 'text',
        text: promptText,
      },
      {
        type: 'file',
        file: {
          filename: fileName,
          file_data: `data:application/pdf;base64,${pdfBase64}`,
        },
      },
    ];

    // If we have file annotations from a previous request, include them to avoid re-parsing costs
    if (fileAnnotations) {
      console.log('Using existing file annotations');
      try {
        messageContent.push({
          type: 'file_annotations',
          file_annotations: JSON.parse(fileAnnotations),
        });
      } catch (err) {
        console.warn('Failed to parse existing file annotations, continuing without them');
      }
    }

    // Set up the plugins configuration for the engine as shown in example
    const plugins = [
      {
        id: 'file-parser',
        pdf: {
          engine: engine, // uses the engine provided in function parameters
        },
      },
    ];

    console.log('Sending request to OpenRouter API');
    
    // Set up proper headers for OpenRouter
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'HTTP-Referer': `https://${HOSTNAME}`,
      'X-Title': 'DocCat PDF Extractor'
    };
    
    // Try a hybrid authentication approach
    let API_URL: string = BASE_API_URL;
    if (API_KEY) {
      // Clean up the key to avoid any formatting issues
      const cleanKey = API_KEY.trim().replace(/\s+/g, '');
      
      // Use standard Authorization Bearer token in header (most common API pattern)
      headers['Authorization'] = `Bearer ${cleanKey}`;
      
      console.log('Using standard Bearer token authentication in header');
      console.log(`API key starts with: ${cleanKey.substring(0, 5)}...`);
    } else {
      console.error('No API key provided for OpenRouter');
    }
    
    console.log('Sending request with Bearer token authentication');
    
    // Make the API request to OpenRouter
    console.log('API request details:');
    console.log(`- Endpoint: ${API_URL}`);
    console.log(`- Model: anthropic/claude-3-sonnet:poe`);
    console.log(`- Timeout: 120 seconds`);
    
    const response = await axios.post(
      API_URL,
      {
        model: 'anthropic/claude-3-sonnet:poe', // Using Claude Sonnet for better balance of quality and cost
        messages: [
          {
            role: 'user',
            content: messageContent,
          },
        ],
        max_tokens: 4000, // Set a reasonable token limit
        temperature: 0.1, // Lower temperature for more consistent results
        plugins: plugins // Add back plugins parameter
      },
      {
        headers,
        timeout: 120000, // 2 minute timeout
      }
    );

    console.log('Received response from OpenRouter API');
    
    if (!response.data || !response.data.choices || !response.data.choices.length) {
      throw new Error('Invalid response format from OpenRouter API');
    }

    // Extract the assistant's response
    const assistantMessage = response.data.choices[0].message;
    
    if (!assistantMessage || !assistantMessage.content) {
      throw new Error('No content in the assistant response');
    }
    
    // Extract file annotations if they exist
    let annotations = '';
    if (assistantMessage.file_annotations) {
      console.log('File annotations received from API');
      annotations = JSON.stringify(assistantMessage.file_annotations);
    }

    // Parse the content into our expected format
    console.log('Parsing extracted content');
    const extractedContent = parseExtractedContent(assistantMessage.content, fileName);

    console.log('PDF processing completed successfully');
    return {
      extractedContent,
      fileAnnotations: annotations,
    };
  } catch (error: any) {
    // More detailed error logging
    console.error('Error processing PDF with OpenRouter:');
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      console.error('Response headers:', error.response.headers);
      
      if (error.response.status === 413) {
        throw new Error('PDF file is too large for processing.');
      } else if (error.response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.response.status === 401 || error.response.status === 403) {
        // Check for specific JWT format error by examining headers
        const errorHeaders = error.response.headers;
        if (errorHeaders && errorHeaders['x-clerk-auth-message'] && 
            errorHeaders['x-clerk-auth-message'].includes('JWT')) {
          console.error('JWT format error detected in response headers:', errorHeaders['x-clerk-auth-message']);
          
          // Try again with alternative authorization format on next attempt
          console.log('Will attempt with alternative authorization format on next try');
          throw new Error(`Authentication error with OpenRouter API: ${errorHeaders['x-clerk-auth-message']}. The API key format may need to be adjusted.`);
        } else {
          // Generic auth error
          throw new Error('Authentication error with OpenRouter API. Please check your API key.');
        }
      } else if (error.response.status === 500) {
        console.error('Server error from OpenRouter. Response data:', error.response.data);
        
        // Check for JWT errors in headers even for status 500
        const errorHeaders = error.response.headers;
        if (errorHeaders && errorHeaders['x-clerk-auth-message'] && 
            errorHeaders['x-clerk-auth-message'].includes('JWT')) {
          console.error('JWT format error detected in 500 response headers:', errorHeaders['x-clerk-auth-message']);
          console.log('Will attempt with alternative authorization format on next try');
          throw new Error(`Authentication error with OpenRouter API: ${errorHeaders['x-clerk-auth-message']}. The API key format may need to be adjusted.`);
        }
        
        throw new Error('OpenRouter server error. This might be a temporary issue. Please try again later.');
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
      throw new Error('No response from OpenRouter API. Please check your internet connection and try again.');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error message:', error.message);
    }
    
    // Generic error for other cases
    throw new Error(`Failed to process PDF: ${error.message || 'Unknown error'}`);
  }
}

// Parse the content from OpenRouter into our expected format
function parseExtractedContent(content: string, fileName: string): ExtractedContent {
  try {
    console.log('Beginning content parsing');
    
    // Attempt to parse content as JSON if it appears to be in JSON format
    let isTranslatedContent = false;
    let targetLanguage;
    let contentItems = [];
    let decodedContent = content;

    try {
      // Check if the content includes JSON blocks
      if (content.includes('{"type":') || content.trim().startsWith('[') || content.trim().startsWith('{')) {
        // Extract JSON objects from the content if they exist
        const jsonMatches = content.match(/\{[\s\S]*?\}/g);
        
        if (jsonMatches && jsonMatches.length > 0) {
          // Try to parse each JSON object
          const parsedItems = [];
          
          for (const jsonStr of jsonMatches) {
            try {
              const item = JSON.parse(jsonStr);
              
              // Check if this is a content item with translations
              if (item.type && (item.content || item.translatedContent)) {
                isTranslatedContent = !!item.translatedContent;
                parsedItems.push(item);
              }
            } catch (err) {
              console.warn('Failed to parse potential JSON item:', jsonStr.substring(0, 50) + '...');
            }
          }
          
          if (parsedItems.length > 0) {
            contentItems = parsedItems;
            console.log(`Successfully parsed ${parsedItems.length} structured content items`);
          }
        }
        
        // If we couldn't parse individual items, try to parse the entire response
        if (contentItems.length === 0) {
          try {
            // Look for JSON in the content - it might be wrapped in markdown code blocks
            const jsonPattern = /```(?:json)?\s*([\s\S]*?)\s*```/g;
            let match;
            let matches: string[] = [];
            
            // Manually collect matches instead of using matchAll which requires ES2015+
            while ((match = jsonPattern.exec(content)) !== null) {
              if (match[1]) {
                matches.push(match[1]);
              }
            }
            
            if (matches.length > 0) {
              // Use the largest JSON block found
              let largestMatch = matches[0];
              for (const matchText of matches) {
                if (matchText.length > largestMatch.length) {
                  largestMatch = matchText;
                }
              }
              
              const parsed = JSON.parse(largestMatch);
              if (Array.isArray(parsed)) {
                contentItems = parsed;
                console.log('Successfully parsed content as a JSON array');
              } else if (parsed.content && Array.isArray(parsed.content)) {
                contentItems = parsed.content;
                console.log('Successfully parsed content from a nested JSON object');
                
                // Check if this is translated content
                if (parsed.metadata?.targetLanguage) {
                  isTranslatedContent = true;
                  targetLanguage = parsed.metadata.targetLanguage;
                }
              }
            }
          } catch (err: any) {
            console.warn('Failed to parse content as complete JSON:', err.message || 'Unknown error');
          }
        }
      }
    } catch (jsonError: any) {
      console.warn('Error trying to parse JSON content:', jsonError.message || 'Unknown error');
    }
    
    // If we couldn't parse JSON, fall back to text processing
    if (contentItems.length === 0) {
      console.log('Falling back to text processing');
      
      // Try to identify table structures in the content
      // Advanced table detection with multiple patterns
      const markdownTableRegex = /\|(.+)\|/g;
      const asciiTableRegex = /\+[-+]+\+/;
      const structuredListRegex = /^[\s]*([a-zA-Z0-9]+[\)\.]\s+|[-•*]\s+).+(\n[\s]*([a-zA-Z0-9]+[\)\.]\s+|[-•*]\s+).+)+/m;
      
      const hasTable = markdownTableRegex.test(content) || asciiTableRegex.test(content);
      const hasStructuredList = structuredListRegex.test(content);
      
      console.log(`Content analysis: Tables detected: ${hasTable}, Structured lists detected: ${hasStructuredList}`);
      
      // Add initial welcome message
      contentItems.push({
        type: "heading",
        content: `Extracted Content from ${fileName}`,
      });
      
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
        // Process regular text content with markdown aware parsing
        // Split by headers
        const lines = content.split('\n');
        let currentSection = "";
        
        for (const line of lines) {
          // Check if this is a heading
          if (line.startsWith('# ')) {
            // If we have accumulated text, add it before starting a new section
            if (currentSection.trim().length > 0) {
              contentItems.push({
                type: "text",
                content: currentSection.trim(),
              });
              currentSection = "";
            }
            
            contentItems.push({
              type: "heading",
              content: line.substring(2).trim(),
            });
          } else if (line.startsWith('## ') || line.startsWith('### ')) {
            // If we have accumulated text, add it before starting a new section
            if (currentSection.trim().length > 0) {
              contentItems.push({
                type: "text",
                content: currentSection.trim(),
              });
              currentSection = "";
            }
            
            contentItems.push({
              type: "heading",
              content: line.substring(line.indexOf(' ')).trim(),
            });
          } else if (line.startsWith('```')) {
            // Code block start/end
            if (line.length > 3) {
              // Code block with language specification
              const language = line.substring(3).trim();
              
              // If we have accumulated text, add it
              if (currentSection.trim().length > 0) {
                contentItems.push({
                  type: "text",
                  content: currentSection.trim(),
                });
                currentSection = "";
              }
              
              // Find the end of the code block
              let codeContent = "";
              let i = lines.indexOf(line) + 1;
              while (i < lines.length && !lines[i].startsWith('```')) {
                codeContent += lines[i] + '\n';
                i++;
              }
              
              contentItems.push({
                type: "code",
                content: codeContent.trim(),
                language: language || undefined,
              });
              
              // Skip the lines we've processed
              lines.splice(lines.indexOf(line), i - lines.indexOf(line) + 1);
            }
          } else {
            // Regular line, accumulate it
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
    }
    
    // Count words for metadata
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    
    // Extract page count from the content
    let pageCount = 1;
    try {
      // Look for typical page count mentions in the content
      const pageMatches = content.match(/(\d+)\s*pages|page\s*count:\s*(\d+)|total\s*pages:\s*(\d+)/i);
      if (pageMatches) {
        const foundCount = parseInt(pageMatches[1] || pageMatches[2] || pageMatches[3], 10);
        if (!isNaN(foundCount) && foundCount > 0) {
          pageCount = foundCount;
          console.log(`Extracted page count: ${pageCount} pages`);
        }
      }
      
      // Check for Page X of Y patterns
      const pageXofYMatch = content.match(/Page\s+\d+\s+of\s+(\d+)/i);
      if (pageXofYMatch && pageXofYMatch[1]) {
        const totalPages = parseInt(pageXofYMatch[1], 10);
        if (!isNaN(totalPages) && totalPages > pageCount) {
          pageCount = totalPages;
          console.log(`Found "Page X of Y" format, total pages: ${pageCount}`);
        }
      }
      
      // Check content structure - if we have page markers like "Page 1", "Page 2", etc.
      const pageMarkers = content.match(/Page\s+\d+/gi);
      if (pageMarkers && pageMarkers.length > 0) {
        const highestPage = Math.max(...pageMarkers.map(marker => {
          const num = parseInt(marker.replace(/Page\s+/i, ''), 10);
          return isNaN(num) ? 0 : num;
        }));
        if (highestPage > pageCount) {
          pageCount = highestPage;
          console.log(`Counted page markers, highest page: ${pageCount}`);
        }
      }
    } catch (err) {
      console.warn('Error extracting page count:', err);
    }

    return {
      title: fileName.replace('.pdf', ''), // Remove .pdf extension from title
      pages: pageCount,
      content: contentItems,
      metadata: {
        extractionTime: new Date().toISOString(),
        wordCount: wordCount,
        confidence: 0.95,
        isTranslated: isTranslatedContent,
        targetLanguage: targetLanguage,
      },
    };
  } catch (error) {
    console.error('Error parsing extracted content:', error);
    
    // Return a fallback structure in case of parsing errors
    let fallbackPageCount = 1;
    try {
      // Even in error case, try to extract page count
      const pageMatches = content.match(/(\d+)\s*pages|page\s*count:\s*(\d+)|total\s*pages:\s*(\d+)/i);
      if (pageMatches) {
        const foundCount = parseInt(pageMatches[1] || pageMatches[2] || pageMatches[3], 10);
        if (!isNaN(foundCount) && foundCount > 0) {
          fallbackPageCount = foundCount;
        }
      }
    } catch (err) {}

    return {
      title: fileName,
      pages: fallbackPageCount,
      content: [
        {
          type: "text",
          content: 'Content was extracted but could not be properly formatted. Raw content:',
        },
        {
          type: "text",
          content: content || 'No content available',
        },
      ],
      metadata: {
        extractionTime: new Date().toISOString(),
        wordCount: content ? content.split(/\s+/).length : 0,
        confidence: 0.5, // Lower confidence due to parsing issues
      },
    };
  }
}
