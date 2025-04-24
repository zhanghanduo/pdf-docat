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
    let targetLanguage: string | undefined;
    let contentItems: any[] = [];
    
    // Try to parse JSON content first
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
    
    // If we couldn't parse JSON, fall back to text processing with our enhanced table parser
    if (contentItems.length === 0) {
      console.log('Falling back to text processing with enhanced table parser');
      
      // Use our improved table parser to process the content
      contentItems = parseTablesFromText(content, fileName);
      
      console.log(`Table parser extracted ${contentItems.length} content items`);
    } else {
      // Add initial welcome message if not already included in parsed JSON
      if (!contentItems.some((item: any) => item.type === "heading" && item.content?.includes(fileName))) {
        contentItems.unshift({
          type: "heading",
          content: `Extracted Content from ${fileName}`,
        });
      }
    }
    
    // Try to determine the total number of pages in the document
    let pageCount = 1; // Default to 1 page
    
    // Look for page count indicators in the content
    try {
      // Method 1: Look for "Total pages: X" or similar patterns
      const pageCountMatch = content.match(/total pages:?\s*(\d+)|pages:?\s*(\d+)|page count:?\s*(\d+)/i);
      if (pageCountMatch) {
        const count = parseInt(pageCountMatch[1] || pageCountMatch[2] || pageCountMatch[3]);
        if (!isNaN(count) && count > 0) {
          pageCount = count;
          console.log(`Extracted page count: ${pageCount} pages`);
        }
      }
      
      // Method 2: Look for "Page X of Y" patterns
      if (pageCount === 1) {
        const pageOfTotalMatch = content.match(/page\s+\d+\s+of\s+(\d+)/i);
        if (pageOfTotalMatch && pageOfTotalMatch[1]) {
          const count = parseInt(pageOfTotalMatch[1]);
          if (!isNaN(count) && count > 0) {
            pageCount = count;
            console.log(`Found "Page X of Y" format, total pages: ${pageCount}`);
          }
        }
      }
      
      // Method 3: Count page separators
      if (pageCount === 1) {
        const pageSeparatorMatches = content.match(/page\s+\d+|[-]{3,}|[=]{3,}|\n\s*\[\s*page\s+\d+\s*\]/gi);
        if (pageSeparatorMatches && pageSeparatorMatches.length > 0) {
          pageCount = pageSeparatorMatches.length + 1;
          console.log(`Counted page separators, estimated pages: ${pageCount}`);
        }
      }
    } catch (pageCountError) {
      console.warn('Error while trying to determine page count:', pageCountError);
    }
    
    // Build the final structured content
    const result: ExtractedContent = {
      title: fileName,
      pages: pageCount,
      content: contentItems,
      metadata: {
        extractionTime: new Date().toISOString(),
        wordCount: content.split(/\s+/).length,
        confidence: 0.9,  // Default confidence value
        isTranslated: isTranslatedContent,
        targetLanguage: targetLanguage,
      }
    };
    
    return result;
  } catch (error: any) {
    console.error('Error parsing extracted content:', error);
    
    // Return a simplified structure to avoid completely failing
    return {
      title: fileName,
      pages: 1,
      content: [
        {
          type: "heading",
          content: `Extracted Content from ${fileName}`,
        },
        {
          type: "text",
          content: "An error occurred while processing the content. Please try again."
        }
      ],
      metadata: {
        extractionTime: new Date().toISOString(),
        wordCount: 0,
        confidence: 0,
        sourceLanguage: `Error: ${error.message}`
      }
    };
  }
}