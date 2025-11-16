# 🚀 Quick Start - Two Client Communication

## The Problem You Had

You tried running two servers on different ports (3000 and 3001), but **both servers were serving the same root page**! The `/client2` route only works on the **same server**.

## ✅ SOLUTION: Use One Server, Two Routes

### 1. Start the Development Server

```bash
npm run dev
```

### 2. Open Two Browser Windows/Tabs

**Browser Window/Tab 1:**
```
http://localhost:3000/
```
👆 This is CLIENT 1 (green)

**Browser Window/Tab 2:** 
```
http://localhost:3000/client2
```
👆 This is CLIENT 2 (blue/purple)

### 3. Wait for Both to Load

Watch the browser console. You'll see:
- Client 1: `DMTOKEN: ...` and `DMPUBKEY: ...`
- Client 2: `🔵 CLIENT 2 - DMTOKEN: ...` and `🔵 CLIENT 2 - DMPUBKEY: ...`

### 4. Exchange Credentials

Each client page displays their credentials in a colored box:
- **CLIENT 1**: Blue box with token and public key
- **CLIENT 2**: Purple box with token and public key

**Copy Client 2's credentials** (from http://localhost:3000/client2)
**Paste into Client 1's input fields** (at http://localhost:3000/)

**Copy Client 1's credentials** (from http://localhost:3000/)
**Paste into Client 2's input fields** (at http://localhost:3000/client2)

### 5. Send Messages!

Type a message and click "Send Message". The message will appear in the recipient's "Received Messages" section!

---

## 🔧 Why This Works

- **Different localStorage**: Each client uses different keys (`MyDMID` vs `MyDMID_client2`)
- **Different identities**: Each generates a unique DM identity
- **Same network**: Both connect to the xx Network and can message each other
- **Same WASM files**: Both access `/public/xxdk-wasm` from the same server

---

## 🐛 Troubleshooting

### "WebAssembly compile error"
- Make sure you have the symlink: `cd public && ln -s ../node_modules/xxdk-wasm xxdk-wasm`
- The `public/xxdk-wasm` folder should exist

### "DM Client not ready yet!"
- Wait longer - initialization takes 10-30 seconds
- Check browser console for errors

### localStorage conflicts
- If you see issues, clear your browser's localStorage:
  ```javascript
  // In browser console:
  localStorage.clear()
  ```
- Then refresh both pages

### Messages not arriving
- Make sure you copied **BOTH** token **AND** public key
- Check that both clients show "connected to network" in console
- Wait up to 30 seconds for messages to propagate through the network

---

## ✨ You're All Set!

Now you can test **real peer-to-peer messaging** on the xx Network between two different users (simulated on one machine)!

For more details, see [TWO_CLIENT_SETUP.md](./TWO_CLIENT_SETUP.md)



