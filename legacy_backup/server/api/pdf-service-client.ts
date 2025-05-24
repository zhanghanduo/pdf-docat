import axios from 'axios';
import FormData from 'form-data';
import { storage } from '../storage';
import { getGeminiApiKey } from './gemini-translator';
import fs from 'fs';
import path from 'path';
import os from 'os';

// PDF service configuration
const PDF_SERVICE_URL = process.env.PDF_SERVICE_URL || 'http://localhost:5000';

/**
 * Process a structured PDF using the Python PDF service
 */
export async function processStructuredPDF(
  pdfBuffer: Buffer,
  fileName: string,
  sourceLanguage: string = 'en',
  targetLanguage: string = 'zh',
  model: string = 'gemini-2.5-flash-preview-05-20'
): Promise<any> {
  try {
    console.log(`Processing structured PDF: ${fileName} using PDF service`);

    // Get the Gemini API key from settings
    const apiKey = await getGeminiApiKey();

    // Create form data
    const formData = new FormData();
    formData.append('pdf', pdfBuffer, { filename: fileName });
    formData.append('source_lang', sourceLanguage);
    formData.append('target_lang', targetLanguage);
    formData.append('service', 'gemini');
    formData.append('model', model);

    if (apiKey) {
      formData.append('api_key', apiKey);
    }

    // Make request to PDF service
    const response = await axios.post(`${PDF_SERVICE_URL}/pdf/process`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 300000, // 5 minute timeout for large PDFs
    });

    if (response.data.status !== 'success') {
      throw new Error(`PDF service error: ${response.data.error || 'Unknown error'}`);
    }

    console.log('PDF processed successfully by PDF service');

    // Download the mono version of the processed PDF
    const monoFileName = response.data.files.mono;
    const monoFileResponse = await axios.get(`${PDF_SERVICE_URL}/pdf/download/${monoFileName}`, {
      responseType: 'arraybuffer',
      timeout: 60000, // 1 minute timeout
    });

    // Save the file to a temporary location
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, monoFileName);
    fs.writeFileSync(tempFilePath, Buffer.from(monoFileResponse.data));

    // Read the file content
    const pdfContent = fs.readFileSync(tempFilePath, 'utf-8');

    // Clean up the temporary file
    fs.unlinkSync(tempFilePath);

    // Return the processed content and metadata
    return {
      content: pdfContent,
      metadata: response.data.metadata
    };
  } catch (error: any) {
    console.error('Error processing structured PDF:', error);

    // Provide more detailed error information
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }

    throw new Error(`Failed to process structured PDF: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Check if the PDF service is available
 */
export async function checkPDFServiceHealth(): Promise<boolean> {
  try {
    const response = await axios.get(`${PDF_SERVICE_URL}/health/check`, {
      timeout: 5000, // 5 second timeout
    });

    return response.data.status === 'ok';
  } catch (error) {
    console.error('PDF service health check failed:', error);
    return false;
  }
}

/**
 * Get available services from the PDF service
 */
export async function getPDFServiceServices(): Promise<string[]> {
  try {
    const response = await axios.get(`${PDF_SERVICE_URL}/config/services`, {
      timeout: 5000, // 5 second timeout
    });

    return response.data.available_services;
  } catch (error) {
    console.error('Failed to get PDF service services:', error);
    throw new Error('Failed to get PDF service services');
  }
}

/**
 * Get available languages from the PDF service
 */
export async function getPDFServiceLanguages(): Promise<any> {
  try {
    const response = await axios.get(`${PDF_SERVICE_URL}/config/languages`, {
      timeout: 5000, // 5 second timeout
    });

    return response.data;
  } catch (error) {
    console.error('Failed to get PDF service languages:', error);
    throw new Error('Failed to get PDF service languages');
  }
}

/**
 * Set API key in the PDF service
 */
export async function setPDFServiceApiKey(service: string, apiKey: string): Promise<void> {
  try {
    await axios.post(`${PDF_SERVICE_URL}/config/api-key`, {
      service,
      api_key: apiKey,
    }, {
      timeout: 5000, // 5 second timeout
    });
  } catch (error) {
    console.error(`Failed to set ${service} API key in PDF service:`, error);
    throw new Error(`Failed to set ${service} API key in PDF service`);
  }
}

/**
 * Get available models from the PDF service
 */
export async function getPDFServiceModels(): Promise<any> {
  try {
    const response = await axios.get(`${PDF_SERVICE_URL}/config/models`, {
      timeout: 5000, // 5 second timeout
    });

    return response.data;
  } catch (error) {
    console.error('Failed to get PDF service models:', error);
    throw new Error('Failed to get PDF service models');
  }
}

/**
 * Set model in the PDF service
 */
export async function setPDFServiceModel(service: string, model: string): Promise<void> {
  try {
    await axios.post(`${PDF_SERVICE_URL}/config/model`, {
      service,
      model,
    }, {
      timeout: 5000, // 5 second timeout
    });
  } catch (error) {
    console.error(`Failed to set ${service} model in PDF service:`, error);
    throw new Error(`Failed to set ${service} model in PDF service`);
  }
}
