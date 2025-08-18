import {
  SearchEmailsArgs,
  GetEmailArgs,
  ListFoldersArgs,
  GetRecentEmailsArgs,
  MarkAsReadArgs,
  SearchEmailsSchema,
  GetEmailSchema,
  ListFoldersSchema,
  GetRecentEmailsSchema,
  MarkAsReadSchema
} from '../types/index.js';
import { IMAPManager } from '../services/imap-manager.js';

export class EmailTools {
  constructor(private imapManager: IMAPManager) {}

  async searchEmails(args: SearchEmailsArgs) {
    try {
      const validatedArgs = SearchEmailsSchema.parse(args);
      const emails = await this.imapManager.searchEmails(validatedArgs);
      
      return {
        content: [
          {
            type: "text",
            text: `Found ${emails.length} emails matching your criteria:\n\n` +
                  emails.map(email => 
                    `📧 **${email.subject || 'No Subject'}**\n` +
                    `From: ${email.from?.map(f => f.address).join(', ') || 'Unknown'}\n` +
                    `Date: ${email.date?.toLocaleString() || 'Unknown'}\n` +
                    `ID: ${email.id}\n` +
                    `Flags: ${email.flags.join(', ')}\n` +
                    `Preview: ${(email.text || '').substring(0, 100)}${email.text && email.text.length > 100 ? '...' : ''}\n`
                  ).join('\n---\n')
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to search emails: ${(error as Error).message}`);
    }
  }

  async getEmail(args: GetEmailArgs) {
    try {
      const validatedArgs = GetEmailSchema.parse(args);
      const email = await this.imapManager.getEmail(validatedArgs.messageId, validatedArgs.folder);
      
      if (!email) {
        return {
          content: [
            {
              type: "text",
              text: `No email found with ID: ${validatedArgs.messageId}`
            }
          ]
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `📧 **${email.subject || 'No Subject'}**\n\n` +
                  `**From:** ${email.from?.map(f => `${f.name || ''} <${f.address}>`).join(', ') || 'Unknown'}\n` +
                  `**To:** ${email.to?.map(f => `${f.name || ''} <${f.address}>`).join(', ') || 'Unknown'}\n` +
                  `**Date:** ${email.date?.toLocaleString() || 'Unknown'}\n` +
                  `**Message ID:** ${email.messageId || email.id}\n` +
                  `**Flags:** ${email.flags.join(', ')}\n` +
                  (email.cc && email.cc.length > 0 ? `**CC:** ${email.cc.map(f => `${f.name || ''} <${f.address}>`).join(', ')}\n` : '') +
                  (email.attachments && email.attachments.length > 0 ? `**Attachments:** ${email.attachments.map(a => a.filename || 'Unnamed').join(', ')}\n` : '') +
                  `\n**Content:**\n${email.text || email.html || 'No content available'}`
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to get email: ${(error as Error).message}`);
    }
  }

  async listFolders(args: ListFoldersArgs = {}) {
    try {
      const validatedArgs = ListFoldersSchema.parse(args);
      const folders = await this.imapManager.getFolders();
      
      const formatFolder = (folder: any, indent = 0): string => {
        const prefix = '  '.repeat(indent);
        let result = `${prefix}📁 ${folder.name}`;
        
        if (folder.specialUse) {
          result += ` (${folder.specialUse})`;
        }
        
        if (folder.messageCount !== undefined) {
          result += ` [${folder.messageCount} messages]`;
        }
        
        result += '\n';
        
        if (folder.children) {
          for (const child of folder.children) {
            result += formatFolder(child, indent + 1);
          }
        }
        
        return result;
      };

      return {
        content: [
          {
            type: "text",
            text: `📂 **Email Folders:**\n\n${folders.map(folder => formatFolder(folder)).join('')}`
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to list folders: ${(error as Error).message}`);
    }
  }

  async getRecentEmails(args: GetRecentEmailsArgs = {}) {
    try {
      const validatedArgs = GetRecentEmailsSchema.parse(args);
      const emails = await this.imapManager.getRecentEmails(
        validatedArgs.folder || 'INBOX',
        validatedArgs.limit || 10,
        validatedArgs.unreadOnly || false
      );
      
      if (emails.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No ${validatedArgs.unreadOnly ? 'unread ' : ''}emails found in ${validatedArgs.folder || 'INBOX'}`
            }
          ]
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `📬 **Recent ${validatedArgs.unreadOnly ? 'Unread ' : ''}Emails from ${validatedArgs.folder || 'INBOX'}:**\n\n` +
                  emails.map(email => 
                    `📧 **${email.subject || 'No Subject'}**\n` +
                    `From: ${email.from?.map(f => f.address).join(', ') || 'Unknown'}\n` +
                    `Date: ${email.date?.toLocaleString() || 'Unknown'}\n` +
                    `ID: ${email.id}\n` +
                    `Status: ${email.flags.includes('\\Seen') ? '✅ Read' : '🟡 Unread'}\n` +
                    `Preview: ${(email.text || '').substring(0, 100)}${email.text && email.text.length > 100 ? '...' : ''}\n`
                  ).join('\n---\n')
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to get recent emails: ${(error as Error).message}`);
    }
  }

  async markAsRead(args: MarkAsReadArgs) {
    try {
      const validatedArgs = MarkAsReadSchema.parse(args);
      const success = await this.imapManager.markAsRead(
        validatedArgs.messageId,
        validatedArgs.folder || 'INBOX',
        validatedArgs.read !== false
      );
      
      return {
        content: [
          {
            type: "text",
            text: success 
              ? `✅ Email ${validatedArgs.messageId} marked as ${validatedArgs.read !== false ? 'read' : 'unread'}`
              : `❌ Failed to mark email ${validatedArgs.messageId} as ${validatedArgs.read !== false ? 'read' : 'unread'}`
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to mark email as read: ${(error as Error).message}`);
    }
  }
}