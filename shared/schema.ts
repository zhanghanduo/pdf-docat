import { z } from 'zod';

// Constants
export const USER_TIERS = {
  FREE: 'free',
  BASIC: 'basic',
  PREMIUM: 'premium',
  ENTERPRISE: 'enterprise',
  ADMIN: 'admin',
} as const;

export const TIER_CREDITS = {
  [USER_TIERS.FREE]: 10,
  [USER_TIERS.BASIC]: 100,
  [USER_TIERS.PREMIUM]: 500,
  [USER_TIERS.ENTERPRISE]: 2000,
  [USER_TIERS.ADMIN]: 10000,
};

export const CREDIT_COSTS = {
  PAGE_EXTRACTION: 1,
  OCR_PROCESSING: 2,
  TRANSLATION: 3,
};

// Engine types
export const engineTypes = ["auto", "mistral-ocr", "pdf-text", "native"] as const;
export type EngineType = typeof engineTypes[number];

// Processing status types
export const processingStatus = ["idle", "uploading", "processing", "completed", "error"] as const;
export type ProcessingStatus = typeof processingStatus[number];

// Target languages
export const targetLanguages = ["english", "simplified-chinese", "traditional-chinese", "german", "japanese", "spanish", "french"] as const;
export type TargetLanguage = typeof targetLanguages[number];

// Type definitions
export type UserTier = typeof USER_TIERS[keyof typeof USER_TIERS];

// For PDF content extraction
export type ExtractedContent = {
  title: string;
  pages: number;
  content: Array<{
    type: "text" | "heading" | "code" | "table";
    content?: string;
    translatedContent?: string;
    language?: string;
    headers?: string[];
    translatedHeaders?: string[];
    rows?: string[][];
    translatedRows?: string[][];
  }>;
  metadata: {
    extractionTime: string;
    wordCount: number;
    confidence: number;
    isTranslated?: boolean;
    sourceLanguage?: string;
    targetLanguage?: string;
    warning?: string;
  };
};

export type FileData = {
  name: string;
  size: string;
  lastModified: string;
  type: string;
  base64?: string;
};

// Basic validation schemas
export const registrationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});