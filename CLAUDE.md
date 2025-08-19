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

# Run tests (all tests)
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Lint the code
npm run lint

# Lint and fix issues automatically
npm run lint:fix

# Type check without building
npm run typecheck

# Clean build directory
npm run clean

# Run MCP Inspector for debugging
npm run inspector
```

## Architecture

The codebase follows a clean, modular architecture with clear separation of concerns:

### Core Components

1. **MCPIMAPServer** (`src/index.ts`): Main server class that orchestrates MCP protocol handling and IMAP operations. Acts as the entry point and coordinates between MCP SDK and IMAP functionality.

2. **IMAPManager** (`src/services/imap-manager.ts`): Handles all IMAP connections, authentication, and low-level email operations. Extends EventEmitter for connection state management. Implements connection pooling, automatic reconnection, and comprehensive error handling.

3. **EmailTools** (`src/tools/index.ts`): Implements the MCP tools interface, translating MCP requests to IMAP operations. Validates input using Zod schemas and formats responses for MCP clients.

4. **Configuration** (`src/config/index.ts`): Environment-based configuration with predefined settings for popular email providers. Validates required environment variables and provides sensible defaults.

5. **Types** (`src/types/index.ts`): Comprehensive TypeScript definitions and Zod validation schemas. Includes custom error classes (IMAPError, AuthenticationError, ConnectionError, TimeoutError).

### MCP Tools Exposed

- `search_emails`: Search emails by sender, subject, date range, content, or read status
- `get_email`: Retrieve full content of specific email by message ID
- `list_folders`: List all available email folders/mailboxes
- `get_recent_emails`: Get most recent emails from a folder
- `mark_as_read`: Mark emails as read/unread

### Key Technical Details

- Uses the `imap` library for IMAP protocol communication
- Uses `mailparser` for parsing email content and attachments
- Implements connection pooling and automatic reconnection via EventEmitter pattern
- All operations are read-only by default for security
- Comprehensive error handling with custom error types
- Zod schemas for input validation and type safety
- MCP SDK integration with proper request/response handling
- Graceful shutdown handling with SIGINT/SIGTERM listeners

### Data Flow

1. MCP client sends tool request to server
2. MCPIMAPServer routes request to appropriate EmailTools method
3. EmailTools validates input with Zod schemas
4. IMAPManager executes IMAP operations
5. Response is formatted and returned to MCP client

### Environment Configuration

The server requires these environment variables:
- `IMAP_HOST`, `IMAP_USER`, `IMAP_PASSWORD` (required)
- Optional: `IMAP_PORT` (default: 993), `IMAP_TLS` (default: true)
- Optional timeout settings: `IMAP_AUTH_TIMEOUT`, `IMAP_CONN_TIMEOUT`
- Optional keepalive settings: `IMAP_KEEPALIVE_INTERVAL`, `IMAP_IDLE_INTERVAL`, `IMAP_FORCE_NOOP`

Pre-configured providers available in `PROVIDER_CONFIGS` (Gmail, Outlook, Yahoo, iCloud) in `src/config/index.ts`.

### Testing Strategy

Tests use Jest with TypeScript support and ESM modules. The test suite is organized into two categories:

**Unit Tests** (`tests/unit/`):
- Mock IMAP connections using `tests/mocks/imap-mock.ts`
- Test individual components in isolation
- Validate Zod schema behavior and error handling
- Run with: `npm run test:unit`

**Integration Tests** (`tests/integration/`):
- Test full MCP server functionality with real IMAP connections
- Require actual email credentials via environment variables
- Test end-to-end MCP protocol compliance
- Extended 60-second timeout for network operations
- Run with: `npm run test:integration`

When writing tests:
- Use the existing mock patterns in `tests/mocks/`
- Follow the Jest project setup with separate unit/integration configurations
- Test error scenarios extensively with custom error types
- Ensure all async operations handle timeouts properly

### Debugging and Development Tools

**MCP Inspector**: Use `npm run inspector` to debug MCP protocol interactions:
- Automatically builds the project and validates environment
- Launches the MCP Inspector web interface at `http://localhost:5173`
- The `scripts/mcp-inspector.sh` script handles setup and credential validation
- Provides interactive testing of all MCP tools with real IMAP connections

**Environment Setup**: 
- Copy `.env.example` to `.env` and configure IMAP credentials
- The inspector script validates required environment variables before starting
- Use app passwords (not regular passwords) for email providers that support 2FA

## Security Considerations

- Read-only access: No email sending or deletion capabilities
- Credentials never logged or exposed
- Always use TLS/SSL connections by default
- Input validation via Zod schemas prevents injection attacks
- Proper connection cleanup and timeout handling
- Custom error types avoid exposing sensitive information