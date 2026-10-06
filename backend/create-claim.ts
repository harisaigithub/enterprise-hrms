import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const emp = await prisma.employee.findFirst({ where: { employeeCode: 'EMP001' } });
  console.log('Employee:', emp?.id, emp?.employeeCode);
  
  const claim = await prisma.expenseClaim.create({
    data: {
      claimNumber: 'EXP-2026-00020',
      employeeId: emp.id,
      category: 'Travel',
      amount: 5000,
      currency: 'INR',
      expenseDate: new Date('2026-10-01'),
      businessPurpose: 'Client meeting in Mumbai',
      merchantName: 'Air India',
      paymentMethod: 'Corporate Card',
      status: 'Draft',
      isDraft: true,
      receiptPending: false,
    }
  });
  console.log('Created claim:', claim.claimNumber, claim.id, claim.isDraft);
}

main().catch(console.error).finally(() => prisma.$disconnect());