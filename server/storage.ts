import {
  users,
  type User,
  type InsertUser,
  processingLogs,
  type ProcessingLog,
  type InsertProcessingLog,
  creditLogs,
  insertCreditLogSchema,
  USER_TIERS,
  TIER_CREDITS,
  type UserTier
} from "@shared/schema";

// Storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastActive(id: number): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  updateUserTier(id: number, tier: UserTier): Promise<User | undefined>;
  
  // Credit management
  getUserCredits(userId: number): Promise<{ used: number, limit: number }>;
  useCredits(userId: number, amount: number, documentId?: number, description?: string): Promise<boolean>;
  getCreditLogs(userId: number, limit?: number, offset?: number): Promise<any[]>;
  
  // Processing logs methods
  createProcessingLog(log: InsertProcessingLog): Promise<ProcessingLog>;
  getProcessingLogsByUserId(userId: number, limit?: number, offset?: number): Promise<ProcessingLog[]>;
  getProcessingLogById(id: number): Promise<ProcessingLog | undefined>;
  getProcessingLogByFileHash(fileHash: string): Promise<ProcessingLog | undefined>;
  getTotalProcessingLogs(userId?: number): Promise<number>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private processingLogs: Map<number, ProcessingLog>;
  private creditLogs: Map<number, any>;
  private currentUserId: number;
  private currentLogId: number;
  private currentCreditLogId: number;

  constructor() {
    this.users = new Map();
    this.processingLogs = new Map();
    this.creditLogs = new Map();
    this.currentUserId = 1;
    this.currentLogId = 1;
    this.currentCreditLogId = 1;
    
    // Add default admin and user accounts
    this.createUser({
      email: "admin_handuo",
      password: "Christlurker2",
      role: "admin",
      tier: USER_TIERS.PRO,
      creditsLimit: TIER_CREDITS.pro,
      isActive: true,
    });
    
    this.createUser({
      email: "user@documind.ai",
      password: "user123",
      role: "user",
      tier: USER_TIERS.FREE,
      creditsLimit: TIER_CREDITS.free,
      isActive: true,
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    // Ensure all required fields are set with defaults if not provided
    const user: User = { 
      id,
      email: insertUser.email,
      password: insertUser.password,
      role: insertUser.role || "user", // Default to "user" if not provided
      isActive: insertUser.isActive ?? true, // Default to true if not provided
      lastActive: now
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserLastActive(id: number): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (user) {
      user.lastActive = new Date();
      this.users.set(id, user);
    }
    return user;
  }

  // Processing logs methods
  async createProcessingLog(insertLog: InsertProcessingLog): Promise<ProcessingLog> {
    const id = this.currentLogId++;
    const now = new Date();
    const log: ProcessingLog = {
      id,
      userId: insertLog.userId,
      fileName: insertLog.fileName,
      fileSize: insertLog.fileSize,
      fileHash: insertLog.fileHash || null,
      engine: insertLog.engine,
      status: insertLog.status,
      processingTime: insertLog.processingTime || null,
      extractedContent: insertLog.extractedContent || null,
      fileAnnotations: insertLog.fileAnnotations || null,
      timestamp: now,
    };
    this.processingLogs.set(id, log);
    return log;
  }

  async getProcessingLogsByUserId(userId: number, limit = 10, offset = 0): Promise<ProcessingLog[]> {
    const logs = Array.from(this.processingLogs.values())
      .filter(log => log.userId === userId)
      .sort((a, b) => {
        const timeA = a.timestamp ? a.timestamp.getTime() : 0;
        const timeB = b.timestamp ? b.timestamp.getTime() : 0;
        return timeB - timeA; // Sort by timestamp descending
      });
    
    return logs.slice(offset, offset + limit);
  }

  async getProcessingLogById(id: number): Promise<ProcessingLog | undefined> {
    return this.processingLogs.get(id);
  }
  
  async getProcessingLogByFileHash(fileHash: string): Promise<ProcessingLog | undefined> {
    return Array.from(this.processingLogs.values()).find(
      (log) => log.fileHash === fileHash
    );
  }

  async getTotalProcessingLogs(userId?: number): Promise<number> {
    if (userId) {
      return Array.from(this.processingLogs.values()).filter(log => log.userId === userId).length;
    }
    return this.processingLogs.size;
  }
}

export const storage = new MemStorage();
