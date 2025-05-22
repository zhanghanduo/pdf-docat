import axios from 'axios';
import { EngineType, ExtractedContent, TargetLanguage } from '@shared/schema';
import { parseTablesFromText } from './table-parser';
import { storage } from '../storage';
import { getOpenRouterApiKey } from './openrouter';
import { processStructuredPDF, checkPDFServiceHealth } from './pdf-service-client';

// Default to environment variable, but will be overridden by database settings if available
let API_KEY = process.env.OPENROUTER_API_KEY || '';
const BASE_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Initialize API key from settings
(async () => {
  try {
    API_KEY = await getOpenRouterApiKey();
    console.log('OpenRouter API key initialized from settings in iterative processor');
  } catch (error) {
    console.error('Error initializing OpenRouter API key in iterative processor:', error);
  }
})();

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

    while ((match = countMarkerRegex.exec(pdfTextSample)) !== null) {
      const count = parseInt(match[1], 10);
      if (count > estimatedPageCount) {
        estimatedPageCount = count;
      }
    }

    // If we found a Count marker, use that as it's more reliable
    if (estimatedPageCount > 0) {
      return estimatedPageCount;
    }

    // Otherwise, use the page marker count as a fallback
    estimatedPageCount = Math.max(1, Math.ceil(pageMarkers.length / 2)); // Divide by 2 as each page often has multiple markers

    return estimatedPageCount;
  } catch (error) {
    console.error('Error estimating PDF page count:', error);
    return 5; // Default fallback to a reasonable assumption
  }
}

// Detect if a PDF is scanned or text-based (structured)
export async function detectPdfType(pdfBase64: string): Promise<'scanned' | 'structured'> {
  try {
    // Decode a portion of the PDF to analyze its structure
    const decodedBuffer = Buffer.from(pdfBase64, 'base64');
    const pdfTextSample = decodedBuffer.toString('ascii', 0, Math.min(decodedBuffer.length, 500000)); // First 500KB should be enough

    // Look for text extraction markers that indicate a text-based PDF
    const textMarkers = [
      '/Contents', '/Text', '/Font', '/T1_', '/TrueType', '/Type1',
      '/ToUnicode', '/Encoding', '/TextMatrix', '/TextRenderingMode'
    ];

    let textMarkerCount = 0;
    for (const marker of textMarkers) {
      const regex = new RegExp(marker, 'g');
      const matches = pdfTextSample.match(regex);
      if (matches) {
        textMarkerCount += matches.length;
      }
    }

    // Look for image markers that indicate a scanned document
    const imageMarkers = [
      '/XObject', '/Image', '/DCTDecode', '/JBIG2Decode', '/JPXDecode',
      '/CCITTFaxDecode', '/FlateDecode /SubType /Image'
    ];

    let imageMarkerCount = 0;
    for (const marker of imageMarkers) {
      const regex = new RegExp(marker, 'g');
      const matches = pdfTextSample.match(regex);
      if (matches) {
        imageMarkerCount += matches.length;
      }
    }

    // Calculate ratio to determine document type
    // More sophisticated detection could consider density and file size
    const textDensity = textMarkerCount / pdfTextSample.length;
    const imageDensity = imageMarkerCount / pdfTextSample.length;

    console.log(`PDF analysis - Text markers: ${textMarkerCount}, Image markers: ${imageMarkerCount}`);

    // If there are considerably more image markers or very few text markers, consider it a scanned document
    if (imageMarkerCount > textMarkerCount * 2 || textMarkerCount < 100) {
      return 'scanned';
    } else {
      return 'structured';
    }
  } catch (error) {
    console.error('Error detecting PDF type:', error);
    return 'structured'; // Default to structured which is more common
  }
}

/**
 * Main function to process PDF documents with iterative approach for large documents
 */
export async function processPDF(
  pdfBase64: string,
  fileName: string,
  engine: EngineType = 'auto',
  translationOptions?: {
    translateEnabled: boolean;
    targetLanguage: TargetLanguage;
    dualLanguage: boolean;
  },
  fileAnnotations?: string
): Promise<{
  extractedContent: ExtractedContent;
  fileAnnotations: string;
}> {
  try {
    console.log(`Starting PDF processing for file: ${fileName} with engine: ${engine}`);

    // Get the latest API key from settings
    API_KEY = await getOpenRouterApiKey();

    // Validate the API key first
    if (!API_KEY) {
      throw new Error('OpenRouter API key is not configured.');
    }

    // Basic file size check to avoid processing extremely large files
    const estimatedSize = pdfBase64.length * 0.75; // Base64 size to binary size estimate
    console.log(`Estimated PDF size: ${Math.round(estimatedSize / (1024 * 1024))} MB`);

    if (estimatedSize > 25 * 1024 * 1024) {
      throw new Error('PDF file is too large. Maximum allowed size is 25MB.');
    }

    // Estimate page count to determine processing strategy
    const estimatedPageCount = await estimatePdfPageCount(pdfBase64);
    console.log(`PDF page count estimation: Approximately ${estimatedPageCount} pages`);

    // If PDF is detected as a scanned document, use OCR-specific processing
    const documentType = await detectPdfType(pdfBase64);
    console.log(`PDF analysis: Detected as ${documentType} document`);

    // Auto-select the appropriate engine if "auto" was specified
    if (engine === 'auto') {
      if (documentType === 'scanned') {
        engine = 'mistral-ocr';
        console.log(`Auto-selected engine: ${engine} based on document detection`);
      } else {
        engine = 'pdf-text';
        console.log(`Auto-selected engine: ${engine} based on document detection`);
      }
    }

    // Check if we should use the Python PDF service for structured PDFs
    let usePdfService = false;
    if (documentType === 'structured' && engine === 'pdf-text') {
      try {
        // Check if the PDF service is available
        usePdfService = await checkPDFServiceHealth();
        if (usePdfService) {
          console.log('PDF service is available, using BabelDOC for structured PDF processing');
        } else {
          console.log('PDF service is not available, falling back to OpenRouter processing');
        }
      } catch (error) {
        console.warn('Error checking PDF service health, falling back to OpenRouter processing:', error);
      }
    }

    // If it's a structured PDF and the PDF service is available, use it
    if (usePdfService) {
      try {
        console.log('Processing structured PDF with BabelDOC via PDF service');

        // Convert base64 to buffer
        const pdfBuffer = Buffer.from(pdfBase64, 'base64');

        // Get source and target languages
        const sourceLanguage = 'en'; // Default source language
        const targetLanguage = translationOptions?.targetLanguage || 'zh';

        // Process the PDF using the Python service
        const output = await processStructuredPDF(
          pdfBuffer,
          fileName,
          sourceLanguage,
          targetLanguage
        );

        // Parse the output into our expected format
        console.log('Parsing output from PDF service');
        const extractedContent = parseExtractedContent(output, fileName);

        // Add translation metadata if translation was requested
        if (translationOptions?.translateEnabled) {
          extractedContent.metadata.isTranslated = true;
          extractedContent.metadata.sourceLanguage = sourceLanguage;
          extractedContent.metadata.targetLanguage = targetLanguage;
        }

        return {
          extractedContent,
          fileAnnotations: '' // BabelDOC doesn't provide file annotations in the same format
        };
      } catch (error) {
        console.error('Error processing with PDF service, falling back to OpenRouter:', error);
        // Continue with OpenRouter processing as fallback
      }
    }

    // For documents with more than 3 pages, use chunked processing
    // (this threshold is lowered for testing; in production it would be higher)
    if (estimatedPageCount > 3) {
      console.log(`Document has ${estimatedPageCount} pages, using iterative processing`);
      return await processLargeDocument(
        pdfBase64,
        fileName,
        engine,
        estimatedPageCount,
        translationOptions,
        fileAnnotations
      );
    } else {
      console.log(`Document has ${estimatedPageCount} pages, using standard processing`);
      return await processSingleDocument(
        pdfBase64,
        fileName,
        engine,
        translationOptions,
        fileAnnotations
      );
    }
  } catch (error: any) {
    console.error('Error in processPDF:', error.message);
    throw error;
  }
}

/**
 * Process a small document in a single API request
 */
async function processSingleDocument(
  pdfBase64: string,
  fileName: string,
  engine: EngineType,
  translationOptions?: {
    translateEnabled: boolean;
    targetLanguage: TargetLanguage;
    dualLanguage: boolean;
  },
  fileAnnotations?: string
): Promise<{
  extractedContent: ExtractedContent;
  fileAnnotations: string;
}> {
  try {
    // Prepare the prompt for extraction
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

    // Include file annotations if available
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

    // Configure plugins for PDF processing
    const plugins = [
      {
        id: 'file-parser',
        pdf: {
          engine: engine,
        },
      },
    ];

    // Set up headers for OpenRouter API
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'HTTP-Referer': `https://${HOSTNAME}`,
      'X-Title': 'DocCat PDF Extractor'
    };

    // Get the latest API key and set up authentication
    API_KEY = await getOpenRouterApiKey();
    if (API_KEY) {
      const cleanKey = API_KEY.trim().replace(/\s+/g, '');
      headers['Authorization'] = `Bearer ${cleanKey}`;
      console.log('Using standard Bearer token authentication in header');
      console.log(`API key starts with: ${cleanKey.substring(0, 5)}...`);
    } else {
      console.error('No API key provided for OpenRouter');
    }

    console.log('Sending request to OpenRouter API');

    // Determine the primary and fallback models
    // For OCR capabilities, prefer mistral-ocr and fall back to gemini-2.0-flash-lite
    const primaryModel = (engine === 'mistral-ocr')
      ? 'mistralai/mistral-medium'
      : 'anthropic/claude-3-sonnet:poe';

    const fallbackModel = 'google/gemini-2.0-flash-lite';

    // Log request details for debugging
    console.log('API request details:');
    console.log(`- Endpoint: ${BASE_API_URL}`);
    console.log(`- Primary Model: ${primaryModel}`);
    console.log(`- Fallback Model: ${fallbackModel}`);
    console.log(`- Timeout: 180 seconds`);

    // Make API request
    const response = await axios.post(
      BASE_API_URL,
      {
        model: primaryModel,
        fallbacks: [fallbackModel],
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
        max_tokens: 12000, // Increased token limit for full text extraction
        temperature: 0.0,  // Zero temperature for deterministic output
        top_p: 1.0,        // Maximum sampling probability
        plugins: plugins,  // PDF processing plugins
        response_format: { type: "text" }, // Force raw text output
        stream: false      // Get complete response at once
      },
      {
        headers,
        timeout: 180000, // 3 minute timeout
      }
    );

    console.log('Received response from OpenRouter API');

    // Validate response format
    if (!response.data || !response.data.choices || !response.data.choices.length) {
      throw new Error('Invalid response format from OpenRouter API');
    }

    // Extract content from response
    const assistantMessage = response.data.choices[0].message;

    if (!assistantMessage || !assistantMessage.content) {
      throw new Error('No content in the assistant response');
    }

    // Extract file annotations if present
    let annotations = '';
    if (assistantMessage.file_annotations) {
      console.log('File annotations received from API');
      annotations = JSON.stringify(assistantMessage.file_annotations);
    }

    // Parse extracted content
    console.log('Parsing extracted content');
    const extractedContent = parseExtractedContent(assistantMessage.content, fileName);

    console.log('PDF processing completed successfully');
    return {
      extractedContent,
      fileAnnotations: annotations,
    };
  } catch (error: any) {
    // Handle API errors
    console.error('Error processing PDF with OpenRouter:');
    handleApiError(error);
    throw error;
  }
}

/**
 * Process a large document by splitting it into page ranges
 */
async function processLargeDocument(
  pdfBase64: string,
  fileName: string,
  engine: EngineType,
  pageCount: number,
  translationOptions?: {
    translateEnabled: boolean;
    targetLanguage: TargetLanguage;
    dualLanguage: boolean;
  },
  fileAnnotations?: string
): Promise<{
  extractedContent: ExtractedContent;
  fileAnnotations: string;
}> {
  console.log(`Processing large document with ${pageCount} pages using iterative approach`);

  try {
    // Define page ranges to process in chunks (3 pages per chunk)
    const PAGES_PER_CHUNK = 3;
    const chunks: Array<{start: number, end: number}> = [];

    for (let i = 1; i <= pageCount; i += PAGES_PER_CHUNK) {
      chunks.push({
        start: i,
        end: Math.min(i + PAGES_PER_CHUNK - 1, pageCount)
      });
    }

    console.log(`Split document into ${chunks.length} chunks for processing`);

    // Process each chunk and collect results
    const results: Array<{
      content: any[];
      pageRange: {start: number, end: number};
    }> = [];

    // Track file annotations to reuse in subsequent requests
    let currentAnnotations = fileAnnotations;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Processing chunk ${i+1}/${chunks.length}: pages ${chunk.start}-${chunk.end}`);

      try {
        // Process this chunk
        const result = await processDocumentChunk(
          pdfBase64,
          fileName,
          engine,
          chunk,
          translationOptions,
          currentAnnotations
        );

        // Save annotations from first successful request
        if (!currentAnnotations && result.annotations) {
          currentAnnotations = result.annotations;
          console.log('Saved file annotations from first chunk');
        }

        // Store the results
        results.push({
          content: result.content,
          pageRange: chunk
        });

        console.log(`Successfully processed chunk ${i+1}: pages ${chunk.start}-${chunk.end}`);
      } catch (error: any) {
        console.error(`Error processing chunk ${i+1} (pages ${chunk.start}-${chunk.end}):`);
        console.error(error);

        // Add placeholder for failed chunk
        results.push({
          content: [{
            type: "text",
            content: `[Error processing pages ${chunk.start}-${chunk.end}: ${error?.message || 'Unknown error'}]`
          }],
          pageRange: chunk
        });
      }
    }

    // Combine all chunks into a unified document
    console.log('Merging all chunks into final document');
    const mergedContent = mergeDocumentChunks(results, fileName, pageCount);

    return {
      extractedContent: mergedContent,
      fileAnnotations: currentAnnotations || ''
    };
  } catch (error: any) {
    console.error('Error in large document processing:', error);
    throw new Error(`Failed to process large document: ${error.message}`);
  }
}

/**
 * Process a specific page range (chunk) of a document
 */
async function processDocumentChunk(
  pdfBase64: string,
  fileName: string,
  engine: EngineType,
  pageRange: {start: number, end: number},
  translationOptions?: {
    translateEnabled: boolean;
    targetLanguage: TargetLanguage;
    dualLanguage: boolean;
  },
  fileAnnotations?: string
): Promise<{
  content: any[];
  annotations: string;
}> {
  try {
    console.log(`Processing document chunk: pages ${pageRange.start}-${pageRange.end}`);

    // Create a prompt specifically for this page range
    let promptText = `IMPORTANT: You are operating in RAW EXTRACTION MODE. Extract ONLY the content from pages ${pageRange.start} to ${pageRange.end} of this PDF document. ` +
      'DO NOT summarize. DO NOT paraphrase. DO NOT interpret. ' +
      `Focus EXCLUSIVELY on extracting the EXACT VERBATIM content from pages ${pageRange.start}-${pageRange.end}. ` +
      'Copy the EXACT text without modifications. ' +
      'Include ALL paragraphs, ALL headings, ALL bullet points on these pages. ' +
      'For tables: Extract the complete table structure with all headers and rows. ' +
      'NEVER add your own text or descriptions. ' +
      'Your response should contain ONLY text from these specific pages.';

    // Add translation instructions if enabled
    if (translationOptions?.translateEnabled) {
      const targetLang = translationOptions.targetLanguage.replace('-', ' ');
      if (translationOptions.dualLanguage) {
        promptText += ` After extracting the content, translate it to ${targetLang} and return in JSON format with both original and translated text.`;
      } else {
        promptText += ` After extracting the content, translate it to ${targetLang}. Return only the translated content.`;
      }
    }

    console.log(`Building API request for pages ${pageRange.start}-${pageRange.end}`);

    // Prepare message content
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

    // Include file annotations if available
    if (fileAnnotations) {
      try {
        messageContent.push({
          type: 'file_annotations',
          file_annotations: JSON.parse(fileAnnotations),
        });
      } catch (err) {
        console.warn('Failed to parse file annotations for chunk, continuing without them');
      }
    }

    // Configure plugins with specific page range
    const plugins = [
      {
        id: 'file-parser',
        pdf: {
          engine: engine,
          firstPage: pageRange.start,
          lastPage: pageRange.end
        },
      },
    ];

    // Set up headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'HTTP-Referer': `https://${HOSTNAME}`,
      'X-Title': 'DocCat PDF Extractor'
    };

    // Set up authentication
    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY.trim()}`;
    } else {
      throw new Error('No API key provided');
    }

    console.log(`Sending request for pages ${pageRange.start}-${pageRange.end}`);

    // Determine the primary and fallback models
    // For OCR capabilities, prefer mistral-ocr and fall back to gemini-2.0-flash-lite
    const primaryModel = (engine === 'mistral-ocr')
      ? 'mistralai/mistral-medium'
      : 'anthropic/claude-3-sonnet:poe';

    const fallbackModel = 'google/gemini-2.0-flash-lite';

    console.log(`Using primary model: ${primaryModel} with fallback: ${fallbackModel}`);

    // Make API request for this chunk
    const response = await axios.post(
      BASE_API_URL,
      {
        model: primaryModel,
        fallbacks: [fallbackModel],
        messages: [
          {
            role: 'system',
            content: `You are a precise PDF content extractor. Extract ONLY the content from pages ${pageRange.start}-${pageRange.end}. Do not summarize or add commentary.`
          },
          {
            role: 'user',
            content: messageContent,
          },
        ],
        max_tokens: 12000,
        temperature: 0.0,
        plugins: plugins,
        response_format: { type: "text" },
        stream: false
      },
      {
        headers,
        timeout: 180000,
      }
    );

    // Validate response
    if (!response.data?.choices?.[0]?.message?.content) {
      throw new Error(`No content returned for pages ${pageRange.start}-${pageRange.end}`);
    }

    // Extract content
    const rawContent = response.data.choices[0].message.content;

    // Extract annotations if any
    let annotations = '';
    if (response.data.choices[0].message.file_annotations) {
      annotations = JSON.stringify(response.data.choices[0].message.file_annotations);
    }

    // Process content with our table parser
    const parsedContent = parseTablesFromText(rawContent, `${fileName} (Pages ${pageRange.start}-${pageRange.end})`);

    console.log(`Successfully extracted content from pages ${pageRange.start}-${pageRange.end}`);
    return {
      content: parsedContent,
      annotations
    };
  } catch (error: any) {
    console.error(`Error processing pages ${pageRange.start}-${pageRange.end}:`, error);
    handleApiError(error);
    throw error;
  }
}

/**
 * Merge multiple document chunks into a single coherent document
 */
function mergeDocumentChunks(
  results: Array<{
    content: any[];
    pageRange: {start: number, end: number};
  }>,
  fileName: string,
  totalPages: number
): ExtractedContent {
  // Sort chunks by page range
  results.sort((a, b) => a.pageRange.start - b.pageRange.start);

  // Initialize merged content
  const mergedItems: any[] = [];

  // Add document title
  mergedItems.push({
    type: "heading",
    content: `Extracted Content from ${fileName}`
  });

  // Add content from each chunk
  for (const result of results) {
    // Add page range marker with proper separator
    if (mergedItems.length > 1) {
      // Add page separator before starting a new page (except for first page)
      mergedItems.push({
        type: "text",
        content: "---"
      });
    }

    mergedItems.push({
      type: "heading",
      content: `Pages ${result.pageRange.start}-${result.pageRange.end}`
    });

    // Add all content items from this chunk
    for (const item of result.content) {
      mergedItems.push(item);
    }
  }

  // Calculate total word count
  let totalWordCount = 0;
  for (const item of mergedItems) {
    if (item.content) {
      const words = item.content.split(/\s+/).filter(Boolean);
      totalWordCount += words.length;
    }
  }

  // Create final document structure
  const extractedContent: ExtractedContent = {
    title: `${fileName}`,
    pages: totalPages,
    content: mergedItems,
    metadata: {
      extractionTime: new Date().toISOString(),
      wordCount: totalWordCount,
      confidence: 0.95,
    }
  };

  console.log(`Successfully merged ${results.length} chunks into final document with ${mergedItems.length} content items`);
  return extractedContent;
}

/**
 * Parse extracted content into our expected format
 */
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
          // Add 1 because separators are typically between pages
          pageCount = pageSeparatorMatches.length + 1;
          console.log(`Estimated page count from separators: ${pageCount} pages`);
        }
      }

      // Method 4: Look at content structure - we likely have at least as many pages as we have content sections
      if (pageCount === 1 && contentItems.length > 1) {
        // Be conservative - not every content section is a page
        pageCount = Math.max(1, Math.ceil(contentItems.length / 3));
        console.log(`Estimated page count from content structure: ${pageCount} pages`);
      }
    } catch (pageCountError) {
      console.warn('Error estimating page count:', pageCountError);
    }

    // Count words in the content
    let wordCount = 0;
    for (const item of contentItems) {
      if (item.content) {
        const words = item.content.split(/\s+/).filter(Boolean);
        wordCount += words.length;
      }
    }

    // Create the final structured data object
    const result: ExtractedContent = {
      title: fileName,
      pages: pageCount,
      content: contentItems,
      metadata: {
        extractionTime: new Date().toISOString(),
        wordCount: wordCount,
        confidence: 0.95, // Arbitrary confidence score
      },
    };

    // Add translation metadata if relevant
    if (isTranslatedContent) {
      result.metadata.isTranslated = true;
      if (targetLanguage) {
        result.metadata.targetLanguage = targetLanguage;
      }
    }

    console.log(`Extraction summary: ${contentItems.length} content items, ${wordCount} words, ${pageCount} pages`);
    return result;
  } catch (error) {
    console.error('Error parsing extracted content:', error);

    // Return a minimal valid structure with error information
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
          content: "Error parsing content. The extraction was successful, but there was an error organizing the content.",
        },
        {
          type: "text",
          content: content.substring(0, 1000) + (content.length > 1000 ? "..." : ""),
        },
      ],
      metadata: {
        extractionTime: new Date().toISOString(),
        wordCount: content.split(/\s+/).filter(Boolean).length,
        confidence: 0.5,
      },
    };
  }
}

/**
 * Handle API errors with detailed logging
 */
function handleApiError(error: any): void {
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
}