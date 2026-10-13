# illustrator-mcp-for-win32

An MCP server for Adobe Illustrator.
It supports text, image, and path manipulation and information retrieval.
This build supports only Windows (`win32/amd64`).

## Requirements

- Windows 10 or 11 (`amd64`)
- Adobe Illustrator (installed locally)
- Node.js 18+
- PowerShell (available by default on Windows)

## Usage

Add the following to your MCP client configuration file.

```json
{
  "mcpServers": {
    "illustrator": {
      "command": "node",
      "args": [
        "C:\\\\path\\\\to\\\\illustrator-mcp-for-win32\\\\build\\\\index.js"
      ]
    }
  }
}
```

## Development

```bash
npm install
npm run build
npm test
```
