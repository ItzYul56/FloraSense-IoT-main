#!/usr/bin/env python3
"""
FloraSense IoT - Colector Local MQTT (1 Hz) en Raspberry Pi
===========================================================
Se ejecuta en la Raspberry Pi. Se suscribe al broker Mosquitto local en el puerto 1883
y recibe los datos de telemetría enviados por el NodeMCU cada 1 segundo (1 Hz).
Inserta cada lectura directamente en la base de datos PostgreSQL local de la Raspberry Pi.
"""

import json
import os
import sys
import paho.mqtt.client as mqtt
import psycopg2

# Configuración MQTT Local
MQTT_BROKER = os.getenv("LOCAL_MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("LOCAL_MQTT_PORT", "1883"))
MQTT_TOPIC = "iot/v1/devices/+/telemetry"

# Configuración Base de Datos Local
DB_HOST = os.getenv("LOCAL_DB_HOST", "localhost")
DB_PORT = int(os.getenv("LOCAL_DB_PORT", "5432"))
DB_NAME = os.getenv("LOCAL_DB_NAME", "smart_irrigation")
DB_USER = os.getenv("LOCAL_DB_USER", "postgres")
DB_PASS = os.getenv("LOCAL_DB_PASS", "postgres")

db_conn = None


def get_db_connection():
    global db_conn
    if db_conn is None or db_conn.closed:
        db_conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS
        )
        db_conn.autocommit = True
    return db_conn


def ensure_device_exists_local(cur, device_id):
    cur.execute('SELECT id FROM "Device" WHERE id = %s LIMIT 1;', (device_id,))
    if cur.fetchone() is None:
        cur.execute(
            '''
            INSERT INTO "Device" (id, "deviceKey", name, status, mode, "updatedAt")
            VALUES (%s, %s, %s, %s, %s, NOW())
            ON CONFLICT (id) DO NOTHING;
            ''',
            (device_id, f"key-{device_id}", f"Dispositivo Local {device_id[:8]}", "ONLINE", "AUTO")
        )


def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"🔌 Conectado al Broker MQTT local ({MQTT_BROKER}:{MQTT_PORT})")
        client.subscribe(MQTT_TOPIC)
        print(f"📡 Suscrito a telemetría en tiempo real: {MQTT_TOPIC}")
    else:
        print(f"❌ Error conectando a MQTT local, código: {rc}")


def on_message(client, userdata, msg):
    try:
        topic_parts = msg.topic.split('/')
        device_id = topic_parts[3]
        payload = json.loads(msg.payload.decode('utf-8'))

        conn = get_db_connection()
        with conn.cursor() as cur:
            ensure_device_exists_local(cur, device_id)

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
                    payload.get("rssi", -50),
                    payload.get("version", 1)
                )
            )
            # Actualizar lastSeenAt
            cur.execute('UPDATE "Device" SET "lastSeenAt" = NOW(), status = \'ONLINE\' WHERE id = %s;', (device_id,))

        print(f"📥 [1 Hz] Telemetría guardada de {device_id[:8]} -> Suelo: {payload.get('soilMoisturePct')}% | Bomba: {payload.get('pumpOn')}")

    except Exception as e:
        print(f"❌ Error procesando mensaje MQTT e insertando en PostgreSQL local: {e}")


def main():
    print("🚀 Iniciando Colector Local MQTT FloraSense (1 lectura por segundo)...")
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message

    while True:
        try:
            client.connect(MQTT_BROKER, MQTT_PORT, 60)
            client.loop_forever()
        except KeyboardInterrupt:
            print("Cerrando colector...")
            break
        except Exception as e:
            print(f"⚠️ Reintentando conexión con Mosquitto local en 5s... ({e})")
            import time
            time.sleep(5)


if __name__ == "__main__":
    main()
