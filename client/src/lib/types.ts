import { User, ProcessingLog, EngineType, ProcessingStatus, ExtractedContent, FileData } from "@shared/schema";

// Authentication types
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// API response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// Processing types
export interface ProcessPDFResponse {
  extractedContent: ExtractedContent;
  fileAnnotations: string;
  logId: number;
  cached?: boolean;
}

export interface ProcessingLogResponse {
  logs: ProcessingLog[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// User types
export type UserListResponse = User[];

// Account and credit types
export interface AccountInfoResponse {
  user: User;
  lastActive: string;
}

export interface CreditInfoResponse {
  used: number;
  limit: number;
  tier: string;
}

export interface CreditLog {
  id: number;
  userId: number;
  amount: number;
  documentId?: number;
  description: string;
  createdAt: string;
}

export interface CreditLogResponse {
  logs: CreditLog[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// Navigation types
export type Page = 'login' | 'dashboard' | 'history' | 'settings';
