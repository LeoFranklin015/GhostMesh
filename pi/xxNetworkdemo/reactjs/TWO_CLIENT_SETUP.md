# Two-Client Communication Setup Guide

This guide explains how to set up and test communication between two different users on the xx Network.

## 🎯 Overview

The application has been modified to enable **true peer-to-peer communication** between two separate clients:
- **CLIENT 1**: Runs on port 3000 (using `/app/page.tsx` and `/app/xxdk.tsx`)
- **CLIENT 2**: Runs on port 3001 (using `/app/client2/page.tsx` and `/app/client2/xxdk2.tsx`)

## 🔧 Key Changes Made

### 1. **Separate localStorage Keys**
Each client now uses different localStorage keys to avoid conflicts:
- Client 1: `cMixInitialized`, `MyDMID`, statePath: `"xx"`
- Client 2: `cMixInitialized_client2`, `MyDMID_client2`, statePath: `"xx_client2"`

### 2. **Updated Send Function**
The `XXDMSend()` function now accepts recipient credentials:
```typescript
XXDMSend(dm, message, recipientPubKey, recipientToken)
```

### 3. **New UI Components**
- **XXMyCredentials**: Displays your token and public key (to share with others)
- **XXMsgSender**: Now includes input fields for recipient's credentials

## 📋 Step-by-Step Instructions

### Step 1: Start the Server

**In Terminal:**
```bash
npm run dev
# or
yarn dev
```

### Step 2: Open Both Clients in Browser

Open **TWO separate browser windows/tabs** (or use incognito mode for one):

- **Client 1**: http://localhost:3000/
- **Client 2**: http://localhost:3000/client2

> 💡 **Note**: Both clients run on the **same server** but on **different routes**. This is perfect for testing on one machine!

### Step 3: Wait for Initialization

Both clients will:
1. Initialize the xxdk WASM library
2. Generate unique DM identities
3. Log their credentials in the browser console

**Console logs to watch for:**
- Client 1: `DMTOKEN: ...` and `DMPUBKEY: ...`
- Client 2: `🔵 CLIENT 2 - DMTOKEN: ...` and `🔵 CLIENT 2 - DMPUBKEY: ...`

### Step 4: Exchange Credentials

#### On Client 1 Page:
You'll see a blue box titled **"📋 MY CREDENTIALS"** with:
- My Token
- My Public Key

**Copy both values.**

#### On Client 2 Page:
You'll see a purple box titled **"🔵 CLIENT 2 - MY CREDENTIALS"** with:
- My Token  
- My Public Key

**Copy both values.**

### Step 5: Send Messages

#### To send from Client 1 → Client 2:
1. On Client 1 page, paste Client 2's credentials into the input fields:
   - "Recipient's Token" ← paste Client 2's token
   - "Recipient's Public Key" ← paste Client 2's public key
2. Type your message
3. Click "Send Message"

#### To send from Client 2 → Client 1:
1. On Client 2 page, paste Client 1's credentials into the input fields:
   - "Recipient's Token (from Client 1)" ← paste Client 1's token
   - "Recipient's Public Key (from Client 1)" ← paste Client 1's public key
2. Type your message
3. Click "Send Message to Client 1"

### Step 6: Verify Message Receipt

Messages will appear in the **"📥 Received Messages"** section on the recipient's page.

You should see:
1. The raw event data
2. "Decrypted Message: [your message]"

## 🔍 Debugging

### Check Browser Console
Both clients log important information:

**Client 1 logs:**
- `DMTOKEN: ...`
- `DMPUBKEY: ...`
- `✅ Message sent successfully: ...`
- `onDmEvent called -> EventType: ...`

**Client 2 logs:**
- `🔵 CLIENT 2 - DMTOKEN: ...`
- `🔵 CLIENT 2 - DMPUBKEY: ...`
- `🔵 CLIENT 2 - ✅ Message sent successfully: ...`
- `onDmEvent called -> EventType: ...`

### Common Issues

1. **"DM Client not ready yet!"**
   - Wait for the client to fully initialize (watch console for token/pubkey logs)

2. **"Please enter recipient's public key and token!"**
   - Make sure you've pasted BOTH the token AND public key from the other client

3. **Messages not appearing**
   - Verify both clients have connected to the network (console should show network status)
   - Make sure you're using the correct recipient credentials
   - Check that both clients are using different localStorage keys

4. **Can't test on same machine**
   - Both clients can run on the same machine using different ports
   - They will have separate identities due to different localStorage keys
   - Use different browser profiles/incognito windows if you encounter conflicts

## 🌐 Option 2: Running on Separate Ports (Different Machines)

If you need to run on **truly separate servers** (e.g., different machines or ports):

### Copy the Entire Project

```bash
# In the parent directory of xxNetworkdemo
cp -r xxNetworkdemo xxNetworkdemo-client2
```

### Modify Client 2 Copy
1. In `xxNetworkdemo-client2/reactjs/app/page.tsx`, import from `xxdk2.tsx` instead of `xxdk.tsx`
2. Use the client2 version of the code
3. Run on port 3001:
```bash
cd xxNetworkdemo-client2/reactjs
npm run dev -- -p 3001
```

### Now you can access:
- **Client 1**: http://localhost:3000/ (original project)
- **Client 2**: http://localhost:3001/ (copied project)

---

## 🌐 Testing on Different Physical Devices

To test on actual different devices:

1. **Deploy both clients** or use network tunneling (e.g., ngrok)
2. Each device accesses its own client URL
3. Follow the same credential exchange process
4. Send messages between devices

## 📝 Technical Notes

### Identity Generation
- Each client generates a unique DM identity using `GenerateChannelIdentity()`
- The identity is stored in localStorage and persists across sessions
- Public key and token are derived from this identity

### Message Flow
```
Client 1 → dm.SendText(client2PubKey, client2Token, msg)
         → xx Network
         → Client 2 receives via onDmEvent callback
         → IndexedDB lookup
         → Decrypt message
         → Display in UI
```

### Database
- Each client maintains its own IndexedDB database
- Database name is based on the client's public key
- Messages are encrypted using DatabaseCipher with password "MessageStoragePassword"

## ✅ Success Indicators

You'll know it's working when:
1. ✅ Both pages show their credentials (token + public key)
2. ✅ Sending a message shows "✅ Message sent successfully" in console
3. ✅ Recipient sees the message appear in their "Received Messages" section
4. ✅ Decrypted message content is visible

