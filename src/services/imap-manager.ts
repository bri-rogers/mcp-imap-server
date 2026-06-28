import Imap from 'imap';
import { simpleParser, AddressObject } from 'mailparser';
import { EventEmitter } from 'events';
import {
  IMAPConfig,
  EmailMessage,
  EmailAddress,
  EmailFolder,
  SearchCriteria,
  IMAPError,
  AuthenticationError,
  ConnectionError,
  TimeoutError
} from '../types/index.js';

export class IMAPManager extends EventEmitter {
  private connection: Imap | null = null;
  private isConnected = false;
  private isConnecting = false;
  private currentFolder: string | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;

  constructor(private config: IMAPConfig) {
    super();
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    if (this.isConnecting) {
      return new Promise((resolve, reject) => {
        this.once('ready', resolve);
        this.once('error', reject);
      });
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        this.connection = new Imap({
          user: this.config.user,
          password: this.config.password,
          host: this.config.host,
          port: this.config.port,
          tls: this.config.tls,
          authTimeout: this.config.authTimeout || 3000,
          connTimeout: this.config.connTimeout || 10000,
          keepalive: this.config.keepalive || {
            interval: 10000,
            idleInterval: 300000,
            forceNoop: false
          }
        });

        this.connectionTimeout = setTimeout(() => {
          this.cleanup();
          reject(new TimeoutError('Connection timeout'));
        }, this.config.connTimeout || 10000);

        this.connection.once('ready', () => {
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
          this.isConnected = true;
          this.isConnecting = false;
          this.emit('ready');
          resolve();
        });

        this.connection.once('error', (err: Error) => {
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
          this.isConnecting = false;
          let error: IMAPError;
          
          if (err.message.includes('auth')) {
            error = new AuthenticationError(`Authentication failed: ${err.message}`);
          } else if (err.message.includes('connect') || err.message.includes('timeout')) {
            error = new ConnectionError(`Connection failed: ${err.message}`);
          } else {
            error = new IMAPError(`IMAP error: ${err.message}`);
          }
          
          this.emit('error', error);
          reject(error);
        });

        this.connection.once('end', () => {
          this.isConnected = false;
          this.emit('end');
        });

        this.connection.connect();
      } catch (err) {
        this.isConnecting = false;
        const error = new IMAPError(`Failed to create IMAP connection: ${(err as Error).message}`);
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    if (!this.connection) {
      return;
    }

    return new Promise((resolve) => {
      this.connection!.once('end', () => {
        this.cleanup();
        resolve();
      });
      this.connection!.end();
    });
  }

  private cleanup(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.connection = null;
    this.currentFolder = null;
  }

  private async ensureConnected(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
  }

  async openFolder(folderName: string = 'INBOX', readOnly = true): Promise<void> {
    await this.ensureConnected();
    
    if (this.currentFolder === folderName) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.connection!.openBox(folderName, readOnly, (err, box) => {
        if (err) {
          reject(new IMAPError(`Failed to open folder ${folderName}: ${err.message}`));
          return;
        }
        this.currentFolder = folderName;
        resolve();
      });
    });
  }

  async getFolders(): Promise<EmailFolder[]> {
    await this.ensureConnected();

    return new Promise((resolve, reject) => {
      this.connection!.getBoxes((err, boxes) => {
        if (err) {
          reject(new IMAPError(`Failed to get folders: ${err.message}`));
          return;
        }

        const folders = this.parseBoxes(boxes);
        resolve(folders);
      });
    });
  }

  private parseBoxes(boxes: any, prefix = ''): EmailFolder[] {
    const folders: EmailFolder[] = [];
    
    for (const [name, box] of Object.entries(boxes) as [string, any][]) {
      const fullName = prefix ? `${prefix}${box.delimiter}${name}` : name;
      
      const folder: EmailFolder = {
        name,
        fullName,
        delimiter: box.delimiter,
        flags: box.attribs || [],
        specialUse: box.special_use_attrib,
        children: box.children ? this.parseBoxes(box.children, fullName) : undefined
      };
      
      folders.push(folder);
    }
    
    return folders;
  }

  async searchEmails(criteria: SearchCriteria): Promise<EmailMessage[]> {
    await this.openFolder(criteria.folder || 'INBOX');

    const searchCriteria = this.buildSearchCriteria(criteria);

    return new Promise((resolve, reject) => {
      this.connection!.search(searchCriteria, (err, results) => {
        if (err) {
          reject(new IMAPError(`Search failed: ${err.message}`));
          return;
        }

        if (results.length === 0) {
          resolve([]);
          return;
        }

        // Apply limit if specified
        const limitedResults = criteria.limit ? results.slice(0, criteria.limit) : results;

        this.fetchMessages(limitedResults)
          .then(resolve)
          .catch(reject);
      });
    });
  }

  private buildSearchCriteria(criteria: SearchCriteria): any[] {
    const searchCriteria: any[] = [];

    if (criteria.unread === true) {
      searchCriteria.push('UNSEEN');
    } else if (criteria.unread === false) {
      searchCriteria.push('SEEN');
    }

    if (criteria.sender) {
      searchCriteria.push(['FROM', criteria.sender]);
    }

    if (criteria.subject) {
      searchCriteria.push(['SUBJECT', criteria.subject]);
    }

    if (criteria.content) {
      searchCriteria.push(['TEXT', criteria.content]);
    }

    if (criteria.dateFrom) {
      searchCriteria.push(['SINCE', new Date(criteria.dateFrom)]);
    }

    if (criteria.dateTo) {
      searchCriteria.push(['BEFORE', new Date(criteria.dateTo)]);
    }

    return searchCriteria.length > 0 ? searchCriteria : ['ALL'];
  }

  async getRecentEmails(folder = 'INBOX', limit = 10, unreadOnly = false): Promise<EmailMessage[]> {
    await this.openFolder(folder);

    return new Promise((resolve, reject) => {
      const criteria = unreadOnly ? ['UNSEEN'] : ['ALL'];
      
      this.connection!.search(criteria, (err, results) => {
        if (err) {
          reject(new IMAPError(`Failed to get recent emails: ${err.message}`));
          return;
        }

        if (results.length === 0) {
          resolve([]);
          return;
        }

        // Get the most recent emails (highest UIDs)
        const recentResults = results.slice(-limit);

        this.fetchMessages(recentResults)
          .then(emails => resolve(emails.reverse())) // Reverse to show newest first
          .catch(reject);
      });
    });
  }

  async getEmail(messageId: string, folder = 'INBOX'): Promise<EmailMessage | null> {
    await this.openFolder(folder);

    return new Promise((resolve, reject) => {
      // Try to find by Message-ID header first
      this.connection!.search([['HEADER', 'MESSAGE-ID', messageId]], (err, results) => {
        if (err) {
          reject(new IMAPError(`Failed to search for email: ${err.message}`));
          return;
        }

        if (results.length === 0) {
          // Try to find by UID if Message-ID search fails
          const uid = parseInt(messageId, 10);
          if (!isNaN(uid)) {
            this.fetchMessages([uid])
              .then(emails => resolve(emails[0] || null))
              .catch(reject);
          } else {
            resolve(null);
          }
          return;
        }

        this.fetchMessages(results)
          .then(emails => resolve(emails[0] || null))
          .catch(reject);
      });
    });
  }

  async markAsRead(messageId: string, folder = 'INBOX', read = true): Promise<boolean> {
    await this.openFolder(folder, false); // Open with write access

    return new Promise((resolve, reject) => {
      const uid = parseInt(messageId, 10);
      if (isNaN(uid)) {
        reject(new IMAPError('Invalid message ID'));
        return;
      }

      const flag = read ? '\\Seen' : '';
      const action = read ? 'addFlags' : 'delFlags';

      this.connection![action](uid, flag, (err) => {
        if (err) {
          reject(new IMAPError(`Failed to mark message as ${read ? 'read' : 'unread'}: ${err.message}`));
          return;
        }
        resolve(true);
      });
    });
  }

  private extractAddresses(
    addr: AddressObject | AddressObject[] | undefined
  ): EmailAddress[] {
    if (!addr) {
      return [];
    }
    const objects = Array.isArray(addr) ? addr : [addr];
    return objects.flatMap(obj =>
      (obj.value || []).map(v => ({
        name: v.name || undefined,
        address: v.address || ''
      }))
    );
  }

  private async fetchMessages(uids: number[]): Promise<EmailMessage[]> {
    return new Promise((resolve, reject) => {
      const messages: EmailMessage[] = [];
      const fetch = this.connection!.fetch(uids, {
        bodies: '',
        struct: true
      });

      fetch.on('message', (msg, seqno) => {
        let buffer = '';
        let uid = 0;
        let flags: string[] = [];
        let size = 0;

        msg.on('body', (stream) => {
          stream.on('data', (chunk) => {
            buffer += chunk.toString();
          });
        });

        msg.once('attributes', (attrs) => {
          uid = attrs.uid;
          flags = attrs.flags;
          size = attrs.size;
        });

        msg.once('end', async () => {
          try {
            const parsed = await simpleParser(buffer);
            
            const emailMessage: EmailMessage = {
              id: uid.toString(),
              uid,
              subject: parsed.subject,
              from: this.extractAddresses(parsed.from),
              to: this.extractAddresses(parsed.to),
              cc: this.extractAddresses(parsed.cc),
              bcc: this.extractAddresses(parsed.bcc),
              date: parsed.date,
              flags,
              size,
              text: parsed.text,
              html: parsed.html || undefined,
              messageId: parsed.messageId,
              inReplyTo: parsed.inReplyTo,
              references: parsed.references
                ? (Array.isArray(parsed.references) ? parsed.references : [parsed.references])
                : undefined,
              headers: parsed.headers as any,
              attachments: parsed.attachments?.map(att => ({
                contentType: att.contentType,
                filename: att.filename,
                size: att.size,
                contentId: att.contentId,
                content: att.content
              })) || []
            };

            messages.push(emailMessage);
          } catch (err) {
            console.error('Failed to parse email:', err);
          }
        });
      });

      fetch.once('error', (err) => {
        reject(new IMAPError(`Failed to fetch messages: ${err.message}`));
      });

      fetch.once('end', () => {
        // Sort by UID to maintain order
        messages.sort((a, b) => a.uid - b.uid);
        resolve(messages);
      });
    });
  }
}