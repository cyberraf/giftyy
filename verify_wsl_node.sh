#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "EAS version: $(eas --version)"
