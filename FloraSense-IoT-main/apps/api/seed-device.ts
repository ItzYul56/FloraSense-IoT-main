import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEVICE_ID = '123e4567-e89b-12d3-a456-426614174000';

async function main() {
  console.log(`🌱 Registrando dispositivo ESP8266 (${DEVICE_ID})...`);

  // 1. Crear o actualizar dispositivo
  const device = await prisma.device.upsert({
    where: { id: DEVICE_ID },
    update: {
      status: 'ONLINE',
      mode: 'AUTO',
      lastSeenAt: new Date(),
    },
    create: {
      id: DEVICE_ID,
      deviceKey: `key-${DEVICE_ID}`,
      name: 'ESP8266 NodeMCU - Invernadero Principal',
      description: 'Sensor de humedad de suelo YL-69 y Bomba de agua 5V',
      locationLabel: 'Invernadero Sector 1',
      status: 'ONLINE',
      mode: 'AUTO',
      firmwareVersion: '1.0.0-1Hz',
      lastSeenAt: new Date(),
    },
  });

  console.log('✅ Dispositivo registrado con éxito:', device.name);

  // 2. Crear regla de riego automática por defecto si no existe
  const existingRule = await prisma.irrigationRule.findFirst({
    where: { deviceId: DEVICE_ID },
  });

  if (!existingRule) {
    await prisma.irrigationRule.create({
      data: {
        deviceId: DEVICE_ID,
        enabled: true,
        startBelowPct: 40.0, // Iniciar si la humedad baja de 40%
        stopAbovePct: 70.0,  // Detener al alcanzar 70%
        maxRuntimeSeconds: 30, // Tiempo máximo de seguridad: 30 segundos
        cooldownSeconds: 60,   // Espera entre riegos: 1 minuto
      },
    });
    console.log('✅ Regla de riego inteligente creada (40% - 70%).');
  }

  // 3. Crear una lectura inicial de telemetría para que el Dashboard muestre datos
  const count = await prisma.telemetry.count({ where: { deviceId: DEVICE_ID } });
  if (count === 0) {
    await prisma.telemetry.create({
      data: {
        deviceId: DEVICE_ID,
        temperatureC: 24.5,
        airHumidityPct: 52.0,
        soilMoistureRaw: 450,
        soilMoisturePct: 55.0,
        pumpOn: false,
        fanOn: false,
        rssi: -58,
        payloadVersion: 1,
      },
    });
    console.log('✅ Primera lectura de telemetría registrada.');
  }

  console.log('🎉 ¡Listo! Ya puedes recargar el Dashboard en tu navegador.');
}

main()
  .catch((e) => {
    console.error('❌ Error registrando dispositivo:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
