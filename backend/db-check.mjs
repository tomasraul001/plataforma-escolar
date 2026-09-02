import { PrismaClient } from './generated/prisma/client.ts';

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    console.log('Connected to database!');
    
    const areas = await prisma.trainingArea.findMany();
    console.log('Areas:', areas);
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();