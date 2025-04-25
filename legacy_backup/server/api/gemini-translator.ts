import axios from 'axios';
import { storage } from '../storage';

// Default to environment variable, but will be overridden by database settings if available
let API_KEY = process.env.GEMINI_API_KEY || '';
const BASE_API_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';

/**
 * Get Gemini API key from settings
 */
export async function getGeminiApiKey(): Promise<string> {
  try {
    const setting = await storage.getSetting('GEMINI_API_KEY');
    if (setting && setting.value) {
      return setting.value;
    }
    return API_KEY;
  } catch (error) {
    console.error('Error getting Gemini API key from settings:', error);
    return API_KEY;
  }
}

// Initialize API key from settings
(async () => {
  try {
    API_KEY = await getGeminiApiKey();
    console.log('Gemini API key initialized from settings');
  } catch (error) {
    console.error('Error initializing Gemini API key:', error);
  }
})();

/**
 * Translate text using Gemini API
 */
export async function translateWithGemini(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string> {
  try {
    // Get the latest API key from settings
    API_KEY = await getGeminiApiKey();
    
    // Check if API key is available
    if (!API_KEY) {
      throw new Error('Gemini API key is not configured.');
    }
    
    console.log(`Translating text from ${sourceLanguage} to ${targetLanguage} using Gemini`);
    
    // Prepare the prompt for translation
    const prompt = `Translate the following text from ${sourceLanguage} to ${targetLanguage}. 
Preserve all formatting, line breaks, and special characters. 
Do not add any explanations or comments.
Only return the translated text.

Text to translate:
${text}`;
    
    // Make API request to Gemini
    const response = await axios.post(
      `${BASE_API_URL}chat/completions`,
      {
        model: 'gemini-1.5-flash',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.0,  // Zero temperature for deterministic output
        max_tokens: 4000,  // Adjust based on expected translation length
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        timeout: 30000 // 30 second timeout
      }
    );
    
    // Extract the translated text from the response
    if (!response.data || !response.data.choices || !response.data.choices.length) {
      throw new Error('Invalid response format from Gemini API');
    }
    
    const translatedText = response.data.choices[0].message.content;
    
    return translatedText;
  } catch (error: any) {
    console.error('Error translating with Gemini:', error);
    
    // Provide more detailed error information
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    throw new Error(`Translation failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Translate document content using Gemini
 */
export async function translateDocumentContent(
  content: any[],
  sourceLanguage: string,
  targetLanguage: string
): Promise<any[]> {
  try {
    console.log(`Translating document from ${sourceLanguage} to ${targetLanguage}`);
    
    // Create a deep copy of the content to avoid modifying the original
    const translatedContent = JSON.parse(JSON.stringify(content));
    
    // Process each content item
    for (let i = 0; i < translatedContent.length; i++) {
      const item = translatedContent[i];
      
      // Translate based on content type
      if (item.type === 'text' || item.type === 'heading') {
        if (item.content) {
          item.translatedContent = await translateWithGemini(
            item.content,
            sourceLanguage,
            targetLanguage
          );
        }
      } else if (item.type === 'table') {
        // Translate table headers
        if (item.headers && item.headers.length > 0) {
          const headersText = item.headers.join('\n');
          const translatedHeaders = await translateWithGemini(
            headersText,
            sourceLanguage,
            targetLanguage
          );
          item.translatedHeaders = translatedHeaders.split('\n');
        }
        
        // Translate table rows
        if (item.rows && item.rows.length > 0) {
          item.translatedRows = [];
          
          for (const row of item.rows) {
            const rowText = row.join('\n');
            const translatedRow = await translateWithGemini(
              rowText,
              sourceLanguage,
              targetLanguage
            );
            item.translatedRows.push(translatedRow.split('\n'));
          }
        }
      }
      
      // Log progress
      console.log(`Translated item ${i+1}/${translatedContent.length}`);
    }
    
    return translatedContent;
  } catch (error: any) {
    console.error('Error translating document content:', error);
    throw new Error(`Document translation failed: ${error.message || 'Unknown error'}`);
  }
}
