import axios from 'axios';
import { EngineType, ExtractedContent } from '@shared/schema';

const API_KEY = process.env.OPENROUTER_API_KEY || '';
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

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
    let promptText = 'Please extract all content from this PDF including text, tables, and structured data. Format tables properly and maintain the document structure. Also summarize any diagrams or images if present.';
    
    // Add translation instructions if enabled
    if (translationOptions?.translateEnabled) {
      const targetLang = translationOptions.targetLanguage.replace('-', ' ');
      if (translationOptions.dualLanguage) {
        promptText += ` After extracting the content, please translate it to ${targetLang} and return the content in a structured JSON format where each section has both 'original' and 'translated' versions. The structure should be easy to parse programmatically. The format for each content block should be: {"type": "[content_type]", "content": "[original_text]", "translatedContent": "[translated_text]"}. For tables, include both the original and translated headers and rows.`;
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
        file_url: {
          mime_type: 'application/pdf',
          data: pdfBase64,
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

    // Set up the plugins configuration for the engine
    const plugins = [
      {
        id: 'file-parser',
        pdf: {
          engine: engine,
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
    
    // Add API key as a Bearer token (standard format for OpenRouter)
    if (API_KEY) {
      // OpenRouter requires "Bearer " prefix for the Authorization header with NO spaces in the key
      // Remove any potential whitespace that could cause JWT format issues
      const cleanKey = API_KEY.trim().replace(/\s+/g, '');
      headers['Authorization'] = `Bearer ${cleanKey}`;
      
      // Log the first few characters of the key for debugging (do not log the entire key)
      console.log(`Authorization header set with Bearer token, key starts with: ${cleanKey.substring(0, 5)}...`);
      console.log(`Authorization header length: ${headers['Authorization'].length}`);
    } else {
      console.error('No API key provided for OpenRouter');
    }
    
    console.log('Sending request with authorization header');
    
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
        plugins: plugins,
        max_tokens: 4000, // Set a reasonable token limit
        temperature: 0.1, // Lower temperature for more consistent results
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
        // Check for specific JWT format error
        const errorData = error.response.data;
        if (errorData && errorData.error && errorData.error.message && 
            errorData.error.message.includes('JWT')) {
          console.error('JWT format error detected:', errorData.error.message);
          throw new Error(`Authentication error with OpenRouter API: Invalid JWT format. Please check your API key format. Details: ${errorData.error.message}`);
        } else {
          throw new Error('Authentication error with OpenRouter API. Please check your API key.');
        }
      } else if (error.response.status === 500) {
        console.error('Server error from OpenRouter. Response data:', error.response.data);
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
      const tableRegex = /\|(.+)\|/g;
      const hasTable = tableRegex.test(content);
      
      // Add initial welcome message
      contentItems.push({
        type: "heading",
        content: `Extracted Content from ${fileName}`,
      });
      
      // Process content for tables and text sections
      if (hasTable) {
        console.log('Tables detected in content, processing structured data');
        
        // Split the content by markdown table patterns
        const sections = content.split(/(?=\|[\s\S]+\|)/g);
        
        for (const section of sections) {
          if (section.trim().startsWith('|') && section.includes('|')) {
            // This looks like a table, try to parse it
            try {
              const tableLines = section.split('\n').filter(line => line.trim().length > 0);
              const headerLine = tableLines[0];
              const separatorLine = tableLines[1];
              
              if (headerLine && separatorLine && separatorLine.includes('|-')) {
                // Extract headers
                const headers = headerLine
                  .split('|')
                  .filter(cell => cell.trim().length > 0)
                  .map(cell => cell.trim());
                
                // Extract rows
                const rows = tableLines.slice(2).map(line => 
                  line.split('|')
                    .filter(cell => cell.trim().length > 0)
                    .map(cell => cell.trim())
                );
                
                contentItems.push({
                  type: "table",
                  headers,
                  rows
                });
              } else {
                // Not a properly formatted table, treat as text
                contentItems.push({
                  type: "text",
                  content: section,
                });
              }
            } catch (tableError) {
              // If table parsing fails, add as text
              contentItems.push({
                type: "text",
                content: section,
              });
            }
          } else if (section.trim().length > 0) {
            // Regular text content
            contentItems.push({
              type: "text",
              content: section.trim(),
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
    
    return {
      title: fileName.replace('.pdf', ''), // Remove .pdf extension from title
      pages: 1, // This would be determined from the actual PDF in production
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
    return {
      title: fileName,
      pages: 1,
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
