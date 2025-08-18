#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getConfig } from './config/index.js';
import { IMAPManager } from './services/imap-manager.js';
import { EmailTools } from './tools/index.js';

class MCPIMAPServer {
  private server: Server;
  private imapManager: IMAPManager;
  private emailTools: EmailTools;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-imap-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    const config = getConfig();
    this.imapManager = new IMAPManager(config.imap);
    this.emailTools = new EmailTools(this.imapManager);

    this.setupToolHandlers();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_emails',
            description: 'Search for emails based on various criteria such as sender, subject, date range, or content',
            inputSchema: {
              type: 'object',
              properties: {
                sender: {
                  type: 'string',
                  description: 'Filter by sender email address or name'
                },
                subject: {
                  type: 'string',
                  description: 'Filter by subject line (partial match)'
                },
                dateFrom: {
                  type: 'string',
                  description: 'Start date for date range filter (ISO format: YYYY-MM-DD)'
                },
                dateTo: {
                  type: 'string',
                  description: 'End date for date range filter (ISO format: YYYY-MM-DD)'
                },
                content: {
                  type: 'string',
                  description: 'Search within email content/body text'
                },
                unread: {
                  type: 'boolean',
                  description: 'Filter by read status (true for unread only, false for read only)'
                },
                folder: {
                  type: 'string',
                  description: 'Folder to search in (defaults to INBOX)'
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of emails to return (1-100, default: no limit)',
                  minimum: 1,
                  maximum: 100
                }
              }
            }
          },
          {
            name: 'get_email',
            description: 'Retrieve the full content of a specific email by its message ID',
            inputSchema: {
              type: 'object',
              properties: {
                messageId: {
                  type: 'string',
                  description: 'The message ID or UID of the email to retrieve'
                },
                folder: {
                  type: 'string',
                  description: 'Folder containing the email (defaults to INBOX)'
                }
              },
              required: ['messageId']
            }
          },
          {
            name: 'list_folders',
            description: 'List all available email folders/mailboxes in the account',
            inputSchema: {
              type: 'object',
              properties: {
                includeSpecial: {
                  type: 'boolean',
                  description: 'Include special folders like Sent, Drafts, etc.'
                }
              }
            }
          },
          {
            name: 'get_recent_emails',
            description: 'Get the most recent emails from a specific folder',
            inputSchema: {
              type: 'object',
              properties: {
                folder: {
                  type: 'string',
                  description: 'Folder to get emails from (defaults to INBOX)'
                },
                limit: {
                  type: 'number',
                  description: 'Number of recent emails to retrieve (1-50, default: 10)',
                  minimum: 1,
                  maximum: 50
                },
                unreadOnly: {
                  type: 'boolean',
                  description: 'Only return unread emails'
                }
              }
            }
          },
          {
            name: 'mark_as_read',
            description: 'Mark an email as read or unread',
            inputSchema: {
              type: 'object',
              properties: {
                messageId: {
                  type: 'string',
                  description: 'The message ID or UID of the email to mark'
                },
                folder: {
                  type: 'string',
                  description: 'Folder containing the email (defaults to INBOX)'
                },
                read: {
                  type: 'boolean',
                  description: 'Mark as read (true) or unread (false). Default: true'
                }
              },
              required: ['messageId']
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case 'search_emails':
            return await this.emailTools.searchEmails(args);

          case 'get_email':
            return await this.emailTools.getEmail(args);

          case 'list_folders':
            return await this.emailTools.listFolders(args);

          case 'get_recent_emails':
            return await this.emailTools.getRecentEmails(args);

          case 'mark_as_read':
            return await this.emailTools.markAsRead(args);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        throw new Error(`Tool execution failed: ${(error as Error).message}`);
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP IMAP Server running on stdio');
  }

  async shutdown(): Promise<void> {
    try {
      await this.imapManager.disconnect();
    } catch (error) {
      console.error('Error during shutdown:', error);
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.error('Received SIGINT, shutting down gracefully...');
  if (server) {
    await server.shutdown();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('Received SIGTERM, shutting down gracefully...');
  if (server) {
    await server.shutdown();
  }
  process.exit(0);
});

// Start the server
const server = new MCPIMAPServer();
server.run().catch((error) => {
  console.error('Failed to run server:', error);
  process.exit(1);
});