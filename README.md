# Debtrac

A debt tracking web application for managing money owed to you and money you owe others. Features split bill creation, payment tracking, and admin user management.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack React Query
- **Backend**: Express.js, TypeScript, PostgreSQL (via `pg`), JWT authentication
- **Infrastructure**: Docker Compose, Nginx reverse proxy

## Prerequisites

- [Node.js](https://nodejs.org/) v20+ (recommended: install via [nvm](https://github.com/nvm-sh/nvm))
- [Docker](https://www.docker.com/) and Docker Compose (for the database, or full-stack deployment)
- PostgreSQL 16 (if running the database without Docker)

## Quick Start (Docker)

The fastest way to get everything running:

```bash
# Clone the repo
git clone https://github.com/khaifmono/debtrac.git
cd debtrac/debtrac

# Start all services (PostgreSQL, backend, frontend)
docker compose up --build -d

# Open the app
open http://localhost:3001
```

Default admin login: `admin@admin.com` / `changeme`
You will be prompted to change the password on first login.

To seed sample data:

```bash
SEED_DB=true docker compose up --build -d
```

To stop and tear down:

```bash
docker compose down       # keep data
docker compose down -v    # remove data volumes too
```

## Local Development Setup

### 1. Start the database

```bash
cd debtrac

# Option A: Use Docker for just the database
docker compose up db -d

# Option B: Use an existing PostgreSQL instance
# Create a database called debtrac_db and a user with access to it
```

### 2. Set up the backend

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env  # or create manually (see Environment Variables below)

# Run database migrations
npm run migrate

# (Optional) Seed sample data
npm run db:seed

# Start the dev server (port 3001)
npm run dev
```

### 3. Set up the frontend

```bash
# From the debtrac/ root (not backend/)
npm install

# Create .env file
echo "VITE_API_URL=http://localhost:3001/api" > .env

# Start the dev server (port 8080)
npm run dev
```

Open http://localhost:8080 in your browser.

## Environment Variables

### Frontend (`debtrac/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `/api` |

### Backend (`debtrac/backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | *(required)* |
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `JWT_SECRET` | Secret key for signing JWTs | `dev-secret-change-me` |
| `FRONTEND_URL` | Allowed CORS origin (production) | - |
| `DATABASE_SSL` | Enable SSL for database connection | `false` |

Example backend `.env`:

```env
DATABASE_URL=postgresql://debtrac_user:debtrac_password_123@localhost:5432/debtrac_db
PORT=3001
NODE_ENV=development
JWT_SECRET=your-secret-key-here
```

## Available Scripts

### Frontend (from `debtrac/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 8080) |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run frontend tests |

### Backend (from `debtrac/backend/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload (port 3001) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run migrate` | Run pending database migrations |
| `npm run migrate:down` | Rollback last migration |
| `npm run db:seed` | Seed sample data |
| `npm test` | Run backend tests |

## Authentication

The app uses JWT-based authentication. On first setup (after running migrations), a default admin account is created:

- **Email**: `admin@admin.com`
- **Password**: `changeme`
- You will be forced to change the password on first login

Admin users can manage other users from the **Settings** page (create accounts, change roles, delete users). New users are created with the default password `changeme` and must change it on first login.

## Project Structure

```
debtrac/
├── backend/
│   └── src/
│       ├── index.ts              # Express app entry point
│       ├── database.ts           # PostgreSQL connection pool
│       ├── middleware/auth.ts     # JWT auth & admin middleware
│       ├── utils/auth.ts         # Password hashing & token utilities
│       ├── routes/
│       │   ├── auth.ts           # Login, me, change-password
│       │   ├── users.ts          # Admin user management
│       │   ├── debts.ts          # Debt CRUD
│       │   ├── people.ts         # People CRUD
│       │   └── payments.ts       # Payment CRUD
│       ├── migrations/
│       │   ├── migrate.ts        # Migration runner
│       │   └── files/            # SQL migration files
│       └── __tests__/            # Backend tests
├── src/
│   ├── App.tsx                   # Routes & providers
│   ├── contexts/AuthContext.tsx   # Auth state management
│   ├── components/
│   │   ├── Layout.tsx            # App shell with sidebar
│   │   ├── ProtectedRoute.tsx    # Route guard
│   │   ├── ForcePasswordChange.tsx
│   │   └── ...                   # UI components
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Settings.tsx          # Admin user management
│   │   ├── OwedToMe.tsx
│   │   ├── IOwe.tsx
│   │   ├── People.tsx
│   │   ├── SplitBill.tsx
│   │   └── Dashboard.tsx
│   ├── lib/api.ts                # API client with auth headers
│   └── types/index.ts            # Shared TypeScript interfaces
├── docker-compose.yml
├── Dockerfile                    # Frontend (Nginx)
├── nginx.conf
└── database/schema.sql
```

## API Endpoints

All endpoints except auth are protected and require a `Bearer` token in the `Authorization` header.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | Public | Login, returns JWT |
| GET | `/api/auth/me` | User | Get current user |
| POST | `/api/auth/change-password` | User | Change password |
| GET | `/api/debts` | User | List user's debts |
| POST | `/api/debts` | User | Create a debt |
| PUT | `/api/debts/:id` | User | Update a debt |
| DELETE | `/api/debts/:id` | User | Delete a debt |
| GET | `/api/people` | User | List user's people |
| POST | `/api/people` | User | Create a person |
| PUT | `/api/people/:id` | User | Update a person |
| DELETE | `/api/people/:id` | User | Delete a person |
| GET | `/api/payments/debt/:debtId` | User | List payments for a debt |
| POST | `/api/payments` | User | Create a payment |
| DELETE | `/api/payments/:id` | User | Delete a payment |
| GET | `/api/users` | Admin | List all users |
| POST | `/api/users` | Admin | Create a user |
| PUT | `/api/users/:id/role` | Admin | Change user role |
| DELETE | `/api/users/:id` | Admin | Delete a user |

## License

ISC
