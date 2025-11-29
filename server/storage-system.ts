// System mode storage implementation with multi-tenant support
// Uses database/system.schema.ts with UUID IDs and tenant isolation

import { db } from "./db";
import { eq, desc, and, inArray } from "drizzle-orm";
import type {
  Tenant, InsertTenant,
  User, InsertUser,
  TenantUser, InsertTenantUser,
  Account, InsertAccount,
  Transaction, InsertTransaction,
} from "../database/system.schema";
import {
  tenants, users, tenantUsers, accounts, transactions,
} from "../database/system.schema";

export interface ISystemStorage {
  // Tenant operations
  getTenants(userId: string): Promise<Tenant[]>;
  getTenant(tenantId: string): Promise<Tenant | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;

  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Tenant-User access
  getUserTenants(userId: string): Promise<Array<Tenant & { role: string }>>;
  grantTenantAccess(access: InsertTenantUser): Promise<TenantUser>;

  // Tenant-scoped account operations
  getAccounts(tenantId: string): Promise<Account[]>;
  getAccount(id: string, tenantId: string): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;

  // Tenant-scoped transaction operations
  getTransactions(tenantId: string, limit?: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;

  // Financial summary (tenant-scoped)
  getFinancialSummary(tenantId: string): Promise<{
    cashOnHand: string;
    monthlyRevenue: string;
    monthlyExpenses: string;
    accountCount: number;
  }>;
}

export class SystemStorage implements ISystemStorage {
  async getTenants(userId: string): Promise<Tenant[]> {
    const userTenants = await db
      .select({ tenant: tenants })
      .from(tenantUsers)
      .innerJoin(tenants, eq(tenantUsers.tenantId, tenants.id))
      .where(eq(tenantUsers.userId, userId));
    return userTenants.map((ut: any) => ut.tenant);
  }

  async getTenant(tenantId: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    return tenant;
  }

  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug));
    return tenant;
  }

  async createTenant(insertTenant: InsertTenant): Promise<Tenant> {
    const [tenant] = await db.insert(tenants).values(insertTenant).returning();
    return tenant;
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUserTenants(userId: string): Promise<Array<Tenant & { role: string }>> {
    const results = await db
      .select({
        tenant: tenants,
        role: tenantUsers.role,
      })
      .from(tenantUsers)
      .innerJoin(tenants, eq(tenantUsers.tenantId, tenants.id))
      .where(eq(tenantUsers.userId, userId));
    return results.map((r: any) => ({ ...r.tenant, role: r.role }));
  }

  async grantTenantAccess(access: InsertTenantUser): Promise<TenantUser> {
    const [tenantUser] = await db.insert(tenantUsers).values(access).returning();
    return tenantUser;
  }

  async getAccounts(tenantId: string): Promise<Account[]> {
    return await db.select().from(accounts).where(eq(accounts.tenantId, tenantId));
  }

  async getAccount(id: string, tenantId: string): Promise<Account | undefined> {
    const [account] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.tenantId, tenantId)));
    return account;
  }

  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    const [account] = await db.insert(accounts).values(insertAccount).returning();
    return account;
  }

  async getTransactions(tenantId: string, limit?: number): Promise<Transaction[]> {
    const query = db
      .select()
      .from(transactions)
      .where(eq(transactions.tenantId, tenantId))
      .orderBy(desc(transactions.date));

    return limit ? await query.limit(limit) : await query;
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values(insertTransaction).returning();
    return transaction;
  }

  async getFinancialSummary(tenantId: string): Promise<{
    cashOnHand: string;
    monthlyRevenue: string;
    monthlyExpenses: string;
    accountCount: number;
  }> {
    const accts = await this.getAccounts(tenantId);
    const cashOnHand = accts.reduce((sum, a) => sum + parseFloat(a.balance || '0'), 0);

    // Last 30 days revenue/expenses
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentTx = await db
      .select()
      .from(transactions)
      .where(and(
        eq(transactions.tenantId, tenantId),
        desc(transactions.date)
      ));

    const monthlyRevenue = recentTx
      .filter((t: any) => t.type === 'income' && new Date(t.date) >= thirtyDaysAgo)
      .reduce((sum: number, t: any) => sum + parseFloat(t.amount || '0'), 0);

    const monthlyExpenses = recentTx
      .filter((t: any) => t.type === 'expense' && new Date(t.date) >= thirtyDaysAgo)
      .reduce((sum: number, t: any) => sum + Math.abs(parseFloat(t.amount || '0')), 0);

    return {
      cashOnHand: cashOnHand.toFixed(2),
      monthlyRevenue: monthlyRevenue.toFixed(2),
      monthlyExpenses: monthlyExpenses.toFixed(2),
      accountCount: accts.length,
    };
  }
}

export const systemStorage = new SystemStorage();
