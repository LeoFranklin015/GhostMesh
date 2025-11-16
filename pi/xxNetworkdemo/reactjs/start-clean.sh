#!/bin/bash

echo "🧹 Starting with clean slate..."
echo ""
echo "⚠️  IMPORTANT: Open your browser and run this in the console:"
echo ""
echo "localStorage.clear(); indexedDB.databases().then(dbs => { dbs.forEach(db => indexedDB.deleteDatabase(db.name)); }); setTimeout(() => location.reload(), 1000);"
echo ""
echo "=========================================="
echo "Starting Next.js dev server on port 3000"
echo "=========================================="
echo ""
echo "📍 CLIENT 1: http://localhost:3000/"
echo "📍 CLIENT 2: http://localhost:3000/client2"
echo ""

npm run dev



