# Debtrac Backend API

Express.js API server for the Debtrac debt tracking application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Run database migrations:
```bash
npm run migrate
```

4. Start the development server:
```bash
npm run dev
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run migrate` - Run pending migrations
- `npm run migrate:down` - Rollback last migration
- `npm run db:seed` - Seed database with sample data

## API Endpoints

### Debts
- `GET /api/debts` - Get all debts
- `POST /api/debts` - Create new debt
- `PUT /api/debts/:id` - Update debt
- `DELETE /api/debts/:id` - Delete debt

### People
- `GET /api/people` - Get all people
- `POST /api/people` - Create new person
- `PUT /api/people/:id` - Update person
- `DELETE /api/people/:id` - Delete person

### Payments
- `GET /api/payments/debt/:debtId` - Get payments for a debt
- `POST /api/payments` - Create new payment
- `PUT /api/payments/:id` - Update payment
- `DELETE /api/payments/:id` - Delete payment

### Health Check
- `GET /api/health` - Server health status

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `PORT` | Server port | 3001 |
| `NODE_ENV` | Environment (development/production) | development |
| `JWT_SECRET` | JWT signing secret | Required |
| `MIGRATION_TABLE` | Migrations table name | migrations |

## Database Schema

The database uses the following tables:
- `users` - User accounts
- `people` - Debtors/creditors
- `debts` - Debt records
- `payments` - Payment records
- `migrations` - Migration tracking

Run migrations to set up the database schema automatically.

