const mqtt = require('mqtt');

const DEVICE_ID = '123e4567-e89b-12d3-a456-426614174000';
const BROKER_URL = 'mqtt://localhost:1883';
const TOPIC_TELEMETRY = `iot/v1/devices/${DEVICE_ID}/telemetry`;
const TOPIC_COMMANDS = `iot/v1/devices/${DEVICE_ID}/commands`;
const TOPIC_ACKS = `iot/v1/devices/${DEVICE_ID}/acks`;

console.log('Iniciando Simulador IoT (ESP32 Virtual)...');
console.log(`Conectando al broker en ${BROKER_URL}`);

const client = mqtt.connect(BROKER_URL);

let isPumpOn = false;
let pumpTimeout = null;
let currentMoisture = 35.0; // Empezamos un poco secos para que se active
let currentTemp = 24.5;
let irrigationInterval = null;

client.on('connect', () => {
  console.log('Conectado exitosamente al Broker MQTT');
  
  client.subscribe(TOPIC_COMMANDS, (err) => {
    if (!err) console.log(`Suscrito a comandos: ${TOPIC_COMMANDS}`);
  });
  
  sendTelemetry();
  setInterval(sendTelemetry, 10000); // Enviar cada 10s
  
  // Simular secado natural lentamente
  setInterval(() => {
    if (!isPumpOn && currentMoisture > 10) {
      currentMoisture -= 0.5;
    }
  }, 10000);
});

client.on('message', (topic, message) => {
  if (topic === TOPIC_COMMANDS) {
    try {
      const payload = JSON.parse(message.toString());
      console.log(`\nComando recibido:`, payload);
      
      if (payload.action === 'ON') {
        if (!isPumpOn) {
          isPumpOn = true;
          console.log('[BOMBA ENCENDIDA]');
          sendAck(payload.commandId, 'ACKNOWLEDGED');
          sendTelemetry(); // Send immediate status change
          
          const stopPump = (reason) => {
             if (irrigationInterval) clearInterval(irrigationInterval);
             irrigationInterval = null;
             isPumpOn = false;
             if (pumpTimeout) clearTimeout(pumpTimeout);
             pumpTimeout = null;
             console.log(`[BOMBA APAGADA] ${reason}`);
             sendTelemetry();
          };

          irrigationInterval = setInterval(() => {
            currentMoisture += 5.0;
            if (currentMoisture >= 100) {
              currentMoisture = 100;
              stopPump('Niveles de humedad al 100%. Apagado preventivo de seguridad.');
            }
          }, 2000);
          
          const maxDuration = (payload.maxDurationSeconds || 10) * 1000;
          
          if (pumpTimeout) clearTimeout(pumpTimeout);
          pumpTimeout = setTimeout(() => {
            stopPump('Timeout de seguridad');
          }, maxDuration);
        }
      } else if (payload.action === 'OFF') {
        if (isPumpOn) {
          if (irrigationInterval) clearInterval(irrigationInterval);
          irrigationInterval = null;
          isPumpOn = false;
          if (pumpTimeout) clearTimeout(pumpTimeout);
          pumpTimeout = null;
          console.log('[BOMBA APAGADA] Comando manual');
          sendAck(payload.commandId, 'ACKNOWLEDGED');
          sendTelemetry(); // Send immediate status change
        }
      }
    } catch (e) {
      console.error('Error procesando comando:', e);
    }
  }
});

function sendAck(commandId, status) {
  const ackPayload = {
    version: 1,
    commandId: commandId,
    status: status,
    pumpOn: isPumpOn,
    timestamp: new Date().toISOString()
  };
  client.publish(TOPIC_ACKS, JSON.stringify(ackPayload), { qos: 1 });
}

function sendTelemetry() {
  currentTemp += (Math.random() * 0.4 - 0.2);

  const payload = {
    version: 1,
    deviceId: DEVICE_ID,
    timestamp: new Date().toISOString(),
    temperatureC: parseFloat(currentTemp.toFixed(1)),
    airHumidityPct: 50.0,
    soilMoistureRaw: Math.floor(1023 - (currentMoisture * 10.23)), 
    soilMoisturePct: parseFloat(currentMoisture.toFixed(1)),
    pumpOn: isPumpOn,
    rssi: -50 - Math.floor(Math.random() * 5)
  };

  console.log(`Enviando telemetria... Temp: ${payload.temperatureC}C, Suelo: ${payload.soilMoisturePct}%, Bomba: ${isPumpOn ? 'ON' : 'OFF'}`);
  
  client.publish(TOPIC_TELEMETRY, JSON.stringify(payload), { qos: 1 });
}
