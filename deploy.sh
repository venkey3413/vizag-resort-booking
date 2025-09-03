#!/bin/bash

# Resort Booking App Deployment Script

echo "🚀 Starting deployment process..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create uploads directory if it doesn't exist
mkdir -p uploads

# Start the application
echo "🌟 Starting Resort Booking App..."
npm start