import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export type AccountProvider = "apple" | "guest";

export interface AccountRecord {
  id: string;
  provider: AccountProvider;
  providerSubjectHash?: string;
  displayName: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

interface SessionRecord {
  accountId: string;
  tokenHash: string;
  createdAt: string;
}

interface AccountStoreData {
  accounts: AccountRecord[];
  sessions: SessionRecord[];
}

const MAX_DISPLAY_NAME_CHARS = 24;

function nowISO(): string {
  return new Date().toISOString();
}

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sanitizeDisplayName(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return fallback;
  }

  return Array.from(normalized).slice(0, MAX_DISPLAY_NAME_CHARS).join("");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function loadStoreData(path?: string): AccountStoreData {
  if (!path || !existsSync(path)) {
    return { accounts: [], sessions: [] };
  }

  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
    if (!isRecord(raw) || !Array.isArray(raw.accounts) || !Array.isArray(raw.sessions)) {
      return { accounts: [], sessions: [] };
    }

    return {
      accounts: raw.accounts.filter(isRecord).map((account) => ({
        id: String(account.id ?? randomUUID()),
        provider: account.provider === "apple" ? "apple" : "guest",
        providerSubjectHash:
          typeof account.providerSubjectHash === "string" ? account.providerSubjectHash : undefined,
        displayName: sanitizeDisplayName(account.displayName, "玩家"),
        email: typeof account.email === "string" ? account.email : undefined,
        createdAt: typeof account.createdAt === "string" ? account.createdAt : nowISO(),
        updatedAt: typeof account.updatedAt === "string" ? account.updatedAt : nowISO()
      })),
      sessions: raw.sessions.filter(isRecord).map((session) => ({
        accountId: String(session.accountId ?? ""),
        tokenHash: String(session.tokenHash ?? ""),
        createdAt: typeof session.createdAt === "string" ? session.createdAt : nowISO()
      }))
    };
  } catch {
    return { accounts: [], sessions: [] };
  }
}

export class AccountStore {
  private readonly data: AccountStoreData;

  constructor(private readonly path?: string) {
    this.data = loadStoreData(path);
  }

  createGuest(displayName: unknown): { account: AccountRecord; token: string } {
    const createdAt = nowISO();
    const account: AccountRecord = {
      id: randomUUID(),
      provider: "guest",
      displayName: sanitizeDisplayName(displayName, "游客玩家"),
      createdAt,
      updatedAt: createdAt
    };
    this.data.accounts.push(account);
    const token = this.createSession(account.id);
    this.persist();
    return { account, token };
  }

  upsertApple(subject: string, displayName: unknown, email?: unknown): { account: AccountRecord; token: string } {
    const providerSubjectHash = hashValue(subject);
    const existing = this.data.accounts.find(
      (account) => account.provider === "apple" && account.providerSubjectHash === providerSubjectHash
    );
    const updatedAt = nowISO();

    if (existing) {
      existing.displayName = sanitizeDisplayName(displayName, existing.displayName);
      if (typeof email === "string" && email.includes("@")) {
        existing.email = email;
      }
      existing.updatedAt = updatedAt;
      const token = this.createSession(existing.id);
      this.persist();
      return { account: existing, token };
    }

    const account: AccountRecord = {
      id: randomUUID(),
      provider: "apple",
      providerSubjectHash,
      displayName: sanitizeDisplayName(displayName, "Apple 玩家"),
      email: typeof email === "string" && email.includes("@") ? email : undefined,
      createdAt: updatedAt,
      updatedAt
    };
    this.data.accounts.push(account);
    const token = this.createSession(account.id);
    this.persist();
    return { account, token };
  }

  getByToken(token: unknown): AccountRecord | null {
    if (typeof token !== "string" || token.length < 20) {
      return null;
    }

    const tokenHash = hashValue(token);
    const session = this.data.sessions.find((candidate) => safeEqual(candidate.tokenHash, tokenHash));
    if (!session) {
      return null;
    }

    return this.data.accounts.find((account) => account.id === session.accountId) ?? null;
  }

  deleteByToken(token: unknown): boolean {
    const account = this.getByToken(token);
    if (!account) {
      return false;
    }

    this.data.accounts.splice(
      0,
      this.data.accounts.length,
      ...this.data.accounts.filter((candidate) => candidate.id !== account.id)
    );
    this.data.sessions.splice(
      0,
      this.data.sessions.length,
      ...this.data.sessions.filter((session) => session.accountId !== account.id)
    );
    this.persist();
    return true;
  }

  publicAccount(account: AccountRecord): Omit<AccountRecord, "providerSubjectHash"> {
    const { providerSubjectHash: _providerSubjectHash, ...publicRecord } = account;
    return publicRecord;
  }

  private createSession(accountId: string): string {
    const token = `sc_${randomBytes(32).toString("base64url")}`;
    this.data.sessions.push({
      accountId,
      tokenHash: hashValue(token),
      createdAt: nowISO()
    });
    return token;
  }

  private persist(): void {
    if (!this.path) {
      return;
    }

    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify(this.data, null, 2));
  }
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
