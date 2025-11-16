# Troubleshooting xxDK Client Initialization

## Problem: "Not Getting Initialized"

If the client shows "⏳ Waiting for client to initialize..." indefinitely, try these fixes:

### **Solution 1: Clear Browser Storage** ⭐ (Most Common Fix)

The localStorage and IndexedDB might have corrupted state from previous runs.

**Steps:**
1. Open browser DevTools (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. In the left sidebar:
   - Click **Local Storage** → Select your site → Click "Clear All"
   - Click **IndexedDB** → Delete all databases (should see entries like `_speakeasy_dm`)
4. **Hard refresh** the page: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
5. Check console for initialization logs

**Quick way (Console):**
```javascript
// Run this in browser console to clear everything
localStorage.clear();
indexedDB.databases().then(dbs => {
    dbs.forEach(db => indexedDB.deleteDatabase(db.name));
});
location.reload();
```

---

### **Solution 2: Check Browser Console**

Look for specific error messages:

**Good initialization logs should show:**
```
✅ DM Worker Path: ...
✅ DMTOKEN: ...
✅ DMPUBKEY: ...
```

**Common errors:**
- **"Failed to fetch WASM"** → WASM files not accessible (see Solution 3)
- **"QuotaExceededError"** → Clear storage (Solution 1)
- **Network/NDF errors** → Check ndf.json and network connection

---

### **Solution 3: Verify WASM Files**

Check if WASM files are accessible:

**In browser, visit:**
- `http://localhost:3000/xxdk-wasm/xxdk.wasm` (should download or show file)

**If 404 error:**
```bash
cd /Users/untitled_folder/blockchian/xxN/xxNetworkdemo/reactjs
ls -la public/xxdk-wasm  # Should show symlink or actual files

# If missing, recreate symlink:
cd public
ln -sf ../node_modules/xxdk-wasm xxdk-wasm
cd ..
```

---

### **Solution 4: Restart Dev Server**

Sometimes Next.js needs a clean restart:

```bash
# Stop current server (Ctrl+C)
rm -rf .next  # Clear Next.js cache
npm run dev
```

---

### **Solution 5: Check for Port Conflicts**

If running multiple servers caused issues:

```bash
# Kill any processes on port 3000
lsof -ti:3000 | xargs kill -9
# Then restart
npm run dev
```

---

### **Solution 6: Verify Two-Client Setup**

Remember: **Run ONE server, access via TWO routes:**

```bash
# Start server:
npm run dev

# Then open TWO browser windows:
# Window 1: http://localhost:3000/
# Window 2: http://localhost:3000/client2
```

**❌ DON'T run two separate servers on different ports**

---

## **Debugging Checklist:**

- [ ] Browser DevTools console open to see logs
- [ ] LocalStorage cleared
- [ ] IndexedDB cleared
- [ ] Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
- [ ] WASM files accessible at `/xxdk-wasm/xxdk.wasm`
- [ ] Server running on port 3000
- [ ] No other processes using port 3000
- [ ] Using correct URLs (`/` and `/client2`, not separate ports)

---

## **Still Not Working?**

**Share these details:**
1. Full browser console output (errors and logs)
2. Result of visiting `http://localhost:3000/xxdk-wasm/xxdk.wasm`
3. Output of `ls -la public/` in your terminal
4. Which browser and version you're using



