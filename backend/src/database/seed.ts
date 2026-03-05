#!/usr/bin/env ts-node

import { query } from '../database';
import { v4 as uuidv4 } from 'uuid';

async function seedDatabase() {
  console.log('🌱 Seeding database with sample data...');

  try {
    // Get the default user ID
    const defaultUserId = '550e8400-e29b-41d4-a716-446655440000';

    // Insert sample people
    const people = [
      { name: 'Ahmad' },
      { name: 'Mei Ling' },
      { name: 'Raj' },
      { name: 'Sarah' }
    ];

    console.log('👥 Creating people...');
    const personIds: string[] = [];

    for (const person of people) {
      const result = await query(
        'INSERT INTO people (user_id, name) VALUES ($1, $2) ON CONFLICT (user_id, name) DO NOTHING RETURNING id',
        [defaultUserId, person.name]
      );

      if (result.rows.length > 0) {
        personIds.push(result.rows[0].id);
        console.log(`✅ Created person: ${person.name}`);
      } else {
        // Get existing person ID
        const existing = await query(
          'SELECT id FROM people WHERE user_id = $1 AND name = $2',
          [defaultUserId, person.name]
        );
        personIds.push(existing.rows[0].id);
      }
    }

    // Insert sample debts
    const debts = [
      {
        person_index: 0, // Ahmad
        person_name: 'Ahmad',
        direction: 'owed_to_me',
        amount: 250.00,
        status: 'unpaid',
        due_date: '2024-02-15',
        notes: 'Dinner at Jalan Alor'
      },
      {
        person_index: 1, // Mei Ling
        person_name: 'Mei Ling',
        direction: 'owed_to_me',
        amount: 180.00,
        status: 'partially_paid',
        due_date: '2024-02-20',
        notes: 'Movie tickets + snacks'
      },
      {
        person_index: 2, // Raj
        person_name: 'Raj',
        direction: 'i_owe',
        amount: 320.00,
        status: 'unpaid',
        due_date: '2024-02-25',
        notes: 'Concert tickets'
      },
      {
        person_index: 3, // Sarah
        person_name: 'Sarah',
        direction: 'i_owe',
        amount: 150.00,
        status: 'settled',
        due_date: null,
        notes: 'Lunch last week'
      },
      {
        person_index: 0, // Ahmad
        person_name: 'Ahmad',
        direction: 'i_owe',
        amount: 75.00,
        status: 'unpaid',
        due_date: '2024-03-01',
        notes: 'Coffee and pastries'
      }
    ];

    console.log('💰 Creating debts...');
    const debtIds: string[] = [];

    for (const debt of debts) {
      const result = await query(
        `INSERT INTO debts (user_id, person_id, person_name, direction, amount, status, due_date, notes, remaining_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [
          defaultUserId,
          personIds[debt.person_index],
          debt.person_name,
          debt.direction,
          debt.amount,
          debt.status,
          debt.due_date,
          debt.notes,
          debt.amount // Initial remaining amount equals total amount
        ]
      );

      debtIds.push(result.rows[0].id);
      console.log(`✅ Created debt: ${debt.amount} RM ${debt.direction === 'owed_to_me' ? 'from' : 'to'} ${debt.person_name}`);
    }

    // Insert sample payments (only for the partially paid debt)
    const payments = [
      {
        debt_index: 1, // Mei Ling's debt
        amount: 100.00,
        date: '2024-01-25',
        note: 'First payment towards movie tickets'
      }
    ];

    console.log('💳 Creating payments...');
    for (const payment of payments) {
      await query(
        'INSERT INTO payments (debt_id, amount, date, note) VALUES ($1, $2, $3, $4)',
        [
          debtIds[payment.debt_index],
          payment.amount,
          payment.date,
          payment.note
        ]
      );
      console.log(`✅ Created payment: ${payment.amount} RM`);
    }

    console.log('🎉 Database seeded successfully!');
    console.log(`📊 Created ${personIds.length} people, ${debtIds.length} debts, and ${payments.length} payments`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Check if this script is being run directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedDatabase };
