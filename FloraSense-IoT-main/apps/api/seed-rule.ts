import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const device = await prisma.device.findFirst();
  if (device) {
    const rules = await prisma.irrigationRule.findMany({ where: { deviceId: device.id }});
    if (rules.length === 0) {
      await prisma.irrigationRule.create({
        data: {
          deviceId: device.id,
          enabled: true,
          startBelowPct: 40.0,
          stopAbovePct: 70.0,
          maxRuntimeSeconds: 30,
          cooldownSeconds: 60,
        }
      });
      console.log('Regla creada exitosamente');
    } else {
      console.log('El dispositivo ya tiene reglas');
    }
  } else {
    console.log('No hay dispositivos');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
