import express, { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertAiMessageSchema, insertIntegrationSchema, insertTaskSchema } from "@shared/schema";
import { getFinancialAdvice, generateCostReductionPlan } from "./lib/openai";
import { getAggregatedFinancialData } from "./lib/financialServices";
import { listMercuryAccounts } from "./lib/chittyConnect";
import { getRecurringCharges, getChargeOptimizations, manageRecurringCharge } from "./lib/chargeAutomation";
import { 
  fetchUserRepositories, 
  fetchRepositoryCommits, 
  fetchRepositoryPullRequests, 
  fetchRepositoryIssues 
} from "./lib/github";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create API router
  const api = express.Router();

  // Helper route: redirect to ChittyConnect for account linking
  app.get("/connect", (_req: Request, res: Response) => {
    const url = process.env.CHITTY_CONNECT_URL || "https://connect.chitty.cc";
    res.redirect(302, url);
  });

  // Helper route: redirect to ChittyRegister (get.chitty.cc) for service registration
  app.get("/register", (_req: Request, res: Response) => {
    const url = process.env.CHITTY_REGISTER_URL || "https://get.chitty.cc";
    res.redirect(302, url);
  });

  // Session endpoint
  api.get("/session", async (_req: Request, res: Response) => {
    const isProdSystem = (res.app.get('env') === 'production') && ((process.env.MODE || 'standalone') === 'system');
    if (isProdSystem) {
      return res.status(401).json({ message: 'Authentication required (ChittyID integration expected)' });
    }

    const user = await storage.getSessionUser();
    if (!user) return res.status(404).json({ message: 'Demo user not found' });
    const { password, ...safeUser } = user;
    res.json(safeUser);
  });

  // Get financial summary
  api.get("/financial-summary", async (req: Request, res: Response) => {
    // In a real app, we would get the user ID and tenant ID from the session/middleware
    const user = await storage.getSessionUser();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get financial summary
    let summary = await storage.getFinancialSummary(user.id);

    if (!summary) {
      // If no summary exists, we'd typically fetch from external services
      // For demo, create a new summary record
      summary = await storage.createFinancialSummary({
        userId: user.id,
        cashOnHand: 127842.50,
        monthlyRevenue: 43291.75,
        monthlyExpenses: 26142.30,
        outstandingInvoices: 18520.00,
      });
    }

    res.json(summary);
  });

  // Get integrations
  api.get("/integrations", async (req: Request, res: Response) => {
    const user = await storage.getSessionUser();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const integrations = await storage.getIntegrations(user.id);
    res.json(integrations);
  });

  // Mercury account discovery via ChittyConnect (multi-account support)
  api.get("/mercury/accounts", async (req: Request, res: Response) => {
    try {
      const user = await storage.getSessionUser();
      if (!user) return res.status(404).json({ message: "User not found" });
      const tenantId = (req as any).tenantId as string | undefined;
      const accounts = await listMercuryAccounts({ userId: user.id, tenantId });
      res.json(accounts);
    } catch (error) {
      console.error("Error listing Mercury accounts:", error);
      res.status(500).json({ message: "Failed to list Mercury accounts" });
    }
  });

  // Select which Mercury accounts to sync
  api.post("/mercury/select-accounts", async (req: Request, res: Response) => {
    try {
      const user = await storage.getSessionUser();
      if (!user) return res.status(404).json({ message: "User not found" });
      const { accountIds, tenantId } = req.body as { accountIds: string[]; tenantId?: string };
      if (!Array.isArray(accountIds) || accountIds.length === 0) {
        return res.status(400).json({ message: "accountIds must be a non-empty array" });
      }
      const integrations = await storage.getIntegrations(user.id);
      let merc = integrations.find(i => i.serviceType === 'mercury_bank');
      if (!merc) {
        merc = await storage.createIntegration({
          userId: user.id,
          serviceType: 'mercury_bank',
          name: 'Mercury Bank',
          connected: true,
          credentials: {},
          description: 'Banking & Financial Data',
          lastSynced: new Date(),
        });
      }
      const updated = await storage.updateIntegration(merc.id, {
        credentials: { ...(merc.credentials || {}), selectedAccountIds: accountIds, tenantId },
        lastSynced: new Date(),
      } as any);
      res.json(updated);
    } catch (error) {
      console.error("Error selecting Mercury accounts:", error);
      res.status(500).json({ message: "Failed to update selected accounts" });
    }
  });

  // Create or update integration
  api.post("/integrations", async (req: Request, res: Response) => {
    try {
      const user = await storage.getSessionUser();
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const data = insertIntegrationSchema.parse({ ...req.body, userId: user.id });
      const integration = await storage.createIntegration(data);
      res.status(201).json(integration);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid integration data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create integration" });
    }
  });

  // Update integration
  api.patch("/integrations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid integration ID" });
      }

      const integration = await storage.getIntegration(id);
      if (!integration) {
        return res.status(404).json({ message: "Integration not found" });
      }

      const updatedIntegration = await storage.updateIntegration(id, req.body);
      res.json(updatedIntegration);
    } catch (error) {
      res.status(500).json({ message: "Failed to update integration" });
    }
  });

  // Get recent transactions
  api.get("/transactions", async (req: Request, res: Response) => {
    const user = await storage.getSessionUser();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const transactions = await storage.getTransactions(user.id, limit);
    
    res.json(transactions);
  });

  // Get tasks
  api.get("/tasks", async (req: Request, res: Response) => {
    const user = await storage.getSessionUser();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const tasks = await storage.getTasks(user.id, limit);
    
    res.json(tasks);
  });

  // Create task
  api.post("/tasks", async (req: Request, res: Response) => {
    try {
      const user = await storage.getSessionUser();
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const data = insertTaskSchema.parse({ ...req.body, userId: user.id });
      const task = await storage.createTask(data);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  // Update task
  api.patch("/tasks/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      const updatedTask = await storage.updateTask(id, req.body);
      res.json(updatedTask);
    } catch (error) {
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  // Get AI messages
  api.get("/ai-messages", async (req: Request, res: Response) => {
    const user = await storage.getSessionUser();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const messages = await storage.getAiMessages(user.id, limit);
    
    res.json(messages);
  });

  // Get latest AI assistant message
  api.get("/ai-assistant/latest", async (req: Request, res: Response) => {
    const user = await storage.getSessionUser();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const messages = await storage.getAiMessages(user.id, 1);
    const latestMessage = messages.length > 0 ? messages[0] : null;
    
    res.json(latestMessage || { content: "I'm your AI CFO assistant. How can I help you today?" });
  });

  // Send message to AI assistant
  api.post("/ai-assistant/query", async (req: Request, res: Response) => {
    try {
      const user = await storage.getSessionUser();
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { query } = req.body;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ message: "Query is required" });
      }

      // Store user message
      await storage.createAiMessage({
        userId: user.id,
        content: query,
        role: "user"
      });

      // Get financial data
      const summary = await storage.getFinancialSummary(user.id);
      if (!summary) {
        return res.status(404).json({ message: "Financial summary not found" });
      }

      // Get previous assistant message for context
      const previousMessages = await storage.getAiMessages(user.id, 2);
      const previousAssistantMessage = previousMessages.find(m => m.role === "assistant")?.content;

      // Get AI response
      const aiResponse = await getFinancialAdvice({
        cashOnHand: summary.cashOnHand,
        monthlyRevenue: summary.monthlyRevenue,
        monthlyExpenses: summary.monthlyExpenses,
        outstandingInvoices: summary.outstandingInvoices,
        previousAdvice: previousAssistantMessage,
        userQuery: query,
        userId: user.id,
      });

      // Store AI response
      const assistantMessage = await storage.createAiMessage({
        userId: user.id,
        content: aiResponse,
        role: "assistant"
      });

      res.json(assistantMessage);
    } catch (error) {
      console.error("AI assistant query error:", error);
      res.status(500).json({ message: "Failed to process AI assistant query" });
    }
  });

  // Generate cost reduction plan
  api.post("/ai-assistant/generate-plan", async (req: Request, res: Response) => {
    try {
      const user = await storage.getSessionUser();
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get financial data
      const summary = await storage.getFinancialSummary(user.id);
      if (!summary) {
        return res.status(404).json({ message: "Financial summary not found" });
      }

      // Generate plan
      const plan = await generateCostReductionPlan({
        cashOnHand: summary.cashOnHand,
        monthlyRevenue: summary.monthlyRevenue,
        monthlyExpenses: summary.monthlyExpenses,
        userId: user.id,
      });

      // Store AI response
      const assistantMessage = await storage.createAiMessage({
        userId: user.id,
        content: plan,
        role: "assistant"
      });

      res.json(assistantMessage);
    } catch (error) {
      console.error("Cost reduction plan generation error:", error);
      res.status(500).json({ message: "Failed to generate cost reduction plan" });
    }
  });

  // Charge Automation Routes
  
  // Get recurring charges
  api.get("/charges/recurring", async (req: Request, res: Response) => {
    try {
      const user = await storage.getSessionUser();
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const charges = await getRecurringCharges(user.id);
      res.json(charges);
    } catch (error) {
      console.error("Error fetching recurring charges:", error);
      res.status(500).json({ message: "Failed to fetch recurring charges" });
    }
  });
  
  // Get charge optimization recommendations
  api.get("/charges/optimizations", async (req: Request, res: Response) => {
    try {
      const user = await storage.getSessionUser();
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const optimizations = await getChargeOptimizations(user.id);
      res.json(optimizations);
    } catch (error) {
      console.error("Error generating charge optimizations:", error);
      res.status(500).json({ message: "Failed to generate charge optimizations" });
    }
  });
  
  // Cancel or modify a recurring charge
  api.post("/charges/manage", async (req: Request, res: Response) => {
    try {
      const user = await storage.getSessionUser();
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { chargeId, action, modifications } = req.body;
      
      if (!chargeId || !action) {
        return res.status(400).json({ message: "chargeId and action are required" });
      }
      
      if (action !== 'cancel' && action !== 'modify') {
        return res.status(400).json({ message: "action must be 'cancel' or 'modify'" });
      }
      
      const result = await manageRecurringCharge(user.id, chargeId, action, modifications);
      res.json(result);
    } catch (error) {
      console.error("Error managing recurring charge:", error);
      res.status(500).json({ message: "Failed to manage recurring charge" });
    }
  });

  // GitHub Integration Routes
  
  // Get GitHub repositories
  api.get("/github/repositories", async (req: Request, res: Response) => {
    try {
      const user = await storage.getSessionUser();
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get GitHub integration
      const integrations = await storage.getIntegrations(user.id);
      const githubIntegration = integrations.find(i => i.serviceType === "github");
      
      if (!githubIntegration) {
        // For demo purposes, create a GitHub integration if it doesn't exist
        const newIntegration = await storage.createIntegration({
          userId: user.id,
          serviceType: "github",
          name: "GitHub",
          description: "Source Code & Development",
          connected: true,
          lastSynced: new Date(),
          credentials: {}
        });
        
        const repositories = await fetchUserRepositories(newIntegration);
        return res.json(repositories);
      }
      
      const repositories = await fetchUserRepositories(githubIntegration);
      res.json(repositories);
    } catch (error) {
      console.error("Error fetching GitHub repositories:", error);
      res.status(500).json({ message: "Failed to fetch GitHub repositories" });
    }
  });
  
  // Get GitHub repository commits
  api.get("/github/repositories/:repoFullName/commits", async (req: Request, res: Response) => {
    try {
      const user = await storage.getSessionUser();
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { repoFullName } = req.params;
      if (!repoFullName) {
        return res.status(400).json({ message: "Repository name is required" });
      }
      
      // Get GitHub integration
      const integrations = await storage.getIntegrations(user.id);
      const githubIntegration = integrations.find(i => i.serviceType === "github");
      
      if (!githubIntegration) {
        return res.status(404).json({ message: "GitHub integration not found" });
      }
      
      const commits = await fetchRepositoryCommits(githubIntegration, repoFullName);
      res.json(commits);
    } catch (error) {
      console.error(`Error fetching commits for ${req.params.repoFullName}:`, error);
      res.status(500).json({ message: "Failed to fetch repository commits" });
    }
  });
  
  // Get GitHub repository pull requests
  api.get("/github/repositories/:repoFullName/pulls", async (req: Request, res: Response) => {
    try {
      const user = await storage.getSessionUser();
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { repoFullName } = req.params;
      if (!repoFullName) {
        return res.status(400).json({ message: "Repository name is required" });
      }
      
      // Get GitHub integration
      const integrations = await storage.getIntegrations(user.id);
      const githubIntegration = integrations.find(i => i.serviceType === "github");
      
      if (!githubIntegration) {
        return res.status(404).json({ message: "GitHub integration not found" });
      }
      
      const pullRequests = await fetchRepositoryPullRequests(githubIntegration, repoFullName);
      res.json(pullRequests);
    } catch (error) {
      console.error(`Error fetching pull requests for ${req.params.repoFullName}:`, error);
      res.status(500).json({ message: "Failed to fetch repository pull requests" });
    }
  });
  
  // Get GitHub repository issues
  api.get("/github/repositories/:repoFullName/issues", async (req: Request, res: Response) => {
    try {
      const user = await storage.getSessionUser();
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { repoFullName } = req.params;
      if (!repoFullName) {
        return res.status(400).json({ message: "Repository name is required" });
      }
      
      // Get GitHub integration
      const integrations = await storage.getIntegrations(user.id);
      const githubIntegration = integrations.find(i => i.serviceType === "github");
      
      if (!githubIntegration) {
        return res.status(404).json({ message: "GitHub integration not found" });
      }
      
      const issues = await fetchRepositoryIssues(githubIntegration, repoFullName);
      res.json(issues);
    } catch (error) {
      console.error(`Error fetching issues for ${req.params.repoFullName}:`, error);
      res.status(500).json({ message: "Failed to fetch repository issues" });
    }
  });

  // Register API routes
  app.use("/api", api);

  // Compliance: required health and status endpoints
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/api/v1/status', async (_req: Request, res: Response) => {
    const start = Date.now();
    let version = process.env.APP_VERSION || 'unknown';
    try {
      const fs = await import('fs');
      const path = await import('path');
      const pkgPath = path.resolve(process.cwd(), 'package.json');
      if (fs.existsSync(pkgPath)) {
        const raw = fs.readFileSync(pkgPath, 'utf-8');
        const pkg = JSON.parse(raw);
        if (pkg?.version) version = pkg.version;
      }
    } catch {}

    const MODE = process.env.MODE || 'standalone';
    const nodeEnv = process.env.NODE_ENV || 'development';
    const dbConfigured = MODE === 'standalone' ? true : !!process.env.DATABASE_URL;
    const chittyBase = process.env.CHITTYCONNECT_API_BASE || process.env.CHITTY_CONNECT_URL;
    const chittyAuth = process.env.CHITTYCONNECT_API_TOKEN || process.env.CHITTY_AUTH_SERVICE_TOKEN;

    res.json({
      name: 'ChittyFinance',
      version,
      uptimeSec: Math.floor(process.uptime()),
      mode: MODE,
      nodeEnv,
      database: { configured: dbConfigured },
      chittyConnect: { configured: !!(chittyBase && chittyAuth) },
      latencyMs: Date.now() - start,
    });
  });

  // Documentation (OpenAPI JSON)
  app.get('/api/v1/documentation', (_req: Request, res: Response) => {
    const version = process.env.APP_VERSION || '1.0.0';
    const openapi = {
      openapi: '3.0.3',
      info: { title: 'ChittyFinance API', version, description: 'ChittyFinance API for the ChittyOS ecosystem.' },
      servers: [{ url: 'https://finance.chitty.cc' }],
      paths: {
        '/health': { get: { summary: 'Health check', responses: { '200': { description: 'OK' } } } },
        '/api/v1/status': { get: { summary: 'Service status', responses: { '200': { description: 'Service status' } } } },
        '/api/mercury/accounts': { get: { summary: 'List Mercury accounts (via ChittyConnect)', responses: { '200': { description: 'Accounts' }, '401': { description: 'Unauthorized' } } } },
        '/api/mercury/select-accounts': { post: { summary: 'Select Mercury accounts to sync', responses: { '200': { description: 'Updated integration' }, '400': { description: 'Bad request' }, '401': { description: 'Unauthorized' } } } }
      }
    } as const;
    res.status(200).json(openapi);
  });

  // Prometheus-style metrics
  app.get('/api/v1/metrics', (_req: Request, res: Response) => {
    const uptime = Math.floor(process.uptime());
    const MODE = process.env.MODE || 'standalone';
    const dbConfigured = MODE === 'standalone' ? 1 : (process.env.DATABASE_URL ? 1 : 0);
    const chittyConfigured = (process.env.CHITTYCONNECT_API_BASE && (process.env.CHITTYCONNECT_API_TOKEN || process.env.CHITTY_AUTH_SERVICE_TOKEN)) ? 1 : 0;
    const lines = [
      '# HELP service_uptime_seconds Process uptime in seconds',
      '# TYPE service_uptime_seconds gauge',
      `service_uptime_seconds ${uptime}`,
      '# HELP service_database_configured Database configured (1) or not (0)',
      '# TYPE service_database_configured gauge',
      `service_database_configured ${dbConfigured}`,
      '# HELP service_chittyconnect_configured ChittyConnect configured (1) or not (0)',
      '# TYPE service_chittyconnect_configured gauge',
      `service_chittyconnect_configured ${chittyConfigured}`,
      ''
    ];
    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
    res.status(200).send(lines.join('\n'));
  });

  const httpServer = createServer(app);
  return httpServer;
}
