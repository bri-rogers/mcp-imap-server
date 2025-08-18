import { z } from 'zod';

export interface IMAPConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  tls: boolean;
  authTimeout?: number;
  connTimeout?: number;
  keepalive?: {
    interval: number;
    idleInterval: number;
    forceNoop: boolean;
  };
}

export interface EmailAddress {
  name?: string;
  address: string;
}

export interface EmailMessage {
  id: string;
  uid: number;
  subject?: string;
  from?: EmailAddress[];
  to?: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  date?: Date;
  flags: string[];
  size?: number;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
  headers?: Record<string, string | string[]>;
  messageId?: string;
  inReplyTo?: string;
  references?: string[];
}

export interface EmailAttachment {
  contentType: string;
  filename?: string;
  size: number;
  contentId?: string;
  content?: Buffer;
}

export interface EmailFolder {
  name: string;
  fullName: string;
  delimiter: string;
  flags: string[];
  children?: EmailFolder[];
  specialUse?: string;
  messageCount?: number;
  unreadCount?: number;
}

export interface SearchCriteria {
  sender?: string;
  subject?: string;
  dateFrom?: string;
  dateTo?: string;
  content?: string;
  unread?: boolean;
  folder?: string;
  limit?: number;
}

// Zod schemas for validation
export const SearchEmailsSchema = z.object({
  sender: z.string().optional(),
  subject: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  content: z.string().optional(),
  unread: z.boolean().optional(),
  folder: z.string().optional(),
  limit: z.number().min(1).max(100).optional()
});

export const GetEmailSchema = z.object({
  messageId: z.string(),
  folder: z.string().optional()
});

export const ListFoldersSchema = z.object({
  includeSpecial: z.boolean().optional()
});

export const GetRecentEmailsSchema = z.object({
  folder: z.string().optional(),
  limit: z.number().min(1).max(50).optional(),
  unreadOnly: z.boolean().optional()
});

export const MarkAsReadSchema = z.object({
  messageId: z.string(),
  folder: z.string().optional(),
  read: z.boolean().optional()
});

export type SearchEmailsArgs = z.infer<typeof SearchEmailsSchema>;
export type GetEmailArgs = z.infer<typeof GetEmailSchema>;
export type ListFoldersArgs = z.infer<typeof ListFoldersSchema>;
export type GetRecentEmailsArgs = z.infer<typeof GetRecentEmailsSchema>;
export type MarkAsReadArgs = z.infer<typeof MarkAsReadSchema>;

export class IMAPError extends Error {
  constructor(
    message: string,
    public code?: string,
    public source?: string
  ) {
    super(message);
    this.name = 'IMAPError';
  }
}

export class AuthenticationError extends IMAPError {
  constructor(message: string) {
    super(message, 'AUTH_FAILED', 'authentication');
    this.name = 'AuthenticationError';
  }
}

export class ConnectionError extends IMAPError {
  constructor(message: string) {
    super(message, 'CONNECTION_FAILED', 'connection');
    this.name = 'ConnectionError';
  }
}

export class TimeoutError extends IMAPError {
  constructor(message: string) {
    super(message, 'TIMEOUT', 'timeout');
    this.name = 'TimeoutError';
  }
}