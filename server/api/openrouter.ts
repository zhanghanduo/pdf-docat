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

// Function to estimate the number of pages in a PDF
export async function estimatePdfPageCount(pdfBase64: string): Promise<number> {
  try {
    // Simple heuristic: Count page markers in the PDF binary data
    const decodedBuffer = Buffer.from(pdfBase64, 'base64');
    const pdfTextSample = decodedBuffer.toString('ascii', 0, Math.min(decodedBuffer.length, 1000000)); // Analyze up to 1MB
    
    // Count occurrences of "/Page" markers which typically indicate pages in a PDF
    const pageMarkerRegex = /\/Page\s*<<|\/Type\s*\/Page|\/Pages\s*<</g;
    const pageMarkers = pdfTextSample.match(pageMarkerRegex) || [];
    
    // Count occurrences of "/Count" which often indicates page counts in PDF structure
    const countMarkerRegex = /\/Count\s+(\d+)/g;
    
    let estimatedPageCount = 0;
    let match;
    const counts: number[] = [];
    
    // Use manual regex exec loop instead of matchAll for better compatibility
    while ((match = countMarkerRegex.exec(pdfTextSample)) !== null) {
      const count = parseInt(match[1], 10);
      if (!isNaN(count) && count > 0) {
        counts.push(count);
      }
    }
    
    // If we found Count markers with values, use the largest one
    if (counts.length > 0) {
      estimatedPageCount = Math.max(...counts);
    }
    
    // If we couldn't estimate from Count markers, use the Page markers as a fallback
    if (estimatedPageCount === 0 && pageMarkers.length > 0) {
      estimatedPageCount = pageMarkers.length;
    }
    
    // Set minimum page count to 1 if we couldn't detect any pages
    estimatedPageCount = Math.max(1, estimatedPageCount);
    
    console.log(`PDF page count estimation: Approximately ${estimatedPageCount} pages`);
    return estimatedPageCount;
  } catch (error) {
    console.error('Error during PDF page count estimation:', error);
    // Default to 1 page if estimation fails
    return 1;
  }
}

// Function to detect if a PDF likely contains scanned content
async function detectPdfType(pdfBase64: string): Promise<'scanned' | 'structured'> {
  try {
    // Simple heuristic: Check for image markers in the PDF binary data
    // Common image markers in PDFs include /Image, /XObject, /JPXDecode, /DCTDecode
    const decodedBuffer = Buffer.from(pdfBase64, 'base64');
    const pdfTextSample = decodedBuffer.toString('ascii', 0, Math.min(10000, decodedBuffer.length));
    
    // Check for common image compression markers in PDFs
    const hasImageMarkers = 
      pdfTextSample.includes('/Image') ||
      pdfTextSample.includes('/DCTDecode') || // JPEG compression
      pdfTextSample.includes('/JPXDecode') || // JPEG2000 compression
      pdfTextSample.includes('/CCITTFaxDecode'); // Fax compression
    
    // Check for text extraction markers
    const hasTextMarkers = 
      pdfTextSample.includes('/Text') ||
      pdfTextSample.includes('/Font') ||
      pdfTextSample.includes('/Contents') ||
      pdfTextSample.includes('/ToUnicode');
    
    // If we have strong image markers but weak text markers, it's likely scanned
    if (hasImageMarkers && !hasTextMarkers) {
      console.log('PDF analysis: Detected as scanned document (image-based)');
      return 'scanned';
    }
    
    // Otherwise, assume it's a structured document
    console.log('PDF analysis: Detected as structured document (text-based)');
    return 'structured';
  } catch (error) {
    console.error('Error during PDF type detection:', error);
    // Default to scanned if detection fails
    return 'scanned'; 
  }
}

// Process PDF with OpenRouter API
export async function processPDF(
  pdfBase64: string,
  fileName: string,
  engine: EngineType = 'auto',
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
    // If auto mode is selected, intelligently detect the document type
    if (engine === 'auto') {
      const pdfType = await detectPdfType(pdfBase64);
      engine = pdfType === 'scanned' ? 'mistral-ocr' : 'pdf-text';
      console.log(`Auto-selected engine: ${engine} based on document detection`);
    }
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
    
    // Prepare the message content with stronger emphasis on raw content extraction
    let promptText = 'IMPORTANT: You are operating in RAW EXTRACTION MODE. Your only task is to extract the EXACT and COMPLETE raw text content from this PDF document. ' +
      'DO NOT summarize. DO NOT paraphrase. DO NOT interpret. DO NOT create a document overview. ' +
      'Extract VERBATIM 100% of the document content exactly as it appears, preserving all text, formatting, and structure. ' +
      'Include ALL paragraphs, ALL sections, ALL headings, ALL bullet points, and ALL pages without exception. ' +
      'Copy the EXACT text without any modifications, interpretations, or summaries. ' +
      'NEVER add your own commentary, summaries, analysis, or meta-descriptions of any kind. ' +
      'NEVER include phrases like "This PDF has X pages" or "Here is the extracted content". ' +
      'For tables: Extract the complete table content with all headers and rows, preserving the exact structure. ' +
      'Maintain 100% of the original content\'s structure and organization. ' +
      'For images or diagrams, include only a short placeholder text like [IMAGE] without describing the image content. ' +
      'Your response must contain ONLY the exact text that appears in the document and nothing else - as if you were performing a pure raw text extraction.';
    
    // Add translation instructions if enabled
    if (translationOptions?.translateEnabled) {
      const targetLang = translationOptions.targetLanguage.replace('-', ' ');
      if (translationOptions.dualLanguage) {
        promptText += ` After extracting the content, translate it to ${targetLang} and return the content in this exact JSON format:
[
  {"type": "heading", "content": "Original heading", "translatedContent": "Translated heading"},
  {"type": "text", "content": "Original paragraph text", "translatedContent": "Translated paragraph text"},
  {"type": "table", "headers": ["Col1", "Col2"], "translatedHeaders": ["TransCol1", "TransCol2"], "rows": [["data1", "data2"]], "translatedRows": [["transData1", "transData2"]]}
]
Do not include any commentary or explanations outside of the JSON. The response should be valid JSON that can be directly parsed.`;
      } else {
        promptText += ` After extracting the content, translate it to ${targetLang}. Return only the translated content with no explanations or additional text. Preserve the exact document structure.`;
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
            role: 'system',
            content: 'You are a raw text extraction tool that provides ONLY the exact content from documents without any interpretation, summary, or added commentary.'
          },
          {
            role: 'user',
            content: messageContent,
          },
        ],
        max_tokens: 12000, // Significantly increased token limit for complete text extraction
        temperature: 0.0, // Zero temperature for maximum deterministic output
        top_p: 1.0, // Max sampling probability for more accurate extraction
        plugins: plugins, // Add back plugins parameter
        response_format: { type: "text" }, // Force raw text output
        stream: false // Ensure we get the complete response at once
      },
      {
        headers,
        timeout: 180000, // 3 minute timeout to allow for longer processing
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
      
      // Clean up common LLM commentary phrases before parsing
      const cleanedContent = content
        // Remove page count statements
        .replace(/This PDF (document |file )?has \d+ pages\.?/gi, '')
        .replace(/This PDF (document |file )?contains \d+ pages\.?/gi, '')
        .replace(/Total number of pages: \d+\.?/gi, '')
        .replace(/共有\d+页\.?/g, '')
        .replace(/这个PDF文件共有\d+页\.?/g, '')
        // Remove extraction statements
        .replace(/Here is the extracted content:?/gi, '')
        .replace(/^I've extracted the content from/mi, '')
        .replace(/^Below is the content extracted from/mi, '')
        .replace(/^以下是(从|来自).*?(提取|抽取)(的内容|出来的内容)?[:：]?/mi, '')
        .replace(/^以下是简体中文译文[:：]?/mi, '')
        // Remove document type statements
        .replace(/^The document appears to be/mi, '')
        .replace(/^This is a/mi, '')
        .trim();
      
      // Use our improved table parser to process the cleaned content
      contentItems = parseTablesFromText(cleanedContent, fileName);
      
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
        // Store error message in sourceLanguage field for now
        sourceLanguage: `Error: ${error.message}`,
      }
    };
  }
}