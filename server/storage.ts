import { 
  users, type User, type InsertUser,
  integrations, type Integration, type InsertIntegration,
  financialSummaries, type FinancialSummary, type InsertFinancialSummary,
  transactions, type Transaction, type InsertTransaction,
  tasks, type Task, type InsertTask,
  aiMessages, type AiMessage, type InsertAiMessage
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import { webhookEvents, type NewWebhookEvent } from "@shared/finance.schema";

export interface IStorage {
  // Session helper (centralized for both modes)
  getSessionUser(): Promise<User | undefined>;
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Integration operations
  getIntegrations(userId: number): Promise<Integration[]>;
  getIntegration(id: number): Promise<Integration | undefined>;
  createIntegration(integration: InsertIntegration): Promise<Integration>;
  updateIntegration(id: number, integration: Partial<Integration>): Promise<Integration | undefined>;
  
  // Financial summary operations
  getFinancialSummary(userId: number): Promise<FinancialSummary | undefined>;
  createFinancialSummary(summary: InsertFinancialSummary): Promise<FinancialSummary>;
  updateFinancialSummary(userId: number, summary: Partial<FinancialSummary>): Promise<FinancialSummary | undefined>;
  
  // Transaction operations
  getTransactions(userId: number, limit?: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  
  // Task operations
  getTasks(userId: number, limit?: number): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<Task>): Promise<Task | undefined>;
  
  // AI Message operations
  getAiMessages(userId: number, limit?: number): Promise<AiMessage[]>;
  createAiMessage(message: InsertAiMessage): Promise<AiMessage>;

  // Utility
  listIntegrationsByService(serviceType: string): Promise<Integration[]>;

  // Webhook operations
  isWebhookDuplicate(source: string, eventId: string): Promise<boolean>;
  recordWebhookEvent(data: Omit<NewWebhookEvent, 'id' | 'receivedAt'>): Promise<any>;
  listWebhookEvents(params: { source?: string; limit?: number; cursor?: number }): Promise<{ items: any[]; nextCursor?: number }>;
}

export class DatabaseStorage implements IStorage {
  // Session helper
  async getSessionUser(): Promise<User | undefined> {
    // Centralized demo session (until real auth is wired up)
    return this.getUserByUsername("demo");
  }
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Integration operations
  async getIntegrations(userId: number): Promise<Integration[]> {
    return await db
      .select()
      .from(integrations)
      .where(eq(integrations.userId, userId));
  }

  async getIntegration(id: number): Promise<Integration | undefined> {
    const [integration] = await db
      .select()
      .from(integrations)
      .where(eq(integrations.id, id));
    return integration || undefined;
  }

  async createIntegration(insertIntegration: InsertIntegration): Promise<Integration> {
    const [integration] = await db
      .insert(integrations)
      .values(insertIntegration)
      .returning();
    return integration;
  }

  async updateIntegration(id: number, data: Partial<Integration>): Promise<Integration | undefined> {
    const [integration] = await db
      .update(integrations)
      .set(data)
      .where(eq(integrations.id, id))
      .returning();
    return integration || undefined;
  }

  // Financial summary operations
  async getFinancialSummary(userId: number): Promise<FinancialSummary | undefined> {
    const [summary] = await db
      .select()
      .from(financialSummaries)
      .where(eq(financialSummaries.userId, userId));
    return summary || undefined;
  }

  async createFinancialSummary(insertSummary: InsertFinancialSummary): Promise<FinancialSummary> {
    const [summary] = await db
      .insert(financialSummaries)
      .values(insertSummary)
      .returning();
    return summary;
  }

  async updateFinancialSummary(userId: number, data: Partial<FinancialSummary>): Promise<FinancialSummary | undefined> {
    const updatedData = { ...data, updatedAt: new Date() };
    
    const [summary] = await db
      .update(financialSummaries)
      .set(updatedData)
      .where(eq(financialSummaries.userId, userId))
      .returning();
    
    return summary || undefined;
  }

  // Transaction operations
  async getTransactions(userId: number, limit?: number): Promise<Transaction[]> {
    const baseQuery = db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date));

    if (limit) {
      return await baseQuery.limit(limit);
    }

    return await baseQuery;
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values(insertTransaction)
      .returning();
    return transaction;
  }

  // Task operations
  async getTasks(userId: number, limit?: number): Promise<Task[]> {
    // Start building the query
    const baseQuery = db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, userId))
      // Custom ordering (we'll order by multiple columns)
      // 1. Completed tasks go last
      // 2. Due date (earliest first)
      .orderBy(tasks.completed, tasks.dueDate);

    // Execute query
    const taskResults = limit ? await baseQuery.limit(limit) : await baseQuery;

    // Apply additional sorting for priority since SQL can't easily handle custom enum ordering
    return (taskResults as Task[]).sort((a: Task, b: Task) => {
      // Priority ordering
      const priorityOrder = { urgent: 0, due_soon: 1, upcoming: 2, null: 3 };
      const aPriority = a.priority ? priorityOrder[a.priority as keyof typeof priorityOrder] : priorityOrder.null;
      const bPriority = b.priority ? priorityOrder[b.priority as keyof typeof priorityOrder] : priorityOrder.null;
      
      if (aPriority !== bPriority) return aPriority - bPriority;

      return 0;
    });
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id));
    return task || undefined;
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values(insertTask)
      .returning();
    return task;
  }

  async updateTask(id: number, data: Partial<Task>): Promise<Task | undefined> {
    const [task] = await db
      .update(tasks)
      .set(data)
      .where(eq(tasks.id, id))
      .returning();
    return task || undefined;
  }

  // AI Message operations
  async getAiMessages(userId: number, limit?: number): Promise<AiMessage[]> {
    const baseQuery = db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.userId, userId))
      .orderBy(desc(aiMessages.timestamp));

    if (limit) {
      return await baseQuery.limit(limit);
    }

    return await baseQuery;
  }

  async createAiMessage(insertMessage: InsertAiMessage): Promise<AiMessage> {
    const [message] = await db
      .insert(aiMessages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async listIntegrationsByService(serviceType: string): Promise<Integration[]> {
    return await db
      .select()
      .from(integrations)
      .where(eq(integrations.serviceType, serviceType));
  }

  // Webhook events
  async isWebhookDuplicate(source: string, eventId: string): Promise<boolean> {
    const [row] = await db
      .select()
      .from(webhookEvents)
      .where(and(eq(webhookEvents.source, source), eq(webhookEvents.eventId, eventId)))
      .limit(1);
    return Boolean(row);
  }

  async recordWebhookEvent(data: Omit<NewWebhookEvent, 'id' | 'receivedAt'>) {
    const [row] = await db
      .insert(webhookEvents)
      .values(data as NewWebhookEvent)
      .onConflictDoNothing({ target: [webhookEvents.source, webhookEvents.eventId] })
      .returning();
    return row;
  }

  async listWebhookEvents(params: { source?: string; limit?: number; cursor?: number }) {
    const { source, limit = 50, cursor } = params;
    let q = db.select().from(webhookEvents).orderBy(desc(webhookEvents.receivedAt));
    if (source) {
      // @ts-ignore drizzle chainable where
      q = (q as any).where(eq(webhookEvents.source, source));
    }
    if (cursor) {
      // naive cursor by id less-than
      // @ts-ignore
      q = (q as any).where((eb: any) => eb.lt(webhookEvents.id, cursor));
    }
    // @ts-ignore
    const rows = await (q as any).limit(Math.min(limit, 100));
    const nextCursor = rows.length ? rows[rows.length - 1].id : undefined;
    return { items: rows, nextCursor };
  }
}

class MemoryStorage implements IStorage {
  private users: User[] = [];
  private integrations: Integration[] = [];
  private financialSummaries: FinancialSummary[] = [];
  private transactions: Transaction[] = [];
  private tasks: Task[] = [];
  private aiMessages: AiMessage[] = [];

  private ids = {
    user: 1,
    integration: 1,
    financialSummary: 1,
    transaction: 1,
    task: 1,
    aiMessage: 1,
  };

  async getSessionUser(): Promise<User | undefined> {
    return this.getUserByUsername("demo");
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.find((u) => u.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find((u) => u.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = { id: this.ids.user++, ...insertUser } as User;
    this.users.push(user);
    return user;
  }

  async getIntegrations(userId: number): Promise<Integration[]> {
    return this.integrations.filter((i) => i.userId === userId);
  }

  async getIntegration(id: number): Promise<Integration | undefined> {
    return this.integrations.find((i) => i.id === id);
  }

  async createIntegration(insertIntegration: InsertIntegration): Promise<Integration> {
    const integration: Integration = { id: this.ids.integration++, ...insertIntegration } as Integration;
    this.integrations.push(integration);
    return integration;
  }

  async updateIntegration(id: number, data: Partial<Integration>): Promise<Integration | undefined> {
    const idx = this.integrations.findIndex((i) => i.id === id);
    if (idx === -1) return undefined;
    this.integrations[idx] = { ...this.integrations[idx], ...data } as Integration;
    return this.integrations[idx];
  }

  async getFinancialSummary(userId: number): Promise<FinancialSummary | undefined> {
    return this.financialSummaries.find((s) => s.userId === userId);
  }

  async createFinancialSummary(insertSummary: InsertFinancialSummary): Promise<FinancialSummary> {
    const summary: FinancialSummary = { id: this.ids.financialSummary++, updatedAt: new Date(), ...insertSummary } as FinancialSummary;
    this.financialSummaries.push(summary);
    return summary;
  }

  async updateFinancialSummary(userId: number, data: Partial<FinancialSummary>): Promise<FinancialSummary | undefined> {
    const idx = this.financialSummaries.findIndex((s) => s.userId === userId);
    if (idx === -1) return undefined;
    const updated = { ...this.financialSummaries[idx], ...data, updatedAt: new Date() } as FinancialSummary;
    this.financialSummaries[idx] = updated;
    return updated;
  }

  async getTransactions(userId: number, limit?: number): Promise<Transaction[]> {
    const list = this.transactions
      .filter((t) => t.userId === userId)
      .sort((a, b) => (new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()));
    return typeof limit === 'number' ? list.slice(0, limit) : list;
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const transaction: Transaction = { id: this.ids.transaction++, ...insertTransaction } as Transaction;
    this.transactions.push(transaction);
    return transaction;
  }

  async getTasks(userId: number, limit?: number): Promise<Task[]> {
    const list = this.tasks
      .filter((t) => t.userId === userId)
      .sort((a, b) => (new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime()));
    return typeof limit === 'number' ? list.slice(0, limit) : list;
  }

  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.find((t) => t.id === id);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const task: Task = { id: this.ids.task++, completed: false, ...insertTask } as Task;
    this.tasks.push(task);
    return task;
  }

  async updateTask(id: number, data: Partial<Task>): Promise<Task | undefined> {
    const idx = this.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return undefined;
    this.tasks[idx] = { ...this.tasks[idx], ...data } as Task;
    return this.tasks[idx];
  }

  async getAiMessages(userId: number, limit?: number): Promise<AiMessage[]> {
    const list = this.aiMessages
      .filter((m) => m.userId === userId)
      .sort((a, b) => (new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()));
    return typeof limit === 'number' ? list.slice(0, limit) : list;
  }

  async createAiMessage(insertMessage: InsertAiMessage): Promise<AiMessage> {
    const message: AiMessage = { id: this.ids.aiMessage++, timestamp: new Date(), ...insertMessage } as AiMessage;
    this.aiMessages.push(message);
    return message;
  }

  async listIntegrationsByService(serviceType: string): Promise<Integration[]> {
    return this.integrations.filter((i) => i.serviceType === serviceType);
  }

  async isWebhookDuplicate(_source: string, _eventId: string): Promise<boolean> {
    return false; // In-memory mode doesn't track webhooks
  }

  async recordWebhookEvent(_data: any): Promise<any> {
    return null; // In-memory mode doesn't persist webhooks
  }

  async listWebhookEvents(_params: any): Promise<{ items: any[]; nextCursor?: number }> {
    return { items: [] }; // In-memory mode doesn't store webhooks
  }
}

// Choose storage implementation by MODE
const MODE = process.env.MODE || 'standalone';
export const storage: IStorage = MODE === 'system' ? new DatabaseStorage() : new MemoryStorage();

// Initialize default data (development/standalone only)
(async () => {
  const MODE = process.env.MODE || 'standalone';
  const isProd = process.env.NODE_ENV === 'production';
  if (MODE === 'system' || isProd) {
    return; // no demo data in system or production
  }
  try {
    // Check if demo user exists, if not create it
    let user = await storage.getUserByUsername("demo");
    
    if (!user) {
      // Create default user
      user = await storage.createUser({
        username: "demo",
        password: "password", // In a real app, would be hashed
        displayName: "Sarah Johnson",
        email: "sarah@example.com",
        role: "Financial Manager",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
      });
      
      // Setup integrations for Chitty Services
      const integrations = [
        {
          userId: user.id,
          serviceType: "mercury_bank",
          name: "Mercury Bank",
          description: "Banking & Financial Data",
          connected: true,
          lastSynced: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
          credentials: {}
        },
        {
          userId: user.id,
          serviceType: "wavapps",
          name: "WavApps",
          description: "Accounting & Invoicing",
          connected: true,
          lastSynced: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          credentials: {}
        },
        {
          userId: user.id,
          serviceType: "doorloop",
          name: "DoorLoop",
          description: "Property Management",
          connected: true,
          lastSynced: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
          credentials: {}
        }
      ];

      for (const integration of integrations) {
        await storage.createIntegration(integration);
      }

      // Setup financial summary
      await storage.createFinancialSummary({
        userId: user.id,
        cashOnHand: 127842.50,
        monthlyRevenue: 43291.75,
        monthlyExpenses: 26142.30,
        outstandingInvoices: 18520.00,
      });

      // Setup transactions
      const transactions = [
        {
          userId: user.id,
          title: "Client Payment - Acme Corp",
          description: "Invoice #12345",
          amount: 7500.00,
          type: "income",
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
        {
          userId: user.id,
          title: "Software Subscription",
          description: "Monthly SaaS Tools",
          amount: -1299.00,
          type: "expense",
          date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        },
        {
          userId: user.id,
          title: "Client Payment - XYZ Inc",
          description: "Invoice #12347",
          amount: 4200.00,
          type: "income",
          date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        }
      ];

      for (const transaction of transactions) {
        await storage.createTransaction(transaction);
      }

      // Setup tasks
      const tasks = [
        {
          userId: user.id,
          title: "Review Q2 expense report",
          description: "Due in 2 days",
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          priority: "due_soon",
          completed: false,
        },
        {
          userId: user.id,
          title: "Approve pending invoice payments",
          description: "5 payments requiring approval",
          dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
          priority: "urgent",
          completed: false,
        },
        {
          userId: user.id,
          title: "Schedule tax preparation meeting",
          description: "Due in 2 weeks",
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          priority: "upcoming",
          completed: false,
        },
      ];

      for (const task of tasks) {
        await storage.createTask(task);
      }

      // Setup initial AI message
      await storage.createAiMessage({
        userId: user.id,
        content: "Based on current cash flow projections, I recommend delaying the planned office expansion until Q3. Cash reserves are currently 12% below optimal levels for your business size. Would you like me to generate a detailed cost-reduction plan?",
        role: "assistant"
      });
    }
  } catch (error) {
    console.error("Error initializing data:", error);
  }
})();
