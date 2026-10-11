import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required to seed expense policies');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const policies = [
  { category: 'Travel', limitAmount: 15000, receiptThreshold: 500, submissionWindowDays: 60, isActive: true },
  { category: 'Food & Meals', limitAmount: 2000, receiptThreshold: 500, submissionWindowDays: 60, isActive: true },
  { category: 'Accommodation', limitAmount: 12000, receiptThreshold: 1000, submissionWindowDays: 60, isActive: true },
  { category: 'Local Transport', limitAmount: 3000, receiptThreshold: 300, submissionWindowDays: 60, isActive: true },
  { category: 'Office Supplies', limitAmount: 5000, receiptThreshold: 500, submissionWindowDays: 60, isActive: true },
  { category: 'Communication', limitAmount: 3000, receiptThreshold: 500, submissionWindowDays: 60, isActive: true },
  { category: 'Training', limitAmount: 20000, receiptThreshold: 1000, submissionWindowDays: 60, isActive: true },
  { category: 'Client Entertainment', limitAmount: 10000, receiptThreshold: 1000, submissionWindowDays: 60, isActive: true },
  { category: 'Other', limitAmount: 5000, receiptThreshold: 500, submissionWindowDays: 60, isActive: true },
];

async function seed() {
  try {
    for (const p of policies) {
      await prisma.expensePolicy.upsert({
        where: { category: p.category },
        create: p,
        update: p,
      });
      console.log('Seeded:', p.category);
    }
    console.log('Done!');
  } finally {
    await prisma.$disconnect();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});