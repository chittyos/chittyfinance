import express, { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertAiMessageSchema, insertIntegrationSchema, insertTaskSchema } from "@shared/schema";
import { getFinancialAdvice, generateCostReductionPlan } from "./lib/openai";
import { getAggregatedFinancialData } from "./lib/financialServices";
import { getRecurringCharges, getChargeOptimizations, manageRecurringCharge } from "./lib/chargeAutomation";
import {
  fetchUserRepositories,
  fetchRepositoryCommits,
  fetchRepositoryPullRequests,
  fetchRepositoryIssues
} from "./lib/github";
import {
  createInvestigation,
  getInvestigation,
  listInvestigations,
  updateInvestigationStatus,
  addEvidence,
  getEvidence,
  updateChainOfCustody,
  analyzeAllTransactions,
  detectDuplicatePayments,
  detectUnusualTiming,
  detectRoundDollarAnomalies,
  runBenfordsLawAnalysis,
  traceFlowOfFunds,
  createFlowOfFundsRecord,
  getFlowOfFunds,
  calculateDirectLoss,
  calculateNetWorthMethod,
  calculatePreJudgmentInterest,
  generateExecutiveSummary,
  createForensicReport,
  getForensicReports,
  runComprehensiveAnalysis
} from "./lib/forensicService";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create API router
  const api = express.Router();

  // Auto-login for demo purposes - in a real app this would be a proper authentication flow
  api.get("/session", async (req: Request, res: Response) => {
    const user = await storage.getUserByUsername("demo");
    
    if (!user) {
      return res.status(404).json({ 
        message: "Demo user not found" 
      });
    }
    
    // Don't send password to client
    const { password, ...safeUser } = user;
    res.json(safeUser);
  });

  // Get financial summary
  api.get("/financial-summary", async (req: Request, res: Response) => {
    // In a real app, we would get the user ID from the session
    const user = await storage.getUserByUsername("demo");
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
    const user = await storage.getUserByUsername("demo");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const integrations = await storage.getIntegrations(user.id);
    res.json(integrations);
  });

  // Create or update integration
  api.post("/integrations", async (req: Request, res: Response) => {
    try {
      const user = await storage.getUserByUsername("demo");
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
    const user = await storage.getUserByUsername("demo");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const transactions = await storage.getTransactions(user.id, limit);
    
    res.json(transactions);
  });

  // Get tasks
  api.get("/tasks", async (req: Request, res: Response) => {
    const user = await storage.getUserByUsername("demo");
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
      const user = await storage.getUserByUsername("demo");
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
    const user = await storage.getUserByUsername("demo");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const messages = await storage.getAiMessages(user.id, limit);
    
    res.json(messages);
  });

  // Get latest AI assistant message
  api.get("/ai-assistant/latest", async (req: Request, res: Response) => {
    const user = await storage.getUserByUsername("demo");
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
      const user = await storage.getUserByUsername("demo");
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
        userQuery: query
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
      const user = await storage.getUserByUsername("demo");
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
        monthlyExpenses: summary.monthlyExpenses
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
      const user = await storage.getUserByUsername("demo");
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
      const user = await storage.getUserByUsername("demo");
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
      const user = await storage.getUserByUsername("demo");
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
      const user = await storage.getUserByUsername("demo");
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
      const user = await storage.getUserByUsername("demo");
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
      const user = await storage.getUserByUsername("demo");
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
      const user = await storage.getUserByUsername("demo");
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

  // Forensic Investigation Routes

  // Get all investigations for user
  api.get("/forensics/investigations", async (req: Request, res: Response) => {
    try {
      const user = await storage.getUserByUsername("demo");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const investigations = await listInvestigations(user.id);
      res.json(investigations);
    } catch (error) {
      console.error("Error fetching investigations:", error);
      res.status(500).json({ message: "Failed to fetch investigations" });
    }
  });

  // Get specific investigation
  api.get("/forensics/investigations/:id", async (req: Request, res: Response) => {
    try {
      const investigationId = parseInt(req.params.id);
      if (isNaN(investigationId)) {
        return res.status(400).json({ message: "Invalid investigation ID" });
      }

      const investigation = await getInvestigation(investigationId);
      if (!investigation) {
        return res.status(404).json({ message: "Investigation not found" });
      }

      res.json(investigation);
    } catch (error) {
      console.error("Error fetching investigation:", error);
      res.status(500).json({ message: "Failed to fetch investigation" });
    }
  });

  // Create new investigation
  api.post("/forensics/investigations", async (req: Request, res: Response) => {
    try {
      const user = await storage.getUserByUsername("demo");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const investigation = await createInvestigation({
        ...req.body,
        userId: user.id
      });

      res.status(201).json(investigation);
    } catch (error) {
      console.error("Error creating investigation:", error);
      res.status(500).json({ message: "Failed to create investigation" });
    }
  });

  // Update investigation status
  api.patch("/forensics/investigations/:id/status", async (req: Request, res: Response) => {
    try {
      const investigationId = parseInt(req.params.id);
      if (isNaN(investigationId)) {
        return res.status(400).json({ message: "Invalid investigation ID" });
      }

      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      const investigation = await updateInvestigationStatus(investigationId, status);
      res.json(investigation);
    } catch (error) {
      console.error("Error updating investigation status:", error);
      res.status(500).json({ message: "Failed to update investigation status" });
    }
  });

  // Add evidence to investigation
  api.post("/forensics/investigations/:id/evidence", async (req: Request, res: Response) => {
    try {
      const investigationId = parseInt(req.params.id);
      if (isNaN(investigationId)) {
        return res.status(400).json({ message: "Invalid investigation ID" });
      }

      const evidence = await addEvidence({
        ...req.body,
        investigationId
      });

      res.status(201).json(evidence);
    } catch (error) {
      console.error("Error adding evidence:", error);
      res.status(500).json({ message: "Failed to add evidence" });
    }
  });

  // Get evidence for investigation
  api.get("/forensics/investigations/:id/evidence", async (req: Request, res: Response) => {
    try {
      const investigationId = parseInt(req.params.id);
      if (isNaN(investigationId)) {
        return res.status(400).json({ message: "Invalid investigation ID" });
      }

      const evidence = await getEvidence(investigationId);
      res.json(evidence);
    } catch (error) {
      console.error("Error fetching evidence:", error);
      res.status(500).json({ message: "Failed to fetch evidence" });
    }
  });

  // Update chain of custody for evidence
  api.post("/forensics/evidence/:id/custody", async (req: Request, res: Response) => {
    try {
      const evidenceId = parseInt(req.params.id);
      if (isNaN(evidenceId)) {
        return res.status(400).json({ message: "Invalid evidence ID" });
      }

      const evidence = await updateChainOfCustody(evidenceId, {
        ...req.body,
        timestamp: new Date()
      });

      res.json(evidence);
    } catch (error) {
      console.error("Error updating chain of custody:", error);
      res.status(500).json({ message: "Failed to update chain of custody" });
    }
  });

  // Run comprehensive analysis
  api.post("/forensics/investigations/:id/analyze", async (req: Request, res: Response) => {
    try {
      const investigationId = parseInt(req.params.id);
      if (isNaN(investigationId)) {
        return res.status(400).json({ message: "Invalid investigation ID" });
      }

      const user = await storage.getUserByUsername("demo");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const results = await runComprehensiveAnalysis(investigationId, user.id);
      res.json(results);
    } catch (error) {
      console.error("Error running comprehensive analysis:", error);
      res.status(500).json({ message: "Failed to run comprehensive analysis" });
    }
  });

  // Run specific analysis: Duplicate Payments
  api.post("/forensics/investigations/:id/analyze/duplicates", async (req: Request, res: Response) => {
    try {
      const investigationId = parseInt(req.params.id);
      if (isNaN(investigationId)) {
        return res.status(400).json({ message: "Invalid investigation ID" });
      }

      const user = await storage.getUserByUsername("demo");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const results = await detectDuplicatePayments(investigationId, user.id);
      res.json(results);
    } catch (error) {
      console.error("Error detecting duplicate payments:", error);
      res.status(500).json({ message: "Failed to detect duplicate payments" });
    }
  });

  // Run specific analysis: Unusual Timing
  api.post("/forensics/investigations/:id/analyze/timing", async (req: Request, res: Response) => {
    try {
      const investigationId = parseInt(req.params.id);
      if (isNaN(investigationId)) {
        return res.status(400).json({ message: "Invalid investigation ID" });
      }

      const user = await storage.getUserByUsername("demo");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const results = await detectUnusualTiming(investigationId, user.id);
      res.json(results);
    } catch (error) {
      console.error("Error detecting unusual timing:", error);
      res.status(500).json({ message: "Failed to detect unusual timing" });
    }
  });

  // Run specific analysis: Round Dollar Amounts
  api.post("/forensics/investigations/:id/analyze/round-dollars", async (req: Request, res: Response) => {
    try {
      const investigationId = parseInt(req.params.id);
      if (isNaN(investigationId)) {
        return res.status(400).json({ message: "Invalid investigation ID" });
      }

      const user = await storage.getUserByUsername("demo");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const results = await detectRoundDollarAnomalies(investigationId, user.id);
      res.json(results);
    } catch (error) {
      console.error("Error detecting round dollar anomalies:", error);
      res.status(500).json({ message: "Failed to detect round dollar anomalies" });
    }
  });

  // Run specific analysis: Benford's Law
  api.post("/forensics/investigations/:id/analyze/benfords-law", async (req: Request, res: Response) => {
    try {
      const investigationId = parseInt(req.params.id);
      if (isNaN(investigationId)) {
        return res.status(400).json({ message: "Invalid investigation ID" });
      }

      const user = await storage.getUserByUsername("demo");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const results = await runBenfordsLawAnalysis(investigationId, user.id);
      res.json(results);
    } catch (error) {
      console.error("Error running Benford's Law analysis:", error);
      res.status(500).json({ message: "Failed to run Benford's Law analysis" });
    }
  });

  // Trace flow of funds
  api.post("/forensics/investigations/:id/trace-funds", async (req: Request, res: Response) => {
    try {
      const investigationId = parseInt(req.params.id);
      if (isNaN(investigationId)) {
        return res.status(400).json({ message: "Invalid investigation ID" });
      }

      const { transactionId } = req.body;
      if (!transactionId) {
        return res.status(400).json({ message: "Transaction ID is required" });
      }

      const trace = await traceFlowOfFunds(investigationId, transactionId);
      res.json(trace);
    } catch (error) {
      console.error("Error tracing flow of funds:", error);
      res.status(500).json({ message: "Failed to trace flow of funds" });
    }
  });

  // Create flow of funds record
  api.post("/forensics/investigations/:id/flow-of-funds", async (req: Request, res: Response) => {
    try {
      const investigationId = parseInt(req.params.id);
      if (isNaN(investigationId)) {
        return res.status(400).json({ message: "Invalid investigation ID" });
      }

      const flow = await createFlowOfFundsRecord({
        ...req.body,
        investigationId
      });

      res.status(201).json(flow);
    } catch (error) {
      console.error("Error creating flow of funds record:", error);
      res.status(500).json({ message: "Failed to create flow of funds record" });
    }
  });

  // Get flow of funds records
  api.get("/forensics/investigations/:id/flow-of-funds", async (req: Request, res: Response) => {
    try {
      const investigationId = parseInt(req.params.id);
      if (isNaN(investigationId)) {
        return res.status(400).json({ message: "Invalid investigation ID" });
      }

      const flows = await getFlowOfFunds(investigationId);
      res.json(flows);
    } catch (error) {
      console.error("Error fetching flow of funds:", error);
      res.status(500).json({ message: "Failed to fetch flow of funds" });
    }
  });

  // Calculate damages: Direct Loss
  api.post("/forensics/investigations/:id/calculate-damages/direct-loss", async (req: Request, res: Response) => {
    try {
      const investigationId = parseInt(req.params.id);
      if (isNaN(investigationId)) {
        return res.status(400).json({ message: "Invalid investigation ID" });
      }

      const { improperTransactionIds } = req.body;
      if (!Array.isArray(improperTransactionIds)) {
        return res.status(400).json({ message: "improperTransactionIds array is required" });
      }

      const damages = await calculateDirectLoss(investigationId, improperTransactionIds);
      res.json(damages);
    } catch (error) {
      console.error("Error calculating direct loss:", error);
      res.status(500).json({ message: "Failed to calculate direct loss" });
    }
  });

  // Calculate damages: Net Worth Method
  api.post("/forensics/investigations/:id/calculate-damages/net-worth", async (req: Request, res: Response) => {
    try {
      const { beginningNetWorth, endingNetWorth, personalExpenditures, legitimateIncome } = req.body;

      if (
        typeof beginningNetWorth !== 'number' ||
        typeof endingNetWorth !== 'number' ||
        typeof personalExpenditures !== 'number' ||
        typeof legitimateIncome !== 'number'
      ) {
        return res.status(400).json({ message: "All net worth parameters are required" });
      }

      const damages = await calculateNetWorthMethod(
        beginningNetWorth,
        endingNetWorth,
        personalExpenditures,
        legitimateIncome
      );

      res.json(damages);
    } catch (error) {
      console.error("Error calculating net worth damages:", error);
      res.status(500).json({ message: "Failed to calculate net worth damages" });
    }
  });

  // Calculate pre-judgment interest
  api.post("/forensics/calculate-interest", async (req: Request, res: Response) => {
    try {
      const { lossAmount, lossDate, interestRate } = req.body;

      if (
        typeof lossAmount !== 'number' ||
        !lossDate ||
        typeof interestRate !== 'number'
      ) {
        return res.status(400).json({ message: "lossAmount, lossDate, and interestRate are required" });
      }

      const interest = calculatePreJudgmentInterest(
        lossAmount,
        new Date(lossDate),
        interestRate
      );

      res.json({ interest, totalWithInterest: lossAmount + interest });
    } catch (error) {
      console.error("Error calculating interest:", error);
      res.status(500).json({ message: "Failed to calculate interest" });
    }
  });

  // Generate executive summary
  api.post("/forensics/investigations/:id/generate-summary", async (req: Request, res: Response) => {
    try {
      const investigationId = parseInt(req.params.id);
      if (isNaN(investigationId)) {
        return res.status(400).json({ message: "Invalid investigation ID" });
      }

      const summary = await generateExecutiveSummary(investigationId);
      res.json({ summary });
    } catch (error) {
      console.error("Error generating executive summary:", error);
      res.status(500).json({ message: "Failed to generate executive summary" });
    }
  });

  // Create forensic report
  api.post("/forensics/investigations/:id/reports", async (req: Request, res: Response) => {
    try {
      const investigationId = parseInt(req.params.id);
      if (isNaN(investigationId)) {
        return res.status(400).json({ message: "Invalid investigation ID" });
      }

      const report = await createForensicReport({
        ...req.body,
        investigationId
      });

      res.status(201).json(report);
    } catch (error) {
      console.error("Error creating forensic report:", error);
      res.status(500).json({ message: "Failed to create forensic report" });
    }
  });

  // Get forensic reports
  api.get("/forensics/investigations/:id/reports", async (req: Request, res: Response) => {
    try {
      const investigationId = parseInt(req.params.id);
      if (isNaN(investigationId)) {
        return res.status(400).json({ message: "Invalid investigation ID" });
      }

      const reports = await getForensicReports(investigationId);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching forensic reports:", error);
      res.status(500).json({ message: "Failed to fetch forensic reports" });
    }
  });

  // Register API routes
  app.use("/api", api);

  const httpServer = createServer(app);
  return httpServer;
}
