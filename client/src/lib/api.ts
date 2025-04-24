import axios from 'axios';
import { ApiResponse, LoginResponse, ProcessPDFResponse, ProcessingLogResponse, UserListResponse } from './types';
import { EngineType } from '@shared/schema';

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
    const response = await api.post<LoginResponse>('/auth/login', { email, password });
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
};

// PDF processing API
export const pdfApi = {
  processPDF: async (file: File, engine: EngineType, fileAnnotations?: string): Promise<ProcessPDFResponse> => {
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('engine', engine);
    
    if (fileAnnotations) {
      formData.append('fileAnnotations', fileAnnotations);
    }
    
    const response = await api.post<ProcessPDFResponse>('/process-pdf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
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
