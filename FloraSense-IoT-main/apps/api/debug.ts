import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const device = await prisma.device.findFirst();
  if (!device) return;
  console.log('Mode:', device.mode);
  
  const rules = await prisma.irrigationRule.findMany({ where: { deviceId: device.id }});
  console.log('Rules:', rules);
  
  const events = await prisma.irrigationEvent.findMany({ where: { deviceId: device.id }});
  console.log('Events count:', events.length);
}

main().finally(() => prisma.$disconnect());
