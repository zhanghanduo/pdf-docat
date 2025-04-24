import {
  users,
  type User,
  type InsertUser,
  processingLogs,
  type ProcessingLog,
  type InsertProcessingLog,
} from "@shared/schema";

// Storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastActive(id: number): Promise<User | undefined>;
  
  // Processing logs methods
  createProcessingLog(log: InsertProcessingLog): Promise<ProcessingLog>;
  getProcessingLogsByUserId(userId: number, limit?: number, offset?: number): Promise<ProcessingLog[]>;
  getProcessingLogById(id: number): Promise<ProcessingLog | undefined>;
  getTotalProcessingLogs(userId?: number): Promise<number>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private processingLogs: Map<number, ProcessingLog>;
  private currentUserId: number;
  private currentLogId: number;

  constructor() {
    this.users = new Map();
    this.processingLogs = new Map();
    this.currentUserId = 1;
    this.currentLogId = 1;
    
    // Add default admin and user accounts
    this.createUser({
      email: "admin@documind.ai",
      password: "admin123",
      role: "admin",
      isActive: true,
    });
    
    this.createUser({
      email: "user@documind.ai",
      password: "user123",
      role: "user",
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
    const user: User = { 
      ...insertUser, 
      id,
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
      ...insertLog,
      id,
      timestamp: now,
    };
    this.processingLogs.set(id, log);
    return log;
  }

  async getProcessingLogsByUserId(userId: number, limit = 10, offset = 0): Promise<ProcessingLog[]> {
    const logs = Array.from(this.processingLogs.values())
      .filter(log => log.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return logs.slice(offset, offset + limit);
  }

  async getProcessingLogById(id: number): Promise<ProcessingLog | undefined> {
    return this.processingLogs.get(id);
  }

  async getTotalProcessingLogs(userId?: number): Promise<number> {
    if (userId) {
      return Array.from(this.processingLogs.values()).filter(log => log.userId === userId).length;
    }
    return this.processingLogs.size;
  }
}

export const storage = new MemStorage();
