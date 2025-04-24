import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { verifyToken, isAdmin, generateToken } from "./middleware/auth";
import { loggerMiddleware, logUserAction } from "./middleware/logger";
import { loginSchema, insertUserSchema, insertProcessingLogSchema, engineTypes } from "@shared/schema";
import { estimatePdfPageCount } from "./api/openrouter";
import { processPDF as processWithIterative } from "./api/openrouter-iterative";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// Function to calculate SHA-256 hash of a file
function calculateFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// Set up multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only PDF files
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed"));
    }
    cb(null, true);
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up logger middleware
  app.use(loggerMiddleware);

  // Authentication routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = loginSchema.safeParse(req.body);
      if (!validatedData.success) {
        return res.status(400).json({ message: "Invalid credentials", errors: validatedData.error.errors });
      }
      
      const { email, password } = validatedData.data;
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      // Verify user exists and password matches
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({ message: "Account is inactive, please contact an administrator" });
      }
      
      // Generate JWT token
      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
      });
      
      // Update last active timestamp
      await storage.updateUserLastActive(user.id);
      
      // Log user login
      logUserAction(user.id, "User logged in");
      
      // Return token and user data (excluding password)
      return res.status(200).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Server error during login" });
    }
  });

  // User management routes (admin only)
  app.get("/api/users", verifyToken, isAdmin, async (req: Request, res: Response) => {
    try {
      // Get all users (for a real DB implementation this would use a proper query)
      // We're using a type assertion here because we know the implementation details of our MemStorage
      const users = Array.from((storage as any).users.values())
        .map((user: any) => {
          // Remove password from response
          const { password, ...userData } = user;
          return userData;
        });
      
      return res.status(200).json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({ message: "Server error fetching users" });
    }
  });

  app.post("/api/users", verifyToken, isAdmin, async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = insertUserSchema.safeParse(req.body);
      if (!validatedData.success) {
        return res.status(400).json({ message: "Invalid user data", errors: validatedData.error.errors });
      }
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(validatedData.data.email);
      if (existingUser) {
        return res.status(409).json({ message: "Email already in use" });
      }
      
      // Create the user
      const user = await storage.createUser(validatedData.data);
      
      // Log user creation
      logUserAction(req.user!.id, "Created new user", { newUserId: user.id, email: user.email });
      
      // Return the new user (excluding password)
      const { password, ...userData } = user;
      return res.status(201).json(userData);
    } catch (error) {
      console.error("Error creating user:", error);
      return res.status(500).json({ message: "Server error creating user" });
    }
  });
  
  // Add route to update a user
  app.put("/api/users/:id", verifyToken, isAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Get the user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user properties based on request body
      // For a real implementation, you'd use proper database operations
      const updatedUser = { ...user };
      
      if (req.body.email) {
        // Check if email is already in use by another user
        const existingUser = await storage.getUserByEmail(req.body.email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(409).json({ message: "Email already in use by another user" });
        }
        updatedUser.email = req.body.email;
      }
      
      if (req.body.password) {
        updatedUser.password = req.body.password;
      }
      
      if (req.body.role) {
        updatedUser.role = req.body.role;
      }
      
      if (req.body.isActive !== undefined) {
        updatedUser.isActive = req.body.isActive;
      }
      
      // Update the user in storage
      // For a real implementation, you'd have a proper update method
      (storage as any).users.set(userId, updatedUser);
      
      // Log user update
      logUserAction(req.user!.id, "Updated user", { updatedUserId: userId, email: updatedUser.email });
      
      // Return the updated user (excluding password)
      const { password, ...userData } = updatedUser;
      return res.status(200).json(userData);
    } catch (error) {
      console.error("Error updating user:", error);
      return res.status(500).json({ message: "Server error updating user" });
    }
  });
  
  // Add route to delete a user
  app.delete("/api/users/:id", verifyToken, isAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Get the user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't allow deleting yourself
      if (userId === req.user!.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      // Delete the user from storage
      // For a real implementation, you'd have a proper delete method
      (storage as any).users.delete(userId);
      
      // Log user deletion
      logUserAction(req.user!.id, "Deleted user", { deletedUserId: userId, email: user.email });
      
      return res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      return res.status(500).json({ message: "Server error deleting user" });
    }
  });

  // PDF processing routes
  app.post(
    "/api/process-pdf",
    verifyToken,
    upload.single("pdf"),
    async (req: Request, res: Response) => {
      try {
        console.log("PDF processing request received");
        
        // Verify file was uploaded
        if (!req.file) {
          return res.status(400).json({ message: "No PDF file provided" });
        }
        
        // Check file size (max 25MB)
        const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB in bytes
        if (req.file.size > MAX_FILE_SIZE) {
          logUserAction(req.user!.id, "PDF processing error", { 
            fileName: req.file.originalname, 
            error: "File too large (max 25MB)" 
          });
          return res.status(400).json({ 
            message: "File size exceeds the maximum limit of 25MB",
            error: "File too large"
          });
        }
        
        // Check if user has exceeded their daily processing limit
        // Get today's date at midnight for counting today's processing
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Count processing logs for this user today
        const totalLogs = await storage.getTotalProcessingLogs(req.user!.id);
        const MAX_DAILY_PROCESSING = 20; // Maximum number of PDFs a user can process per day
        
        if (totalLogs >= MAX_DAILY_PROCESSING) {
          logUserAction(req.user!.id, "PDF processing error", { 
            fileName: req.file.originalname, 
            error: "Daily processing limit exceeded" 
          });
          return res.status(429).json({ 
            message: `You have exceeded the daily limit of ${MAX_DAILY_PROCESSING} PDF files. Please try again tomorrow.`,
            error: "Rate limit exceeded"
          });
        }
        
        // Check file type
        if (req.file.mimetype !== 'application/pdf') {
          logUserAction(req.user!.id, "PDF processing error", { 
            fileName: req.file.originalname, 
            error: "Invalid file type" 
          });
          return res.status(400).json({ 
            message: "Invalid file type. Only PDF files are accepted",
            error: "Invalid file type"
          });
        }
        
        console.log(`Processing PDF: ${req.file.originalname}, Size: ${Math.round(req.file.size / 1024)}KB`);
        
        // Get processing engine from request
        const engine = req.body.engine || "mistral-ocr";
        if (!engineTypes.includes(engine)) {
          return res.status(400).json({ message: "Invalid processing engine" });
        }
        
        // Get file annotations from request (if any)
        const fileAnnotations = req.body.fileAnnotations;
        
        // Get translation options if provided
        const translateEnabled = req.body.translateEnabled === 'true';
        const targetLanguage = req.body.targetLanguage || 'simplified-chinese';
        const dualLanguage = req.body.dualLanguage === 'true';
        
        // Start timing for processing
        const startTime = Date.now();
        
        // Calculate file hash for caching
        const fileHash = calculateFileHash(req.file.buffer);
        console.log(`File hash: ${fileHash}`);
        
        // Check if we already have this file in cache
        const cachedLog = await storage.getProcessingLogByFileHash(fileHash);
        
        if (cachedLog && cachedLog.status === "completed") {
          console.log(`Found cached result for file: ${req.file.originalname}`);
          
          // Calculate processing time (just the time to look up the cache)
          const processingTime = Date.now() - startTime;
          
          // Log cache hit
          logUserAction(req.user!.id, "PDF processing cache hit", {
            fileName: req.file.originalname,
            fileSize: req.file.size,
            engine,
            fileHash
          });
          
          // Create a new log entry for this request but reference the cached content
          const log = await storage.createProcessingLog({
            userId: req.user!.id,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            fileHash: fileHash,
            engine: engine,
            status: "completed",
            processingTime: processingTime,
            extractedContent: cachedLog.extractedContent as any,
            fileAnnotations: cachedLog.fileAnnotations as any,
          });
          
          // Return the cached content
          return res.status(200).json({
            extractedContent: cachedLog.extractedContent,
            fileAnnotations: cachedLog.fileAnnotations,
            logId: log.id,
            cached: true
          });
        }
        
        // Convert file to base64
        const pdfBase64 = req.file.buffer.toString("base64");
        console.log("File converted to base64");
        
        // Check the page count and apply limits
        console.log("Estimating PDF page count");
        const pageCount = await estimatePdfPageCount(pdfBase64);
        
        // Maximum page count allowed (different for different user roles)
        const MAX_PAGE_COUNT = req.user!.role === "admin" ? 200 : 100;
        
        if (pageCount > MAX_PAGE_COUNT) {
          logUserAction(req.user!.id, "PDF processing error", { 
            fileName: req.file.originalname, 
            error: `Page count (${pageCount}) exceeds maximum limit (${MAX_PAGE_COUNT})` 
          });
          
          return res.status(400).json({ 
            message: `This PDF has approximately ${pageCount} pages, which exceeds the maximum limit of ${MAX_PAGE_COUNT} pages. Please upload a smaller document.`,
            error: "Page limit exceeded",
            pageCount: pageCount,
            maxPages: MAX_PAGE_COUNT
          });
        }
        
        // Process the PDF with the iterative processor
        console.log(`Calling OpenRouter API with iterative processor, engine: ${engine}`);
        
        // Create translation options object if translation is enabled
        const translationOptionsObj = translateEnabled 
          ? { translateEnabled, targetLanguage, dualLanguage } 
          : undefined;
        
        // Use the iterative processor for better handling of large documents
        const { extractedContent, fileAnnotations: newFileAnnotations } = await processWithIterative(
          pdfBase64,
          req.file.originalname,
          engine,
          translationOptionsObj,
          fileAnnotations
        );
        
        // Calculate processing time
        const processingTime = Date.now() - startTime;
        console.log(`PDF processed successfully in ${processingTime}ms`);
        
        // Create processing log with file hash
        const log = await storage.createProcessingLog({
          userId: req.user!.id,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          fileHash: fileHash, // Store the file hash for future cache lookups
          engine: engine,
          status: "completed",
          processingTime: processingTime,
          extractedContent,
          fileAnnotations: newFileAnnotations ? JSON.parse(newFileAnnotations) : null,
        });
        
        // Log PDF processing
        logUserAction(req.user!.id, "Processed PDF", {
          fileName: req.file.originalname,
          fileSize: req.file.size,
          engine,
        });
        
        // Return the extracted content and file annotations
        return res.status(200).json({
          extractedContent,
          fileAnnotations: newFileAnnotations,
          logId: log.id,
        });
      } catch (error) {
        console.error("Error processing PDF:", error);
        
        // Create error log if possible
        if (req.file && req.user) {
          try {
            // Calculate file hash for the error log
            const fileHash = calculateFileHash(req.file.buffer);
            
            await storage.createProcessingLog({
              userId: req.user.id,
              fileName: req.file.originalname,
              fileSize: req.file.size,
              fileHash: fileHash,
              engine: req.body.engine || "mistral-ocr",
              status: "error",
              processingTime: null,
              extractedContent: null,
              fileAnnotations: null,
            });
            
            // Log error
            logUserAction(req.user.id, "PDF processing error", {
              fileName: req.file.originalname,
              error: (error instanceof Error) ? error.message : "Unknown error",
            });
          } catch (logError) {
            console.error("Error creating log for PDF processing error:", logError);
          }
        }
        
        // Check for specific error messages related to API key issues
        const errorMessage = (error instanceof Error) ? error.message : "Unknown error";
        const isApiKeyError = errorMessage.includes('API key') || 
                             errorMessage.includes('authentication') || 
                             errorMessage.includes('auth') || 
                             errorMessage.includes('401') ||
                             errorMessage.includes('403');
        
        if (isApiKeyError) {
          return res.status(401).json({
            message: "Authentication error with OpenRouter API",
            error: "Invalid or missing API key. Please ensure the OPENROUTER_API_KEY is correctly set.",
            needsApiKey: true
          });
        } else {
          return res.status(500).json({
            message: "Error processing PDF",
            error: errorMessage,
          });
        }
      }
    }
  );

  // Processing logs routes
  app.get("/api/processing-logs", verifyToken, async (req: Request, res: Response) => {
    try {
      // Get pagination parameters
      const limit = parseInt(req.query.limit as string) || 10;
      const page = parseInt(req.query.page as string) || 1;
      const offset = (page - 1) * limit;
      
      // Get logs for the current user
      const logs = await storage.getProcessingLogsByUserId(req.user!.id, limit, offset);
      
      // Get total count
      const totalLogs = await storage.getTotalProcessingLogs(req.user!.id);
      
      return res.status(200).json({
        logs,
        pagination: {
          total: totalLogs,
          page,
          limit,
          pages: Math.ceil(totalLogs / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching processing logs:", error);
      return res.status(500).json({ message: "Server error fetching processing logs" });
    }
  });

  app.get("/api/processing-logs/:id", verifyToken, async (req: Request, res: Response) => {
    try {
      // Get log by ID
      const logId = parseInt(req.params.id);
      if (isNaN(logId)) {
        return res.status(400).json({ message: "Invalid log ID" });
      }
      
      const log = await storage.getProcessingLogById(logId);
      
      // Check if log exists
      if (!log) {
        return res.status(404).json({ message: "Processing log not found" });
      }
      
      // Check if log belongs to current user or user is admin
      if (log.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }
      
      return res.status(200).json(log);
    } catch (error) {
      console.error("Error fetching processing log:", error);
      return res.status(500).json({ message: "Server error fetching processing log" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
