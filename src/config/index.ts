import { config } from 'dotenv';
import { IMAPConfig } from '../types/index.js';

config();

export interface AppConfig {
  imap: IMAPConfig;
  server: {
    name: string;
    version: string;
  };
}

export function getConfig(): AppConfig {
  const requiredEnvVars = ['IMAP_HOST', 'IMAP_USER', 'IMAP_PASSWORD'];
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    imap: {
      host: process.env.IMAP_HOST!,
      port: parseInt(process.env.IMAP_PORT || '993', 10),
      user: process.env.IMAP_USER!,
      password: process.env.IMAP_PASSWORD!,
      tls: process.env.IMAP_TLS !== 'false',
      authTimeout: parseInt(process.env.IMAP_AUTH_TIMEOUT || '3000', 10),
      connTimeout: parseInt(process.env.IMAP_CONN_TIMEOUT || '10000', 10),
      keepalive: {
        interval: parseInt(process.env.IMAP_KEEPALIVE_INTERVAL || '10000', 10),
        idleInterval: parseInt(process.env.IMAP_IDLE_INTERVAL || '300000', 10),
        forceNoop: process.env.IMAP_FORCE_NOOP === 'true'
      }
    },
    server: {
      name: 'mcp-imap-server',
      version: '1.0.0'
    }
  };
}

// Predefined configurations for popular email providers
export const PROVIDER_CONFIGS = {
  gmail: {
    host: 'imap.gmail.com',
    port: 993,
    tls: true
  },
  outlook: {
    host: 'outlook.office365.com',
    port: 993,
    tls: true
  },
  yahoo: {
    host: 'imap.mail.yahoo.com',
    port: 993,
    tls: true
  },
  icloud: {
    host: 'imap.mail.me.com',
    port: 993,
    tls: true
  }
} as const;

export type EmailProvider = keyof typeof PROVIDER_CONFIGS;