# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server implementation for IMAP email functionality. The server enables LLM applications to read emails via the IMAP protocol with secure, read-only access to email accounts from popular providers like Gmail, Outlook, Yahoo, and custom IMAP servers.

## Development Commands

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode with auto-reload
npm run dev

# Start the built server
npm start

# Run tests
npm test

# Lint the code
npm run lint

# Type check without building
npm run typecheck

# Clean build directory
npm run clean
```

## Architecture

The codebase follows a clean, modular architecture:

### Core Components

1. **MCPIMAPServer** (`src/index.ts`): Main server class that orchestrates MCP protocol handling and IMAP operations
2. **IMAPManager** (`src/services/imap-manager.ts`): Handles all IMAP connections, authentication, and low-level email operations
3. **EmailTools** (`src/tools/index.ts`): Implements the MCP tools interface, translating MCP requests to IMAP operations
4. **Configuration** (`src/config/index.ts`): Environment-based configuration with predefined settings for popular email providers
5. **Types** (`src/types/index.ts`): TypeScript definitions and Zod validation schemas

### MCP Tools Exposed

- `search_emails`: Search emails by sender, subject, date range, content, or read status
- `get_email`: Retrieve full content of specific email by message ID
- `list_folders`: List all available email folders/mailboxes
- `get_recent_emails`: Get most recent emails from a folder
- `mark_as_read`: Mark emails as read/unread

### Key Technical Details

- Uses the `imap` library for IMAP protocol communication
- Uses `mailparser` for parsing email content and attachments
- Implements connection pooling and automatic reconnection
- All operations are read-only by default for security
- Comprehensive error handling with custom error types (AuthenticationError, ConnectionError, TimeoutError)
- Zod schemas for input validation and type safety

### Environment Configuration

The server requires these environment variables:
- `IMAP_HOST`, `IMAP_USER`, `IMAP_PASSWORD` (required)
- Optional: `IMAP_PORT`, `IMAP_TLS`, timeout and keepalive settings

Pre-configured providers available in `PROVIDER_CONFIGS` (Gmail, Outlook, Yahoo, iCloud).

## Security Considerations

- Read-only access: No email sending or deletion capabilities
- Credentials never logged or exposed
- Always use TLS/SSL connections
- Input validation via Zod schemas
- Proper connection cleanup and timeout handling