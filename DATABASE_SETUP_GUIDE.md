# Database Setup Guide for Debtrac

This comprehensive guide will walk you through setting up PostgreSQL databases and connecting them to your Debtrac debt tracking application. This will enable your system to store real data instead of using mock data.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Option 1: Local PostgreSQL Setup](#option-1-local-postgresql-setup)
3. [Option 2: Supabase Setup (Recommended)](#option-2-supabase-setup-recommended)
4. [Database Schema Creation](#database-schema-creation)
5. [Backend API Setup](#backend-api-setup)
6. [Frontend Integration](#frontend-integration)
7. [Testing the Setup](#testing-the-setup)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

Before starting, ensure you have the following installed on your system:

### For Local PostgreSQL:
- **Node.js** (version 18 or higher)
- **npm** or **yarn** or **bun**
- **PostgreSQL** (version 13 or higher)

### For Supabase:
- **Node.js** (version 18 or higher)
- **npm** or **yarn** or **bun**
- Internet connection for cloud setup

### Installation Commands:

**macOS (using Homebrew):**
```bash
# Install Node.js (if not already installed)
brew install node

# Install PostgreSQL (for local setup)
brew install postgresql
```

**Ubuntu/Debian:**
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib
```

**Windows:**
- Download and install Node.js from [nodejs.org](https://nodejs.org/)
- Download and install PostgreSQL from [postgresql.org](https://www.postgresql.org/download/windows/)

---

## Option 1: Local PostgreSQL Setup

### Step 1: Start PostgreSQL Service

**macOS:**
```bash
# Start PostgreSQL service
brew services start postgresql

# Or start manually
pg_ctl -D /usr/local/var/postgres start
```

**Ubuntu/Debian:**
```bash
# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Windows:**
- Open Services (services.msc)
- Find "PostgreSQL" service
- Right-click and select "Start"

### Step 2: Create Database and User

Open your terminal and run the following commands:

```bash
# Switch to postgres user
sudo -u postgres psql

# Inside PostgreSQL shell, create database and user
CREATE DATABASE debtrac_db;
CREATE USER debtrac_user WITH ENCRYPTED PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE debtrac_db TO debtrac_user;
\q
```

### Step 3: Verify Database Connection

Test your database connection:

```bash
# Connect to your database
psql -h localhost -p 5432 -U debtrac_user -d debtrac_db

# List tables (should be empty)
\dt

# Exit
\q
```

---

## Option 2: Supabase Setup (Recommended)

Supabase provides a PostgreSQL database as a service with additional features like authentication, real-time subscriptions, and file storage.

### Step 1: Create Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with your email or GitHub account
4. Verify your email

### Step 2: Create New Project

1. Click "New project"
2. Fill in project details:
   - **Name**: `debtrac` (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Select the closest region to your users
3. Click "Create new project"

### Step 3: Wait for Project Setup

Wait 2-3 minutes for your project to be fully provisioned. You'll see a green checkmark when ready.

### Step 4: Get Connection Details

1. Go to your project dashboard
2. Click "Settings" in the left sidebar
3. Click "Database"
4. Copy the following (keep these secure):
   - **Host**: `db.xxxxxxxx.supabase.co`
   - **Database name**: `postgres`
   - **Port**: `5432`
   - **Username**: `postgres`
   - **Password**: Your database password

---

## Database Schema Creation

### Step 1: Create Database Schema File

Create a new file `database/schema.sql` in your project:

```bash
cd /Users/khaif/Documents/code-repo/debtrac/debtrac
mkdir -p database
touch database/schema.sql
```

### Step 2: Add Schema Definition

Copy the following SQL into `database/schema.sql`:

```sql
-- Debtrac Database Schema
-- This creates the necessary tables for the debt tracking application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (for future authentication)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- People table (debtors/creditors)
CREATE TABLE people (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Debts table
CREATE TABLE debts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    person_id UUID REFERENCES people(id) ON DELETE CASCADE,
    person_name VARCHAR(255) NOT NULL, -- Denormalized for performance
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('owed_to_me', 'i_owe')),
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partially_paid', 'settled')),
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    remaining_amount DECIMAL(10,2) NOT NULL DEFAULT 0
);

-- Payments table (partial payments towards debts)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    debt_id UUID REFERENCES debts(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_debts_user_id ON debts(user_id);
CREATE INDEX idx_debts_person_id ON debts(person_id);
CREATE INDEX idx_debts_status ON debts(status);
CREATE INDEX idx_payments_debt_id ON payments(debt_id);
CREATE INDEX idx_people_user_id ON people(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_people_updated_at BEFORE UPDATE ON people FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_debts_updated_at BEFORE UPDATE ON debts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update remaining_amount in debts
CREATE OR REPLACE FUNCTION update_debt_remaining_amount()
RETURNS TRIGGER AS $$
DECLARE
    total_paid DECIMAL(10,2);
BEGIN
    -- Calculate total payments for this debt
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM payments
    WHERE debt_id = NEW.debt_id;

    -- Update remaining amount
    UPDATE debts
    SET remaining_amount = GREATEST(amount - total_paid, 0),
        status = CASE
            WHEN amount - total_paid <= 0 THEN 'settled'
            WHEN total_paid > 0 THEN 'partially_paid'
            ELSE 'unpaid'
        END,
        updated_at = NOW()
    WHERE id = NEW.debt_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update debt remaining amount when payments are added/updated/deleted
CREATE TRIGGER trigger_update_debt_remaining
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_debt_remaining_amount();

-- Insert a default user (replace with your authentication system)
INSERT INTO users (id, email, name, role) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'user@example.com', 'Default User', 'user');
```

### Step 3: Execute Schema

**For Local PostgreSQL:**
```bash
cd /Users/khaif/Documents/code-repo/debtrac/debtrac
psql -h localhost -p 5432 -U debtrac_user -d debtrac_db -f database/schema.sql
```

**For Supabase:**
1. Go to your Supabase project dashboard
2. Click "SQL Editor" in the left sidebar
3. Click "New query"
4. Copy and paste the entire contents of `database/schema.sql`
5. Click "Run"

---

## Backend API Setup

Since your current application is frontend-only, you need a backend API to connect to the database.

### Step 1: Create Backend Directory Structure

```bash
cd /Users/khaif/Documents/code-repo/debtrac/debtrac
mkdir -p backend/src/routes
cd backend
```

### Step 2: Initialize Backend Project

```bash
cd /Users/khaif/Documents/code-repo/debtrac/debtrac/backend

# Initialize package.json
npm init -y

# Install dependencies
npm install express cors helmet dotenv pg bcryptjs jsonwebtoken
npm install -D typescript @types/express @types/cors @types/pg @types/bcryptjs @types/jsonwebtoken ts-node nodemon
```

### Step 3: Create TypeScript Configuration

Create `backend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 4: Create Environment Configuration

Create `backend/.env`:

```bash
# Database Configuration
DATABASE_URL="postgresql://debtrac_user:your_secure_password_here@localhost:5432/debtrac_db"

# For Supabase, use this format instead:
# DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxx.supabase.co:5432/postgres"

# Server Configuration
PORT=3001
NODE_ENV=development

# JWT Secret (generate a random string)
JWT_SECRET=your_super_secret_jwt_key_here_generate_random_string
```

**For Supabase, get your DATABASE_URL:**
1. Go to Project Settings > Database
2. Copy the "Connection string" but replace `[YOUR-PASSWORD]` with your actual password

### Step 5: Create Database Connection

Create `backend/src/database.ts`:

```typescript
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export default pool;
```

### Step 6: Create API Routes

Create `backend/src/routes/debts.ts`:

```typescript
import { Router } from 'express';
import pool from '../database';

const router = Router();

// Get all debts for a user
router.get('/', async (req, res) => {
  try {
    const userId = '550e8400-e29b-41d4-a716-446655440000'; // Replace with actual user auth
    const result = await pool.query(
      'SELECT * FROM debts WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching debts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new debt
router.post('/', async (req, res) => {
  try {
    const { person_id, person_name, direction, amount, due_date, notes } = req.body;
    const userId = '550e8400-e29b-41d4-a716-446655440000'; // Replace with actual user auth

    const result = await pool.query(
      `INSERT INTO debts (user_id, person_id, person_name, direction, amount, due_date, notes, remaining_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [userId, person_id, person_name, direction, amount, due_date, notes, amount]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating debt:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update debt
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const result = await pool.query(
      'UPDATE debts SET status = $1, notes = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [status, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Debt not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating debt:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete debt
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM debts WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Debt not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting debt:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

Create `backend/src/routes/people.ts`:

```typescript
import { Router } from 'express';
import pool from '../database';

const router = Router();

// Get all people for a user
router.get('/', async (req, res) => {
  try {
    const userId = '550e8400-e29b-41d4-a716-446655440000'; // Replace with actual user auth
    const result = await pool.query(
      'SELECT * FROM people WHERE user_id = $1 ORDER BY name',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching people:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new person
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    const userId = '550e8400-e29b-41d4-a716-446655440000'; // Replace with actual user auth

    const result = await pool.query(
      'INSERT INTO people (user_id, name) VALUES ($1, $2) RETURNING *',
      [userId, name]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating person:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

Create `backend/src/routes/payments.ts`:

```typescript
import { Router } from 'express';
import pool from '../database';

const router = Router();

// Get payments for a debt
router.get('/debt/:debtId', async (req, res) => {
  try {
    const { debtId } = req.params;
    const result = await pool.query(
      'SELECT * FROM payments WHERE debt_id = $1 ORDER BY date DESC',
      [debtId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new payment
router.post('/', async (req, res) => {
  try {
    const { debt_id, amount, date, note } = req.body;

    const result = await pool.query(
      'INSERT INTO payments (debt_id, amount, date, note) VALUES ($1, $2, $3, $4) RETURNING *',
      [debt_id, amount, date, note]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete payment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM payments WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

### Step 7: Create Main Server File

Create `backend/src/index.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Routes
import debtRoutes from './routes/debts';
import peopleRoutes from './routes/people';
import paymentRoutes from './routes/payments';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/debts', debtRoutes);
app.use('/api/people', peopleRoutes);
app.use('/api/payments', paymentRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.Next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
```

### Step 8: Update Backend package.json Scripts

Update `backend/package.json`:

```json
{
  "name": "debtrac-backend",
  "version": "1.0.0",
  "description": "Backend API for Debtrac debt tracking app",
  "main": "dist/index.js",
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": ["debtrac", "api", "postgresql"],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.11.3"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/pg": "^8.10.9",
    "nodemon": "^3.0.2",
    "ts-node": "^10.9.2",
    "typescript": "^5.3.3"
  }
}
```

### Step 9: Start Backend Server

```bash
cd /Users/khaif/Documents/code-repo/debtrac/debtrac/backend
npm run dev
```

Or use the automated setup script:

```bash
cd /Users/khaif/Documents/code-repo/debtrac/debtrac
./setup-backend.sh
```

The backend should now be running on `http://localhost:3001`

### Step 10: Run Database Migrations

If not using the setup script, run migrations manually:

```bash
cd backend
npm run migrate
```

To seed with sample data:

```bash
npm run db:seed
```

---

## Frontend Integration

### Step 1: Install Additional Dependencies

```bash
cd /Users/khaif/Documents/code-repo/debtrac/debtrac
npm install axios
```

### Step 2: Create API Service

Create `src/lib/api.ts`:

```typescript
import axios from 'axios';
import { Debt, Person, Payment } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Debt API
export const debtApi = {
  getAll: () => api.get<Debt[]>('/debts').then(res => res.data),
  create: (debt: Omit<Debt, 'id' | 'created_at' | 'remaining_amount'>) =>
    api.post<Debt>('/debts', debt).then(res => res.data),
  update: (id: string, updates: Partial<Debt>) =>
    api.put<Debt>(`/debts/${id}`, updates).then(res => res.data),
  delete: (id: string) => api.delete(`/debts/${id}`),
};

// People API
export const peopleApi = {
  getAll: () => api.get<Person[]>('/people').then(res => res.data),
  create: (person: Omit<Person, 'id' | 'created_at' | 'user_id'>) =>
    api.post<Person>('/people', person).then(res => res.data),
};

// Payment API
export const paymentApi = {
  getByDebt: (debtId: string) =>
    api.get<Payment[]>(`/payments/debt/${debtId}`).then(res => res.data),
  create: (payment: Omit<Payment, 'id' | 'created_at'>) =>
    api.post<Payment>('/payments', payment).then(res => res.data),
  delete: (id: string) => api.delete(`/payments/${id}`),
};

export default api;
```

### Step 3: Update Environment Variables

Create `.env` in the frontend root:

```bash
VITE_API_URL=http://localhost:3001/api
```

### Step 4: Replace Mock Data with API Calls

Update `src/lib/mock-data.ts` to use real API calls. Rename it to `src/lib/data.ts`:

```typescript
import { Debt, Payment, Person, DebtSummary, PersonSummary } from '@/types';
import { debtApi, peopleApi, paymentApi } from './api';

// Cache for current data
let cachedDebts: Debt[] = [];
let cachedPeople: Person[] = [];
let cachedPayments: Payment[] = [];

// Load all data
export async function loadData() {
  try {
    [cachedDebts, cachedPeople] = await Promise.all([
      debtApi.getAll(),
      peopleApi.getAll(),
    ]);

    // Load payments for all debts
    const paymentPromises = cachedDebts.map(debt =>
      paymentApi.getByDebt(debt.id)
    );
    const paymentsArrays = await Promise.all(paymentPromises);
    cachedPayments = paymentsArrays.flat();

  } catch (error) {
    console.error('Error loading data:', error);
    // Fallback to mock data if API fails during development
    console.warn('Falling back to mock data');
  }
}

// Getters
export function getDebts(): Debt[] {
  return cachedDebts;
}

export function getPeople(): Person[] {
  return cachedPeople;
}

export function getPayments(): Payment[] {
  return cachedPayments;
}

export function getPaymentsForDebt(debtId: string): Payment[] {
  return cachedPayments.filter(payment => payment.debt_id === debtId);
}

// Actions
export async function createDebt(debtData: Omit<Debt, 'id' | 'created_at' | 'remaining_amount'>): Promise<Debt> {
  const newDebt = await debtApi.create(debtData);
  cachedDebts.push(newDebt);
  return newDebt;
}

export async function updateDebt(id: string, updates: Partial<Debt>): Promise<Debt> {
  const updatedDebt = await debtApi.update(id, updates);
  const index = cachedDebts.findIndex(d => d.id === id);
  if (index !== -1) {
    cachedDebts[index] = updatedDebt;
  }
  return updatedDebt;
}

export async function deleteDebt(id: string): Promise<void> {
  await debtApi.delete(id);
  cachedDebts = cachedDebts.filter(d => d.id !== id);
  cachedPayments = cachedPayments.filter(p => p.debt_id !== id);
}

export async function createPerson(personData: Omit<Person, 'id' | 'created_at' | 'user_id'>): Promise<Person> {
  const newPerson = await peopleApi.create(personData);
  cachedPeople.push(newPerson);
  return newPerson;
}

export async function createPayment(paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<Payment> {
  const newPayment = await paymentApi.create(paymentData);
  cachedPayments.push(newPayment);
  return newPayment;
}

// Keep existing utility functions
export function calculateSummary(debts: Debt[]): DebtSummary {
  const total_owed_to_me = debts
    .filter(d => d.direction === 'owed_to_me' && d.status !== 'settled')
    .reduce((sum, d) => sum + d.remaining_amount, 0);

  const total_i_owe = debts
    .filter(d => d.direction === 'i_owe' && d.status !== 'settled')
    .reduce((sum, d) => sum + d.remaining_amount, 0);

  return {
    total_owed_to_me,
    total_i_owe,
    net_balance: total_owed_to_me - total_i_owe,
  };
}

export function calculatePersonSummaries(debts: Debt[]): PersonSummary[] {
  const personMap = new Map<string, PersonSummary>();

  debts.forEach(debt => {
    if (debt.status === 'settled') return;

    const existing = personMap.get(debt.person_name) || {
      person_name: debt.person_name,
      owed_to_me: 0,
      i_owe: 0,
      net: 0,
    };

    if (debt.direction === 'owed_to_me') {
      existing.owed_to_me += debt.remaining_amount;
    } else {
      existing.i_owe += debt.remaining_amount;
    }
    existing.net = existing.owed_to_me - existing.i_owe;

    personMap.set(debt.person_name, existing);
  });

  return Array.from(personMap.values()).sort((a, b) =>
    Math.abs(b.net) - Math.abs(a.net)
  );
}

export function formatCurrency(amount: number): string {
  return `RM ${amount.toFixed(2)}`;
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
```

### Step 5: Update Components to Use Real Data

Update components that currently use mock data. For example, update `src/pages/Dashboard.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { loadData, getDebts, getPeople, calculateSummary, calculatePersonSummaries } from '@/lib/data';
import { Debt, Person } from '@/types';
// ... rest of imports

export default function Dashboard() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeData = async () => {
      await loadData();
      setDebts(getDebts());
      setPeople(getPeople());
      setLoading(false);
    };

    initializeData();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  const summary = calculateSummary(debts);
  const personSummaries = calculatePersonSummaries(debts);

  // ... rest of component
}
```

---

## Testing the Setup

### Step 1: Start All Services

**Terminal 1 - Backend:**
```bash
cd /Users/khaif/Documents/code-repo/debtrac/debtrac/backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd /Users/khaif/Documents/code-repo/debtrac/debtrac
npm run dev
```

### Step 2: Test API Endpoints

Test the backend API:

```bash
# Health check
curl http://localhost:3001/api/health

# Get debts
curl http://localhost:3001/api/debts

# Get people
curl http://localhost:3001/api/people
```

### Step 3: Test Frontend

1. Open browser to `http://localhost:5173` (or your dev server URL)
2. Try adding a new debt
3. Check if data persists after page refresh
4. Test adding payments to debts

---

## Troubleshooting

### Common Issues

**1. Database Connection Failed**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution:**
- Ensure PostgreSQL is running
- Check database credentials in `.env`
- For Supabase, verify connection string and password

**2. CORS Errors**
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solution:**
- Backend has CORS enabled by default
- Check that frontend is accessing the correct API URL

**3. Authentication Issues**
```
Error: relation "debts" does not exist
```
**Solution:**
- Ensure schema.sql was executed
- Check database name and user permissions

**4. Type Errors**
```
Type 'string | null' is not assignable to type 'string'
```
**Solution:**
- Update TypeScript types to match database schema
- Handle null values properly

### Useful Commands

**Check PostgreSQL status:**
```bash
# macOS
brew services list | grep postgresql

# Ubuntu
sudo systemctl status postgresql
```

**View database logs:**
```bash
# Local PostgreSQL logs
tail -f /usr/local/var/log/postgres.log
```

**Reset database:**
```bash
# Drop and recreate database (WARNING: destroys all data)
psql -U postgres -c "DROP DATABASE debtrac_db;"
psql -U postgres -c "CREATE DATABASE debtrac_db;"
psql -U debtrac_user -d debtrac_db -f database/schema.sql
```

### Getting Help

If you encounter issues:

1. Check the console logs in both frontend and backend terminals
2. Verify all environment variables are set correctly
3. Test database connection manually with `psql`
4. Check Supabase dashboard for any service issues
5. Review the error messages carefully - they often contain specific solutions

---

## Next Steps

Once your database is connected:

1. **Implement User Authentication** - Replace the hardcoded user ID with proper auth
2. **Add Data Validation** - Implement proper input validation on both frontend and backend
3. **Add Error Handling** - Improve error handling throughout the application
4. **Add Tests** - Write unit and integration tests
5. **Optimize Performance** - Add caching, pagination, and database indexes as needed
6. **Deploy** - Set up production deployment for both frontend and backend

This setup provides a solid foundation for your Debtrac application with real database persistence!
