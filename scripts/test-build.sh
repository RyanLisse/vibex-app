#!/bin/bash
echo "🔨 Testing production build..."
rm -rf .next
./node_modules/.bin/next build
echo "✅ Build completed!"
