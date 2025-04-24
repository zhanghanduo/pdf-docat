import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
  lastActive: timestamp("last_active").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  role: true,
  isActive: true,
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const processingLogs = pgTable("processing_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  engine: text("engine").notNull(),
  status: text("status").notNull(),
  processingTime: integer("processing_time"),
  extractedContent: jsonb("extracted_content"),
  fileAnnotations: jsonb("file_annotations"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertProcessingLogSchema = createInsertSchema(processingLogs).omit({
  id: true,
  timestamp: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Login = z.infer<typeof loginSchema>;
export type ProcessingLog = typeof processingLogs.$inferSelect;
export type InsertProcessingLog = z.infer<typeof insertProcessingLogSchema>;

export const engineTypes = ["mistral-ocr", "pdf-text", "native"] as const;
export type EngineType = typeof engineTypes[number];

export const processingStatus = ["idle", "uploading", "processing", "completed", "error"] as const;
export type ProcessingStatus = typeof processingStatus[number];

export type ExtractedContent = {
  title: string;
  pages: number;
  content: Array<{
    type: "text" | "heading" | "code" | "table";
    content?: string;
    language?: string;
    headers?: string[];
    rows?: string[][];
  }>;
  metadata: {
    extractionTime: string;
    wordCount: number;
    confidence: number;
  };
};

export type FileData = {
  name: string;
  size: string;
  lastModified: string;
  type: string;
  base64?: string;
};
