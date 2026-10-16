const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function makeAdmin() {
  const result = await prisma.user.updateMany({
    data: { role: 'ADMIN' }
  });
  console.log('Promoted users to ADMIN:', result.count);
  await prisma.$disconnect();
}

makeAdmin();
