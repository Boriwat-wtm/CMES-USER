#!/bin/bash

# CMES-USER Authentication System Setup Script
# This script installs all dependencies needed for the auth system

echo "🚀 CMES-USER Authentication System Setup"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Install backend dependencies
echo "📦 Installing Backend Dependencies..."
cd backend

if [ ! -f "package.json" ]; then
    echo "❌ package.json not found!"
    exit 1
fi

npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install backend dependencies"
    exit 1
fi

echo "✅ Backend dependencies installed successfully"
echo ""

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created (please edit and add JWT_SECRET)"
else
    echo "✅ .env file already exists"
fi

cd ..

# Check if frontend directory exists and install
if [ -d "frontend" ]; then
    echo "📦 Installing Frontend Dependencies..."
    cd frontend
    
    if [ -f "package.json" ]; then
        npm install
        if [ $? -ne 0 ]; then
            echo "❌ Failed to install frontend dependencies"
            exit 1
        fi
        echo "✅ Frontend dependencies installed successfully"
    fi
    
    cd ..
fi

echo ""
echo "========================================"
echo "✅ Setup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Edit backend/.env and set JWT_SECRET"
echo "2. Start backend: cd backend && npm start"
echo "3. Start frontend: cd frontend && npm start"
echo "4. Visit http://localhost:3000"
echo ""
echo "To test the system:"
echo "cd backend && node test-auth.js"
echo ""
