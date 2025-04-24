import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User tier constants
export const USER_TIERS = {
  FREE: 'free',
  PLUS: 'plus',
  PRO: 'pro'
} as const;

// Credit limits per tier
export const TIER_CREDITS = {
  [USER_TIERS.FREE]: 500,
  [USER_TIERS.PLUS]: 50000,
  [USER_TIERS.PRO]: 1000000
} as const;

// Credit costs per page type
export const CREDIT_COSTS = {
  SCANNED: 5,
  STRUCTURED: 1
} as const;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  role: text("role").notNull().default("user"),
  tier: text("tier").notNull().default(USER_TIERS.FREE),
  creditsUsed: integer("credits_used").notNull().default(0),
  creditsLimit: integer("credits_limit").notNull().default(TIER_CREDITS.free),
  isActive: boolean("is_active").notNull().default(true),
  lastActive: timestamp("last_active").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  name: true,
  role: true,
  tier: true,
  creditsUsed: true,
  creditsLimit: true,
  isActive: true,
});

export const registrationSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

export const processingLogs = pgTable("processing_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  fileHash: varchar("file_hash", { length: 64 }),
  engine: text("engine").notNull(),
  status: text("status").notNull(),
  processingTime: integer("processing_time"),
  extractedContent: jsonb("extracted_content"),
  fileAnnotations: jsonb("file_annotations"),
  creditsUsed: integer("credits_used"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertProcessingLogSchema = createInsertSchema(processingLogs).omit({
  id: true,
  timestamp: true,
});

export const creditLogs = pgTable("credit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: integer("amount").notNull(),
  documentId: integer("document_id"),
  description: text("description").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertCreditLogSchema = createInsertSchema(creditLogs).omit({
  id: true,
  timestamp: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Registration = z.infer<typeof registrationSchema>;
export type Login = z.infer<typeof loginSchema>;
export type ProcessingLog = typeof processingLogs.$inferSelect;
export type InsertProcessingLog = z.infer<typeof insertProcessingLogSchema>;
export type UserTier = typeof USER_TIERS[keyof typeof USER_TIERS];

export const engineTypes = ["auto", "mistral-ocr", "pdf-text", "native"] as const;
export type EngineType = typeof engineTypes[number];

export const processingStatus = ["idle", "uploading", "processing", "completed", "error"] as const;
export type ProcessingStatus = typeof processingStatus[number];

export const targetLanguages = ["english", "simplified-chinese", "traditional-chinese", "german", "japanese", "spanish", "french"] as const;
export type TargetLanguage = typeof targetLanguages[number];

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
  };
};

export type FileData = {
  name: string;
  size: string;
  lastModified: string;
  type: string;
  base64?: string;
};
