import axios from 'axios';
import { EngineType, ExtractedContent } from '@shared/schema';

const API_KEY = process.env.OPENROUTER_API_KEY || '';
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Get the hostname for http-referer header
const HOSTNAME = process.env.REPL_SLUG ? `${process.env.REPL_SLUG}.repl.co` : 'localhost:3000';

// Function to validate API key format
function validateApiKey(key: string): boolean {
  // Check if the API key is properly formatted
  // OpenRouter API keys should be non-empty
  return key.trim().length > 10;
}

// Log API key status (without revealing the key)
if (!API_KEY) {
  console.warn('OpenRouter API key is not set. PDF processing will not work.');
} else if (!validateApiKey(API_KEY)) {
  console.warn('OpenRouter API key may be malformed. Please check the format.');
} else {
  console.log('OpenRouter API key is configured.');
  // For debugging only, log the first 5 characters
  console.log(`Key starts with: ${API_KEY.substring(0, 5)}...`);
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
        promptText += ` After extracting the content, please translate it to ${targetLang} and provide both the original text and the translation side by side or in separate sections.`;
      } else {
        promptText += ` After extracting the content, please translate it to ${targetLang}.`;
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
    
    // Try alternative formats for authentication header
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'HTTP-Referer': `https://${HOSTNAME}`,
      'X-Title': 'DocCat PDF Extractor',
      'Authorization': `Bearer ${API_KEY.trim()}` // Standard Bearer token format
    };
    
    console.log('Sending request with authorization header');
    
    // Make the API request to OpenRouter
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
        throw new Error('Authentication error with OpenRouter API. Please check your API key.');
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
    
    // Try to identify table structures in the content
    const tableRegex = /\|(.+)\|/g;
    const hasTable = tableRegex.test(content);
    
    let contentItems: Array<{
      type: "text" | "heading" | "code" | "table";
      content?: string;
      language?: string;
      headers?: string[];
      rows?: string[][];
    }> = [];
    
    // Add initial welcome message
    contentItems.push({
      type: "heading",
      content: `Extracted Content from ${fileName}`,
    });
    
    // Process content for tables and text sections
    if (hasTable) {
      console.log('Tables detected in content, processing structured data');
      // This is a simple approach - in production, you'd want more sophisticated table detection
      // Split content by sections and identify tables vs. text
      
      // For now, we'll just add the content with identified table areas
      contentItems.push({
        type: "text",
        content: 'The following content has been extracted and includes tables:',
      });
      
      contentItems.push({
        type: "text",
        content: content,
      });
    } else {
      // Just plain text without tables
      contentItems.push({
        type: "text",
        content: content,
      });
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
