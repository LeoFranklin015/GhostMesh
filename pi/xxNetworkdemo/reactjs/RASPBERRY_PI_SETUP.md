# Raspberry Pi Setup Guide

This guide helps you deploy and run the xxdk React app on your Raspberry Pi.

## Prerequisites

### 1. Node.js Installation on Raspberry Pi

Raspberry Pi requires Node.js 18+ (ARM architecture). Install it:

```bash
# On your Raspberry Pi, update packages first
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x (LTS) for ARM
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v18.x.x or higher
npm --version
```

**Alternative:** Use Node Version Manager (nvm):
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

### 2. Transfer Code to Raspberry Pi

**Option A: Using SCP (from your laptop)**
```bash
# From your laptop's terminal
cd /Users/admin/Downloads/projects/pi
scp -r xxNetworkdemo/reactjs pi@<raspberry-pi-ip>:/home/pi/xxNetworkdemo/reactjs

# Example: scp -r xxNetworkdemo/reactjs pi@192.168.1.100:/home/pi/xxNetworkdemo/reactjs
```

**Option B: Using Git**
```bash
# On Raspberry Pi
cd ~
git clone <your-repo-url>
cd xxNetworkdemo/reactjs
```

**Option C: Using USB drive or network share**

### 3. Install Dependencies on Raspberry Pi

```bash
# SSH into your Raspberry Pi, then:
cd ~/xxNetworkdemo/reactjs  # or wherever you placed the code

# Install npm packages (this may take longer on Pi)
npm install

# IMPORTANT: Create the WASM symlink in public directory
cd public
ln -sf ../node_modules/xxdk-wasm xxdk-wasm
cd ..

# Verify symlink was created
ls -la public/xxdk-wasm  # Should show a symlink pointing to ../node_modules/xxdk-wasm
```

### 4. Build Configuration for Raspberry Pi

Raspberry Pi has limited memory. Adjust Next.js build settings:

**Update `next.config.mjs`:**
```javascript
const nextConfig = {
  // Reduce memory usage during build
  swcMinify: true,
  // Increase build timeout for slower hardware
  experimental: {
    // Allow longer builds on Pi
  },
  // Ensure WASM files are served correctly
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

export default nextConfig;
```

### 5. Run the Application

**Development mode:**
```bash
npm run dev
```

**Production mode (better for Pi):**
```bash
# Build first (may take 5-10 minutes on Pi)
npm run build

# Start production server
npm start
```

The app will be available at: `http://<raspberry-pi-ip>:3000`

### 6. Access from Other Devices

Make sure your Raspberry Pi's firewall allows port 3000:

```bash
# On Raspberry Pi
sudo ufw allow 3000/tcp
```

Then access from your laptop's browser:
- `http://<raspberry-pi-ip>:3000` - Client 1
- `http://<raspberry-pi-ip>:3000/client2` - Client 2

## Common Raspberry Pi Issues

### Issue 1: "DM Client not ready" Error

**Symptoms:** Client initialization never completes, shows "Waiting for client to initialize..."

**Solutions:**

1. **Clear browser storage** (most common fix):
   ```javascript
   // In browser console (F12)
   localStorage.clear();
   indexedDB.databases().then(dbs => {
       dbs.forEach(db => indexedDB.deleteDatabase(db.name));
   });
   location.reload();
   ```

2. **Check WASM files are accessible:**
   ```bash
   # On Raspberry Pi, verify symlink exists
   ls -la public/xxdk-wasm/xxdk.wasm
   
   # If missing, recreate:
   cd public
   rm -rf xxdk-wasm  # Remove broken symlink if exists
   ln -sf ../node_modules/xxdk-wasm xxdk-wasm
   ```

3. **Increase initialization timeout** (slow hardware):
   - The code already has 30s timeout, but Pi may need more
   - Check browser console for specific errors

4. **Memory limitations:**
   - Close other applications on Pi
   - Consider increasing swap space:
     ```bash
     sudo dphys-swapfile swapoff
     sudo nano /etc/dphys-swapfile
     # Change CONF_SWAPSIZE=100 to CONF_SWAPSIZE=2048
     sudo dphys-swapfile setup
     sudo dphys-swapfile swapon
     ```

### Issue 2: Build Fails Due to Memory

**Solution:** Increase swap space (see above) or build on your laptop and transfer the `.next` folder.

### Issue 3: WASM Files Not Loading (404 errors)

**Check:**
```bash
# On Raspberry Pi
cd ~/xxNetworkdemo/reactjs
ls -la public/xxdk-wasm/  # Should list .wasm files

# If missing, recreate symlink:
cd public
rm xxdk-wasm  # Remove if exists
ln -sf ../node_modules/xxdk-wasm xxdk-wasm
ls -la  # Verify symlink points correctly
```

### Issue 4: Slow Initialization on Raspberry Pi

**This is normal!** Raspberry Pi is slower. Initialization may take:
- 30-60 seconds for xxdk to load
- Additional 10-30 seconds for network connection

**What to expect:**
- Console logs should show: "✅ DM Worker Path: ..."
- Then: "DMTOKEN: ..." and "DMPUBKEY: ..."
- Finally: Client becomes ready

**Be patient** - wait at least 2 minutes before assuming it's broken.

## Debugging Checklist

When "DM Client not ready":

- [ ] Browser DevTools console open (F12)
- [ ] Check for WASM loading errors in console
- [ ] Verify `http://<pi-ip>:3000/xxdk-wasm/xxdk.wasm` is accessible (should download file)
- [ ] Clear localStorage and IndexedDB (see above)
- [ ] Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
- [ ] Wait 2+ minutes for initialization on Pi
- [ ] Check Raspberry Pi console for server errors
- [ ] Verify Node.js version: `node --version` (should be 18+)
- [ ] Check symlink exists: `ls -la public/xxdk-wasm`

## Performance Tips for Raspberry Pi

1. **Use production build** (`npm run build && npm start`) instead of dev mode
2. **Close other applications** to free memory
3. **Use wired ethernet** instead of WiFi for better network stability
4. **Monitor resources:**
   ```bash
   htop  # Monitor CPU and memory usage
   ```

## Getting Help

If still having issues, collect:

1. **Browser console output** (full log)
2. **Raspberry Pi terminal output** from `npm run dev` or `npm start`
3. **Result of:** `curl http://localhost:3000/xxdk-wasm/xxdk.wasm` (should download file)
4. **Node.js version:** `node --version`
5. **Architecture:** `uname -m` (should show `armv7l` or `aarch64`)

## Next Steps After Setup

Once working:
- Test from your laptop's browser: `http://<pi-ip>:3000`
- Share credentials between Client 1 and Client 2 for messaging
- See `TWO_USER_TESTING_GUIDE.md` for testing instructions

