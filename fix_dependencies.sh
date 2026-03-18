#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "Killing any node processes..."
pkill -f node || true

echo "Clearing node_modules..."
rm -rf node_modules package-lock.json

echo "Installing dependencies..."
npm install

echo "Fixing Expo dependencies..."
npx expo install --fix
