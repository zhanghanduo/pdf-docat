import axios from 'axios';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Create axios instance with default configuration
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes for file uploads
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token if available
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

// API types
export interface TranslateRequest {
  file: File;
  source_lang: string;
  target_lang: string;
  dual: boolean;
}

export interface TranslateResponse {
  task_id: string;
  message: string;
  status: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  pdftranslate_available: boolean;
}

export interface LanguagesResponse {
  languages: Record<string, string>;
}

// API functions
export const pdfApi = {
  // Health check
  async healthCheck(): Promise<HealthResponse> {
    const response = await apiClient.get('/health');
    return response.data;
  },

  // Get supported languages
  async getSupportedLanguages(): Promise<LanguagesResponse> {
    const response = await apiClient.get('/api/v1/supported-languages');
    return response.data;
  },

  // Translate PDF
  async translatePdf(request: TranslateRequest): Promise<TranslateResponse> {
    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('source_lang', request.source_lang);
    formData.append('target_lang', request.target_lang);
    formData.append('dual', request.dual.toString());

    const response = await apiClient.post('/api/v1/translate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Download translated PDF
  async downloadPdf(taskId: string): Promise<Blob> {
    const response = await apiClient.get(`/api/v1/download/${taskId}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Cleanup files
  async cleanupFiles(taskId: string): Promise<void> {
    await apiClient.delete(`/api/v1/cleanup/${taskId}`);
  },
};

export default apiClient; 