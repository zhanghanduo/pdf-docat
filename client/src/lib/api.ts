import axios from 'axios';
import { ApiResponse, LoginResponse, ProcessPDFResponse, ProcessingLogResponse, UserListResponse } from './types';
import { EngineType, TargetLanguage } from '@shared/schema';

// Create axios instance
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
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
    const response = await api.post<LoginResponse>('/auth/login', { email, password });
    return response.data;
  },
  
  register: async (name: string, email: string, password: string, confirmPassword: string): Promise<LoginResponse> => {
    console.log('Registering with:', { name, email, password });
    const response = await api.post<LoginResponse>('/auth/register', { 
      name, 
      email, 
      password,
      confirmPassword 
    });
    return response.data;
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
    formData.append('pdf', file);
    formData.append('engine', engine);
    
    if (fileAnnotations) {
      formData.append('fileAnnotations', fileAnnotations);
    }
    
    // Add translation options if provided
    if (translationOptions) {
      formData.append('translateEnabled', String(translationOptions.enabled));
      formData.append('targetLanguage', translationOptions.targetLanguage);
      formData.append('dualLanguage', String(translationOptions.dualLanguage));
    }
    
    try {
      const response = await api.post<ProcessPDFResponse>('/process-pdf', formData, {
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
    const response = await api.get<ProcessingLogResponse>(`/processing-logs?page=${page}&limit=${limit}`);
    return response.data;
  },
  
  getProcessingLog: async (id: number) => {
    const response = await api.get(`/processing-logs/${id}`);
    return response.data;
  },
};

export default api;
