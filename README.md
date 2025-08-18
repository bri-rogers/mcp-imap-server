# MCP IMAP Server

A Model Context Protocol (MCP) server that enables Claude and other LLM applications to read emails via the IMAP protocol. This server provides secure, read-only access to email accounts from popular providers like Gmail, Outlook, Yahoo, and custom IMAP servers.

## Features

- 🔐 **Secure Authentication**: Support for username/password authentication with secure credential handling
- 📧 **Email Operations**: Search, read, and manage emails with comprehensive filtering options
- 📁 **Folder Management**: List and navigate email folders/mailboxes
- 🏷️ **Email Status**: Mark emails as read/unread
- 🔍 **Advanced Search**: Search by sender, subject, date range, content, and read status
- 🌐 **Provider Support**: Pre-configured for Gmail, Outlook, Yahoo, iCloud, and custom IMAP servers
- 🛡️ **Security First**: Read-only access, no email sending or deletion capabilities
- ⚡ **Performance**: Efficient connection pooling and error handling

## Quick Start

### Installation

```bash
git clone <repository-url>
cd mcp-imap-server
npm install
npm run build
```

### Configuration

Create a `.env` file in the project root:

```env
# Required: IMAP server configuration
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=your-email@gmail.com
IMAP_PASSWORD=your-app-password
IMAP_TLS=true

# Optional: Connection settings
IMAP_AUTH_TIMEOUT=3000
IMAP_CONN_TIMEOUT=10000
IMAP_KEEPALIVE_INTERVAL=10000
IMAP_IDLE_INTERVAL=300000
IMAP_FORCE_NOOP=false
```

### Popular Email Provider Settings

#### Gmail
```env
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_TLS=true
```

#### Outlook/Hotmail
```env
IMAP_HOST=outlook.office365.com
IMAP_PORT=993
IMAP_TLS=true
```

#### Yahoo Mail
```env
IMAP_HOST=imap.mail.yahoo.com
IMAP_PORT=993
IMAP_TLS=true
```

#### iCloud Mail
```env
IMAP_HOST=imap.mail.me.com
IMAP_PORT=993
IMAP_TLS=true
```

### Running the Server

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

## MCP Tools

The server exposes the following tools to MCP clients:

### `search_emails`
Search for emails based on various criteria.

**Parameters:**
- `sender` (optional): Filter by sender email address or name
- `subject` (optional): Filter by subject line (partial match)
- `dateFrom` (optional): Start date for date range filter (ISO format: YYYY-MM-DD)
- `dateTo` (optional): End date for date range filter (ISO format: YYYY-MM-DD)
- `content` (optional): Search within email content/body text
- `unread` (optional): Filter by read status (true for unread only, false for read only)
- `folder` (optional): Folder to search in (defaults to INBOX)
- `limit` (optional): Maximum number of emails to return (1-100)

**Example:**
```json
{
  "name": "search_emails",
  "arguments": {
    "sender": "notifications@github.com",
    "unread": true,
    "limit": 10
  }
}
```

### `get_email`
Retrieve the full content of a specific email by its message ID.

**Parameters:**
- `messageId` (required): The message ID or UID of the email to retrieve
- `folder` (optional): Folder containing the email (defaults to INBOX)

**Example:**
```json
{
  "name": "get_email",
  "arguments": {
    "messageId": "12345",
    "folder": "INBOX"
  }
}
```

### `list_folders`
List all available email folders/mailboxes in the account.

**Parameters:**
- `includeSpecial` (optional): Include special folders like Sent, Drafts, etc.

**Example:**
```json
{
  "name": "list_folders",
  "arguments": {
    "includeSpecial": true
  }
}
```

### `get_recent_emails`
Get the most recent emails from a specific folder.

**Parameters:**
- `folder` (optional): Folder to get emails from (defaults to INBOX)
- `limit` (optional): Number of recent emails to retrieve (1-50, default: 10)
- `unreadOnly` (optional): Only return unread emails

**Example:**
```json
{
  "name": "get_recent_emails",
  "arguments": {
    "folder": "INBOX",
    "limit": 5,
    "unreadOnly": true
  }
}
```

### `mark_as_read`
Mark an email as read or unread.

**Parameters:**
- `messageId` (required): The message ID or UID of the email to mark
- `folder` (optional): Folder containing the email (defaults to INBOX)
- `read` (optional): Mark as read (true) or unread (false). Default: true

**Example:**
```json
{
  "name": "mark_as_read",
  "arguments": {
    "messageId": "12345",
    "read": true
  }
}
```

## Security Considerations

### Email Provider Setup

#### Gmail
1. Enable 2-factor authentication
2. Generate an App Password (not your regular password)
3. Use the App Password as `IMAP_PASSWORD`

#### Outlook/Hotmail
1. Enable 2-factor authentication
2. Generate an App Password
3. Use the App Password as `IMAP_PASSWORD`

#### Other Providers
Consult your email provider's documentation for IMAP access and app password setup.

### Best Practices

- **Never log credentials**: The server is designed to never log sensitive information
- **Use app passwords**: Always use app-specific passwords, never your main account password
- **Read-only access**: The server only provides read operations for security
- **Secure storage**: Store credentials securely and never commit them to version control
- **Network security**: Always use TLS/SSL connections (enabled by default)

## Development

### Project Structure

```
src/
├── config/          # Configuration management
├── services/        # IMAP connection and management
├── tools/           # MCP tool implementations
├── types/           # TypeScript type definitions
└── index.ts         # Main server entry point
```

### Available Scripts

```bash
npm run build        # Build TypeScript to JavaScript
npm run dev          # Run in development mode with auto-reload
npm start            # Run the built server
npm test             # Run tests
npm run lint         # Lint the code
npm run typecheck    # Type check without building
npm run clean        # Clean build directory
```

### Adding New Tools

1. Define types in `src/types/index.ts`
2. Add Zod validation schema
3. Implement the tool logic in `src/tools/index.ts`
4. Register the tool in `src/index.ts`

## Error Handling

The server includes comprehensive error handling for:

- **Authentication failures**: Clear messages for invalid credentials
- **Connection issues**: Timeout and network error handling
- **IMAP protocol errors**: Detailed error messages for debugging
- **Validation errors**: Input validation with helpful error messages

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Verify your email and app password are correct
   - Ensure 2FA is enabled and you're using an app password
   - Check if IMAP is enabled in your email provider settings

2. **Connection Timeout**
   - Verify the IMAP host and port settings
   - Check your firewall and network settings
   - Try increasing the connection timeout values

3. **TLS/SSL Errors**
   - Ensure `IMAP_TLS=true` for secure connections
   - Verify your email provider supports the specified port with TLS

### Debug Mode

Set `NODE_ENV=development` to enable debug logging:

```bash
NODE_ENV=development npm run dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with proper tests
4. Ensure all tests pass and code is properly typed
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review your email provider's IMAP documentation
3. Open an issue on GitHub with detailed error messages and configuration (without credentials)