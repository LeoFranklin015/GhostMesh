# 🚀 Two-User Communication Testing Guide

## ⚠️ **CRITICAL: Browser Storage Conflict**

**DO NOT open two tabs of the same URL in the same browser!**

### Why?
- Both tabs share the **same `localStorage`** → Same identity
- Both tabs share the **same IndexedDB** → Same state
- **Result**: You're testing with **ONE user, not TWO users**

---

## ✅ **Correct Setup Options**

Choose **ONE** of these methods:

### Option 1: Two Different Browsers (RECOMMENDED)
```
Browser 1 (Chrome):   http://localhost:3000/
Browser 2 (Firefox):  http://localhost:3000/
```
✅ Completely isolated storage  
✅ True peer-to-peer testing

### Option 2: Normal + Incognito Window
```
Normal Window:    http://localhost:3000/
Incognito Window: http://localhost:3000/
```
✅ Same browser, isolated storage  
✅ Good for quick testing

### Option 3: Different Routes (if using client2)
```
Browser Tab 1: http://localhost:3000/        (Client 1)
Browser Tab 2: http://localhost:3000/client2  (Client 2)
```
✅ Different storage keys (`MyDMID` vs `MyDMID_client2`)  
✅ Can be in the same browser

---

## 📋 **Step-by-Step Testing**

### 1. Start the Server
```bash
cd /Users/untitled_folder/blockchian/xxN/xxNetworkdemo/reactjs
npm run dev
```

### 2. Clear Browser Storage (Both Browsers/Windows)
Open browser console (F12) and run:
```javascript
localStorage.clear();
indexedDB.databases().then(dbs => {
    dbs.forEach(db => indexedDB.deleteDatabase(db.name));
});
location.reload();
```

### 3. Open Client 1
- **Browser 1**: Navigate to `http://localhost:3000/`
- Wait for initialization (10-30 seconds)
- Look for: `✅ Exported Codename Blob: ...`
- Copy the **Token** and **Public Key** from the UI

### 4. Open Client 2
- **Browser 2** (or Incognito): Navigate to `http://localhost:3000/`
- Wait for initialization (10-30 seconds)
- Copy the **Token** and **Public Key** from the UI

### 5. Exchange Credentials

#### From Client 1 to Client 2:
1. In **Client 2**, paste **Client 1's Token** and **Public Key**
2. Type a message: "Hello from Client 2!"
3. Click **Send Message**

#### From Client 2 to Client 1:
1. In **Client 1**, paste **Client 2's Token** and **Public Key**
2. Type a message: "Hello from Client 1!"
3. Click **Send Message**

### 6. Check for Success
- Each client should receive the message in the "📥 RECEIVED MESSAGES" section
- Console should show: `✅ Message sent successfully`
- If you see decrypted messages, it worked! 🎉

---

## 🐛 **Common Issues**

### Issue 1: Same Identity in Both Tabs
**Symptom**: Both tabs show the same Token and Public Key  
**Cause**: Using the same browser with the same URL  
**Fix**: Use Option 1 or Option 2 above

### Issue 2: "Go program has already exited"
**Symptom**: Crashes after trying to send a message  
**Cause**: Code bug (now fixed)  
**Fix**: Refresh both pages after pulling the latest code

### Issue 3: "Cannot read properties of undefined"
**Symptom**: Error when sending message  
**Cause**: Client not fully initialized  
**Fix**: Wait for the credentials to appear before sending

### Issue 4: Network Errors
**Symptom**: Failed to fetch from gateways  
**Cause**: xx Network nodes might be temporarily down  
**Fix**: Wait and retry; the client will try multiple gateways

---

## 📊 **What to Expect**

### Initialization (10-30 seconds):
```
INFO: Register: Requesting client key from gateway...
INFO: Successfully connected to [gateway]
Exported Codename Blob: [base64 string]
DMTOKEN: [token string]
DMPUBKEY: [base64 string]
```

### Sending a Message:
```
✅ Message sent successfully: [send report]
```

### Receiving a Message:
```
onDmEvent called -> EventType: X, data: [message data]
XXDB Lookup!!!!
Decrypted Message: [your message text]
```

---

## 🎯 **Success Checklist**

- [ ] Two separate browsers/windows open
- [ ] Both clients show **different** credentials
- [ ] Both clients initialized successfully
- [ ] Credentials exchanged correctly
- [ ] Message sent from Client 1 → Client 2
- [ ] Message sent from Client 2 → Client 1
- [ ] Both messages received and decrypted
- [ ] No crashes or errors

---

## 💡 **Pro Tips**

1. **Use Console Logs**: Keep the browser console open to see real-time updates
2. **Wait for Initialization**: Don't send messages until you see the credentials
3. **Copy Carefully**: Make sure you copy the ENTIRE Token and Public Key (they're long!)
4. **Test Multiple Times**: The network can be slow; try sending 2-3 messages
5. **Check Received Section**: Scroll down to see the "📥 RECEIVED MESSAGES" area

---

## 🆘 **Still Having Issues?**

If you're still stuck, provide these details:
1. Which browser(s) are you using?
2. What do you see in the browser console?
3. Did both clients initialize successfully?
4. Are the credentials different between the two clients?
5. What error message appears when you try to send?

---

**Last Updated**: November 14, 2025  
**Code Version**: Fixed `Buffer.from("")` → `new Uint8Array(0)` bug


