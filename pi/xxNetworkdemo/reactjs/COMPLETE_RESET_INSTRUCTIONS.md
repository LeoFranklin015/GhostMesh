# 🔥 COMPLETE RESET INSTRUCTIONS - FOLLOW EXACTLY

## ✅ Server is Ready!

The dev server has been **completely reset** and is running fresh on port 3000.

---

## 🌐 CRITICAL: Browser Cache Reset (DO THIS FIRST!)

You **MUST** clear your browser cache completely. The old broken code is cached.

### For Chrome:

1. **Close ALL tabs** with `localhost:3000`
2. Open Chrome Settings (⋮ → Settings)
3. Go to **Privacy and Security** → **Clear browsing data**
4. Select **"All time"** as the time range
5. Check ONLY these boxes:
   - ✅ **Cached images and files**
   - ✅ **Cookies and other site data**
6. Click **"Clear data"**
7. **Completely close and reopen Chrome**

### For Firefox:

1. **Close ALL tabs** with `localhost:3000`
2. Open Firefox Settings (☰ → Settings)
3. Go to **Privacy & Security**
4. Scroll to **Cookies and Site Data**
5. Click **"Clear Data"**
6. Check both boxes and click **"Clear"**
7. **Completely close and reopen Firefox**

### For Safari:

1. **Close ALL tabs** with `localhost:3000`
2. Safari → **Preferences** → **Privacy**
3. Click **"Manage Website Data"**
4. Click **"Remove All"**
5. **Completely close and reopen Safari**

---

## 📱 CORRECT TWO-USER SETUP

**❌ WRONG**: Two tabs in the same browser  
**✅ CORRECT**: Two DIFFERENT browsers or Incognito

### Option 1: Two Different Browsers (BEST)

```
Browser 1 (Chrome):   http://localhost:3000/
Browser 2 (Firefox):  http://localhost:3000/
```

### Option 2: Normal + Incognito (Same Browser)

```
Normal Window:    http://localhost:3000/
Incognito Window: http://localhost:3000/
```

---

## 📋 Step-by-Step Testing Procedure

### 🟢 STEP 1: Open First Browser (Chrome)

1. Open **Google Chrome** (after clearing cache!)
2. Navigate to: `http://localhost:3000/`
3. **WAIT 30-60 seconds** for initialization
4. Watch the browser console (F12) for these logs:
   ```
   ✅ Exported Codename Blob: [long base64 string]
   ✅ DMTOKEN: [token string]
   ✅ DMPUBKEY: [long base64 string]
   ```
5. You should see the **"📋 MY CREDENTIALS"** section in the UI
6. **COPY BOTH**: Token and Public Key somewhere (Notepad, TextEdit, etc.)

### 🔵 STEP 2: Open Second Browser (Firefox)

1. Open **Firefox** (after clearing cache!)
2. Navigate to: `http://localhost:3000/`
3. **WAIT 30-60 seconds** for initialization
4. Watch console for the same initialization logs
5. **VERIFY**: The Token and Public Key are **DIFFERENT** from Chrome
6. **COPY BOTH**: Firefox's Token and Public Key

### 📤 STEP 3: Send Message from Firefox to Chrome

1. In **Firefox browser**:
   - Paste **Chrome's Token** in the "Recipient's Token" field
   - Paste **Chrome's Public Key** in the "Recipient's Public Key" field
   - Type message: "Hello from Firefox!"
   - Click **"Send Message"**

2. Watch Firefox console for:
   ```
   ✅ Message sent successfully: [send report]
   ```

3. **If you see this error, YOU STILL HAVE OLD CODE CACHED**:
   ```
   ❌ panic: syscall/js: call of Value.Int on string
   ```
   → Go back and clear cache again!

### 📥 STEP 4: Check Chrome for Received Message

1. In **Chrome browser**:
   - Scroll down to **"📥 RECEIVED MESSAGES"** section
   - You should see:
     ```
     Decrypted Message: Hello from Firefox!
     ```

### 📤 STEP 5: Send Message from Chrome to Firefox

1. In **Chrome browser**:
   - Paste **Firefox's Token** and **Public Key**
   - Type message: "Hello from Chrome!"
   - Click **"Send Message"**

2. Check **Firefox** for the received message

---

## ✅ Success Indicators

You'll know it's working when:

1. **NO MORE "panic: syscall/js: call of Value.Int on string" error**
2. Console shows: `✅ Message sent successfully`
3. Receiving browser shows: `Decrypted Message: [your text]`
4. **No crashes or "Go program has already exited"**

---

## 🐛 If Still Getting Errors

### Error: "panic: syscall/js: call of Value.Int on string"

**Cause**: Old code is still cached in your browser  
**Fix**: 
1. Close the browser COMPLETELY (quit the application)
2. Delete browser cache again (see instructions above)
3. Reopen browser to a NEW tab
4. Navigate to `http://localhost:3000/`

### Error: "Go program has already exited"

**Cause**: WASM crashed and page needs refresh  
**Fix**: 
1. Close the tab
2. Open a NEW tab
3. Navigate to `http://localhost:3000/`

### Same Token/PubKey in Both Browsers

**Cause**: You're using two tabs in the same browser  
**Fix**: Use two DIFFERENT browsers or Normal + Incognito

---

## 🎯 Quick Verification Checklist

Before sending a message, verify:

- [ ] Dev server is running on port 3000
- [ ] Browser cache was completely cleared
- [ ] Using two DIFFERENT browsers (or Normal + Incognito)
- [ ] Both clients show **DIFFERENT** credentials
- [ ] Both clients initialized successfully (credentials visible)
- [ ] Console shows NO "panic" errors
- [ ] Waited at least 30 seconds after page load

---

## 💡 What Changed (Technical)

The bug was in line 262 of `xxdk.tsx`:

```typescript
// ❌ BEFORE (BROKEN):
await dm.SendText(pubkeyBytes, recipientToken, msg, 0, Buffer.from(""))
                                                      ↑ Wrong type!

// ✅ AFTER (FIXED):
await dm.SendText(
    pubkeyBytes,
    recipientToken,
    msg,
    0,
    new Uint8Array(0)  // ← Fixed! Correct type
)
```

The WASM code expected a `Uint8Array` but was receiving a `Buffer`, causing a type mismatch panic.

---

**REMEMBER**: The fix is in the code, but your browser has the old version cached. You MUST clear cache completely!

**Last Updated**: November 14, 2025  
**Server Status**: ✅ Running on port 3000 with fresh build


