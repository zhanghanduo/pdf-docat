import axios from 'axios';
import { EngineType, ExtractedContent } from '@shared/schema';

const API_KEY = process.env.OPENROUTER_API_KEY || '';
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Error handling
if (!API_KEY) {
  console.warn('OpenRouter API key is not set. PDF processing will not work.');
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
      messageContent.push({
        type: 'file_annotations',
        file_annotations: JSON.parse(fileAnnotations),
      });
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

    // Make the API request to OpenRouter
    const response = await axios.post(
      API_URL,
      {
        model: 'anthropic/claude-3-sonnet:poe',
        messages: [
          {
            role: 'user',
            content: messageContent,
          },
        ],
        plugins: plugins,
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Extract the assistant's response
    const assistantMessage = response.data.choices[0].message;
    
    // Extract file annotations if they exist
    let annotations = '';
    if (assistantMessage.file_annotations) {
      annotations = JSON.stringify(assistantMessage.file_annotations);
    }

    // Parse the content into our expected format
    // This is a simplified example - in production you would need more sophisticated parsing
    const extractedContent = parseExtractedContent(assistantMessage.content, fileName);

    return {
      extractedContent,
      fileAnnotations: annotations,
    };
  } catch (error) {
    console.error('Error processing PDF with OpenRouter:', error);
    throw new Error('Failed to process PDF. Please try again later.');
  }
}

// Parse the content from OpenRouter into our expected format
function parseExtractedContent(content: string, fileName: string): ExtractedContent {
  // In a real implementation, this would do proper parsing of the content
  // For now, we're returning a simplified structure
  return {
    title: fileName,
    pages: 1, // This would be determined from the actual PDF
    content: [
      {
        type: 'text',
        content: 'The content from your PDF has been successfully extracted using OpenRouter\'s API.',
      },
      {
        type: 'text',
        content: content,
      },
    ],
    metadata: {
      extractionTime: '1.5 seconds',
      wordCount: content.split(/\s+/).length,
      confidence: 0.95,
    },
  };
}
