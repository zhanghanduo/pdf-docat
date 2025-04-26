import axios from 'axios';
import { ApiResponse, LoginResponse, ProcessPDFResponse, ProcessingLogResponse, UserListResponse } from './types';
import { EngineType, TargetLanguage } from '@shared/schema';

// Create axios instance
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Authentication API
export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    console.log('Logging in with:', { email, password });
    // Create form data to match OAuth2 requirements
    const formData = new URLSearchParams();
    formData.append('username', email); // Backend expects username as the key
    formData.append('password', password);

    try {
      // Path should match the Python FastAPI routes exactly
      const response = await api.post<LoginResponse>('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      console.log('Login response:', response.data);

      // Store token in localStorage for global access
      if (response.data && response.data.token) {
        console.log('Saving auth token to localStorage');
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  register: async (name: string, email: string, password: string, confirmPassword: string): Promise<LoginResponse> => {
    console.log('Registering with:', { name, email, password });
    try {
      const response = await api.post<LoginResponse>('/auth/register', {
        name,
        email,
        password,
        confirm_password: confirmPassword // Make sure field name matches backend expectations
      });

      console.log('Register response:', response.data);

      // Store token in localStorage for global access
      if (response.data && response.data.token) {
        console.log('Saving auth token to localStorage after registration');
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },
};

// User management API
export const userApi = {
  getUsers: async (): Promise<UserListResponse> => {
    const response = await api.get<UserListResponse>('/users');
    return response.data;
  },

  createUser: async (userData: { email: string; password: string; role: string; isActive: boolean }) => {
    const response = await api.post('/users', userData);
    return response.data;
  },

  updateUser: async (userId: number, userData: { email?: string; password?: string; role?: string; isActive?: boolean }) => {
    const response = await api.put(`/users/${userId}`, userData);
    return response.data;
  },

  deleteUser: async (userId: number) => {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
  },

  // Settings management
  getSettings: async () => {
    const response = await api.get('/settings');
    return response.data;
  },

  getSetting: async (key: string) => {
    const response = await api.get(`/settings/${key}`);
    return response.data;
  },

  updateSetting: async (settingData: { key: string; value: string; description?: string }) => {
    const response = await api.post('/settings', settingData);
    return response.data;
  },

  // User account and credits
  getAccountInfo: async () => {
    const response = await api.get('/account');
    return response.data;
  },

  getCredits: async () => {
    const response = await api.get('/credits');
    return response.data;
  },

  getCreditLogs: async (page = 1, limit = 10) => {
    const response = await api.get(`/credits/logs?page=${page}&limit=${limit}`);
    return response.data;
  },
};

// PDF processing API
export const pdfApi = {
  processPDF: async (
    file: File,
    engine: EngineType,
    fileAnnotations?: string,
    translationOptions?: {
      enabled: boolean;
      targetLanguage: TargetLanguage;
      dualLanguage: boolean;
    }
  ): Promise<ProcessPDFResponse> => {
    const formData = new FormData();
    formData.append('file', file); // Changed from 'pdf' to 'file' to match backend
    formData.append('engine', engine);

    if (fileAnnotations) {
      formData.append('file_annotations', fileAnnotations); // Changed from 'fileAnnotations' to 'file_annotations'
    }

    // Add translation options if provided
    if (translationOptions) {
      formData.append('translate_enabled', String(translationOptions.enabled)); // Changed from 'translateEnabled' to 'translate_enabled'
      formData.append('target_language', translationOptions.targetLanguage); // Changed from 'targetLanguage' to 'target_language'
      formData.append('dual_language', String(translationOptions.dualLanguage)); // Changed from 'dualLanguage' to 'dual_language'
    }

    try {
      const response = await api.post<ProcessPDFResponse>('/pdf/process', formData, { // Removed '/api/v1' prefix as it's already in the baseURL
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error: any) {
      // Check for authentication errors (including OpenRouter API key issues)
      if (error.response?.status === 401 && error.response?.data?.needsApiKey) {
        throw new Error('OpenRouter API authentication failed. Please contact the administrator to update the API key.');
      }

      // Re-throw the error with appropriate message
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('An unknown error occurred while processing the PDF');
      }
    }
  },

  getProcessingLogs: async (page = 1, limit = 10): Promise<ProcessingLogResponse> => {
    const response = await api.get<ProcessingLogResponse>(`/pdf/logs?page=${page}&limit=${limit}`);
    return response.data;
  },

  getProcessingLog: async (id: number) => {
    const response = await api.get(`/pdf/logs/${id}`);
    return response.data;
  },
};

export default api;
