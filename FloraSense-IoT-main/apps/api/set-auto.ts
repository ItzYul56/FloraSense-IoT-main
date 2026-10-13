import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const device = await prisma.device.findFirst();
  if (!device) return;
  await prisma.device.update({
    where: { id: device.id },
    data: { mode: 'AUTO' }
  });
  console.log('Mode set to AUTO');
}

main().finally(() => prisma.$disconnect());
