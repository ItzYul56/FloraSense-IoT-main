#!/usr/bin/env python3
"""
FloraSense IoT - Colector Local Serial USB (1 Hz) en Raspberry Pi
================================================================
Se ejecuta en la Raspberry Pi si se conecta el NodeMCU directamente
por cable USB (/dev/ttyUSB0 o /dev/ttyACM0).
Lee la línea JSON emitida cada segundo por el NodeMCU, la parsea
y la inserta en la base de datos PostgreSQL local de la Raspberry Pi.
"""

import json
import os
import sys
import time
import serial
import psycopg2

SERIAL_PORT = os.getenv("SERIAL_PORT", "/dev/ttyUSB0")
BAUD_RATE = int(os.getenv("BAUD_RATE", "115200"))

# Configuración Base de Datos Local
DB_HOST = os.getenv("LOCAL_DB_HOST", "localhost")
DB_PORT = int(os.getenv("LOCAL_DB_PORT", "5432"))
DB_NAME = os.getenv("LOCAL_DB_NAME", "smart_irrigation")
DB_USER = os.getenv("LOCAL_DB_USER", "postgres")
DB_PASS = os.getenv("LOCAL_DB_PASS", "postgres")

def main():
    print(f"🔌 Abriendo puerto serial {SERIAL_PORT} a {BAUD_RATE} baudios...")
    
    while True:
        try:
            ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=2)
            time.sleep(2) # Esperar estabilización del puerto
            print(f"✅ Puerto {SERIAL_PORT} abierto. Escuchando telemetría serial a 1 Hz...")

            conn = psycopg2.connect(
                host=DB_HOST,
                port=DB_PORT,
                dbname=DB_NAME,
                user=DB_USER,
                password=DB_PASS
            )
            conn.autocommit = True

            while True:
                line = ser.readline().decode('utf-8', errors='ignore').strip()
                if not line:
                    continue

                # Filtrar solo líneas que comiencen con JSON {"
                if not line.startswith('{') or not line.endswith('}'):
                    continue

                try:
                    payload = json.loads(line)
                    device_id = payload.get("deviceId", "123e4567-e89b-12d3-a456-426614174000")

                    with conn.cursor() as cur:
                        # Asegurar existencia del dispositivo
                        cur.execute(
                            '''
                            INSERT INTO "Device" (id, "deviceKey", name, status, mode, "updatedAt")
                            VALUES (%s, %s, %s, %s, %s, NOW())
                            ON CONFLICT (id) DO NOTHING;
                            ''',
                            (device_id, f"key-{device_id}", f"Dispositivo Serial {device_id[:8]}", "ONLINE", "AUTO")
                        )

                        cur.execute(
                            '''
                            INSERT INTO "Telemetry" (
                                "deviceId", "recordedAt", "temperatureC", "airHumidityPct",
                                "soilMoistureRaw", "soilMoisturePct", "pumpOn", "fanOn", "rssi", "payloadVersion"
                            ) VALUES (%s, NOW(), %s, %s, %s, %s, %s, %s, %s, %s);
                            ''',
                            (
                                device_id,
                                payload.get("temperatureC", 0.0),
                                payload.get("airHumidityPct", 0.0),
                                payload.get("soilMoistureRaw", 0),
                                payload.get("soilMoisturePct", 0.0),
                                payload.get("pumpOn", False),
                                payload.get("fanOn", False),
                                payload.get("rssi", -40),
                                payload.get("version", 1)
                            )
                        )
                        cur.execute('UPDATE "Device" SET "lastSeenAt" = NOW(), status = \'ONLINE\' WHERE id = %s;', (device_id,))

                    print(f"📥 [SERIAL 1Hz] Suelo: {payload.get('soilMoisturePct')}% | Bomba: {payload.get('pumpOn')}")

                except json.JSONDecodeError:
                    pass
                except Exception as e:
                    print(f"❌ Error insertando datos seriales en DB: {e}")

        except serial.SerialException as e:
            print(f"⚠️ Error serial ({e}). Reintentando en 5 segundos...")
            time.sleep(5)
        except Exception as e:
            print(f"❌ Error inesperado: {e}. Reintentando en 5 segundos...")
            time.sleep(5)

if __name__ == "__main__":
    main()
