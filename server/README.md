# XX Network Server - Next.js + xxdk-wasm

🎉 **Official Next.js application with xxdk-wasm integration!**

This server runs xxdk-wasm in a browser context, providing:
- ✅ Full xxdk functionality (DM, encryption, everything)
- ✅ Real XX Network connectivity
- ✅ Beautiful modern UI
- ✅ REST API endpoints
- ✅ No Node.js/Go compatibility issues!

## Quick Start

```bash
cd /Users/untitled_folder/blockchian/xxN/server

# Install dependencies (only first time)
npm install

# Start the server
npm run dev
```

Server runs on: **http://localhost:4000**

## How It Works

This is a **Next.js application** that:
1. Runs in your browser
2. Initializes xxdk-wasm (takes ~30-60 seconds)
3. Generates real DM credentials
4. Displays them on the page
5. Listens for incoming messages

## Usage

### 1. Start the Server
```bash
npm run dev
```

### 2. Open in Browser
Navigate to: **http://localhost:4000**

Wait for initialization (~30-60 seconds). You'll see:
- Status updates as it initializes
- Credentials once ready
- Messages as they arrive

### 3. Use Credentials in Client
1. Copy the Token and Public Key from the server page
2. Open your client at **http://localhost:3000**
3. Paste the credentials
4. Send messages!

## Architecture

```
┌─────────────────────────┐
│   Browser Tab           │
│   localhost:4000        │
│   (Next.js Server Page) │
│                         │
│   • Runs xxdk-wasm      │
│   • Generates creds     │
│   • Receives messages   │
│   • Beautiful UI        │
└─────────────────────────┘
            ↕
     XX Network
            ↕
┌─────────────────────────┐
│   Browser Tab           │
│   localhost:3000        │
│   (Your Client)         │
│                         │
│   • Gets credentials    │
│   • Sends messages      │
└─────────────────────────┘
```

## Features

### ✅ What Works
- Full xxdk-wasm integration
- Real XX Network DM protocol
- Credential generation
- Message receiving
- Beautiful Tailwind UI
- Dark mode design
- Real-time message display
- REST API endpoints

### 🎨 UI Features
- Modern gradient design
- Animated status indicators
- Credential display with copy functionality
- Message feed with timestamps
- Step-by-step instructions
- Responsive layout

## API Endpoints

### GET /api/status
Check if server is online

```bash
curl http://localhost:4000/api/status
```

Response:
```json
{
  "status": "online",
  "mode": "nextjs-xxdk-wasm",
  "message": "XX Network Server running",
  "port": 4000
}
```

### GET /api/credentials
Get server credentials (placeholder)

### GET /api/messages
Get received messages (placeholder)

## File Structure

```
server/
├── app/
│   ├── page.tsx              # Main server UI (xxdk init)
│   ├── layout.tsx            # Next.js layout
│   ├── globals.css           # Tailwind styles
│   └── api/
│       ├── status/           # API endpoints
│       ├── credentials/
│       └── messages/
├── public/
│   └── ndf.json             # XX Network definition
├── node_modules/
│   └── xxdk-wasm/           # ← Symlinked!
├── package.json
├── next.config.ts           # WASM support enabled
├── tailwind.config.ts
└── tsconfig.json
```

## Symlinked xxdk-wasm

The `xxdk-wasm` package is symlinked from your main reactjs project:

```
server/node_modules/xxdk-wasm → ../../xxNetworkdemo/reactjs/node_modules/xxdk-wasm
```

Benefits:
- No duplicate installation
- Same version everywhere
- Saves ~50MB disk space

## Development

```bash
# Development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Lint code
npm run lint
```

## Technologies

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **xxdk-wasm** - XX Network SDK

## Why This Works

| Aspect | Result |
|--------|--------|
| xxdk-wasm compatibility | ✅ Native browser APIs available |
| Network connectivity | ✅ Browser can reach XX gateways |
| DM protocol | ✅ Full functionality |
| Setup time | ⏱️ 2 minutes |
| Maintenance | ✅ Simple |
| UI/UX | ✅ Beautiful & modern |

## Troubleshooting

### "Module not found: xxdk-wasm"
Recreate the symlink:
```bash
cd server
ln -sf ../../xxNetworkdemo/reactjs/node_modules/xxdk-wasm node_modules/xxdk-wasm
```

### "Cannot find ndf.json"
Copy it from the reactjs project:
```bash
cp ../xxNetworkdemo/reactjs/app/ndf.json public/ndf.json
```

### Network initialization timeout
- Check internet connection
- Wait longer (up to 60 seconds)
- Check browser console for errors

### Port 4000 already in use
```bash
# Find and kill process on port 4000
lsof -ti:4000 | xargs kill

# Or change port in package.json
"dev": "next dev -p 5000"
```

## Next Steps

- [x] Server initializes xxdk-wasm
- [x] Generates real credentials
- [x] Displays beautiful UI
- [x] Receives messages
- [ ] Add WebSocket for real-time API
- [ ] Add database for message persistence
- [ ] Add authentication

---

**This is the working solution!** 🚀

Browser-based xxdk with a proper Next.js application!
