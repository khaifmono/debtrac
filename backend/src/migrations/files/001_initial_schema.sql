-- UP: Create initial database schema for Debtrac

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

-- DOWN: Drop all tables and functions
DROP TRIGGER IF EXISTS trigger_update_debt_remaining ON payments;
DROP FUNCTION IF EXISTS update_debt_remaining_amount();
DROP TRIGGER IF EXISTS update_debts_updated_at ON debts;
DROP TRIGGER IF EXISTS update_people_updated_at ON people;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP FUNCTION IF EXISTS update_updated_at_column();

DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS debts;
DROP TABLE IF EXISTS people;
DROP TABLE IF EXISTS users;

DROP EXTENSION IF EXISTS "uuid-ossp";
