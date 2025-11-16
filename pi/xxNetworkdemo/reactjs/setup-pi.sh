#!/bin/bash

# Raspberry Pi Setup Script for xxdk React App
# This script sets up the project on Raspberry Pi

set -e  # Exit on error

echo "🍓 Raspberry Pi Setup Script for xxdk React App"
echo "================================================"
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node --version 2>/dev/null || echo "not installed")
if [ "$NODE_VERSION" = "not installed" ]; then
    echo "❌ Node.js is not installed!"
    echo ""
    echo "Please install Node.js 18+ first:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
    echo "  sudo apt install -y nodejs"
    exit 1
fi

echo "✅ Node.js version: $NODE_VERSION"
echo ""

# Check npm version
echo "📦 Checking npm version..."
NPM_VERSION=$(npm --version 2>/dev/null || echo "not installed")
echo "✅ npm version: $NPM_VERSION"
echo ""

# Check architecture
echo "🏗️  Checking system architecture..."
ARCH=$(uname -m)
echo "✅ Architecture: $ARCH"
if [[ "$ARCH" != "arm"* && "$ARCH" != "aarch64" ]]; then
    echo "⚠️  Warning: This doesn't look like a Raspberry Pi (ARM architecture)"
    echo "   Continuing anyway..."
fi
echo ""

# Install dependencies
echo "📥 Installing npm dependencies..."
echo "   (This may take several minutes on Raspberry Pi...)"
npm install
echo "✅ Dependencies installed"
echo ""

# Create public directory if it doesn't exist
if [ ! -d "public" ]; then
    echo "📁 Creating public directory..."
    mkdir -p public
    echo "✅ Public directory created"
    echo ""
fi

# Create symlink for xxdk-wasm
echo "🔗 Setting up xxdk-wasm symlink..."
cd public

# Remove existing symlink or directory if it exists
if [ -e "xxdk-wasm" ] || [ -L "xxdk-wasm" ]; then
    echo "   Removing existing xxdk-wasm link..."
    rm -rf xxdk-wasm
fi

# Check if node_modules/xxdk-wasm exists
if [ ! -d "../node_modules/xxdk-wasm" ]; then
    echo "❌ Error: node_modules/xxdk-wasm not found!"
    echo "   Make sure 'npm install' completed successfully."
    exit 1
fi

# Create symlink
ln -sf ../node_modules/xxdk-wasm xxdk-wasm
echo "✅ Symlink created: public/xxdk-wasm -> ../node_modules/xxdk-wasm"
cd ..

# Verify symlink
if [ -L "public/xxdk-wasm" ]; then
    echo "✅ Symlink verified"
    if [ -f "public/xxdk-wasm/xxdk.wasm" ]; then
        echo "✅ WASM file found: public/xxdk-wasm/xxdk.wasm"
    else
        echo "⚠️  Warning: xxdk.wasm file not found in public/xxdk-wasm/"
        echo "   This might be okay if the structure is different."
    fi
else
    echo "❌ Error: Symlink was not created correctly!"
    exit 1
fi
echo ""

# Show setup summary
echo "✨ Setup Complete!"
echo "=================="
echo ""
echo "Next steps:"
echo "  1. Start the development server:"
echo "     npm run dev"
echo ""
echo "  2. Or build for production:"
echo "     npm run build"
echo "     npm start"
echo ""
echo "  3. Access from your browser:"
echo "     http://<raspberry-pi-ip>:3000"
echo ""
echo "  4. For two clients, use:"
echo "     http://<raspberry-pi-ip>:3000        (Client 1)"
echo "     http://<raspberry-pi-ip>:3000/client2 (Client 2)"
echo ""
echo "💡 Tip: If you get 'DM Client not ready' error,"
echo "   check the browser console (F12) for detailed logs."
echo "   On Raspberry Pi, initialization may take 1-2 minutes."
echo ""

