#!/bin/bash

# Debtrac Backend Setup Script
# This script sets up the backend API and database for the Debtrac application

set -e  # Exit on any error

echo "🚀 Setting up Debtrac Backend..."

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
    echo "❌ Please run this script from the root of the Debtrac project"
    exit 1
fi

cd backend

# Install dependencies
echo "📦 Installing backend dependencies..."
npm install

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cat > .env << EOL
# Database Configuration
# For local PostgreSQL - UPDATE THESE VALUES
DATABASE_URL="postgresql://debtrac_user:your_password@localhost:5432/debtrac_db"

# For Supabase, use this format instead:
# DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxx.supabase.co:5432/postgres"

# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"

# JWT Secret (generate a random string)
JWT_SECRET=debtrac_jwt_secret_key_change_this_in_production_123456789

# Migration Configuration
MIGRATION_TABLE=migrations
EOL
    echo "✅ Created .env file. Please edit it with your database credentials!"
    echo "🔧 After updating .env, run: npm run migrate"
else
    echo "✅ .env file found"
fi

# Run migrations
echo "🗄️  Running database migrations..."
npm run migrate

# Ask if user wants to seed database
read -p "🌱 Do you want to seed the database with sample data? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🌱 Seeding database..."
    npm run db:seed
fi

echo ""
echo "🎉 Backend setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Make sure your PostgreSQL database is running"
echo "2. Update the DATABASE_URL in backend/.env if needed"
echo "3. Start the backend server: cd backend && npm run dev"
echo "4. The API will be available at http://localhost:3001"
echo ""
echo "🔗 API Health Check: http://localhost:3001/api/health"
echo "📚 API Documentation: Check backend/README.md"
