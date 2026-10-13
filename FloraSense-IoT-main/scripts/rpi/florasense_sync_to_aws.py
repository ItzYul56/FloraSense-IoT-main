#!/usr/bin/env python3
"""
FloraSense IoT - Sincronizador de Telemetría (Raspberry Pi -> AWS EC2 PostgreSQL)
================================================================================
Este script se ejecuta en la Raspberry Pi como un servicio en segundo plano (daemon).
Lee las lecturas de telemetría registradas localmente en la Raspberry Pi (a 1 Hz)
y las sincroniza por lotes a la base de datos PostgreSQL alojada en la instancia
EC2 de AWS cada N segundos (configurable: 5 segundos o 5 minutos).

Características:
- Tolerancia a cortes de red (acumula localmente y sincroniza cuando regresa internet).
- Cero duplicación de datos mediante control atómico de último ID sincronizado.
- Inserción masiva optimizada (execute_values) para mínimo consumo de red y CPU.
- Creación automática del registro de Device en AWS si no existe para evitar fallos de Foreign Key.
"""

import os
import sys
import time
import psycopg2
from psycopg2.extras import execute_values

# =====================================================================
# CONFIGURACIÓN GENERAL Y TEMPORAL
# =====================================================================
# Intervalo de sincronización en segundos:
# - Para cada 5 minutos: 300
# - Para cada 5 segundos: 5
SYNC_INTERVAL_SECONDS = int(os.getenv("SYNC_INTERVAL_SECONDS", "300"))

# Límite máximo de filas a sincronizar por lote (previene saturación de memoria)
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "500"))

# =====================================================================
# CREDENCIALES BASE DE DATOS LOCAL (RASPBERRY PI)
# =====================================================================
LOCAL_DB_HOST = os.getenv("LOCAL_DB_HOST", "localhost")
LOCAL_DB_PORT = int(os.getenv("LOCAL_DB_PORT", "5432"))
LOCAL_DB_NAME = os.getenv("LOCAL_DB_NAME", "smart_irrigation")
LOCAL_DB_USER = os.getenv("LOCAL_DB_USER", "postgres")
LOCAL_DB_PASS = os.getenv("LOCAL_DB_PASS", "postgres")

# =====================================================================
# CREDENCIALES BASE DE DATOS REMOTA (AWS EC2 POSTGRESQL)
# =====================================================================
# Reemplazar con la IP Pública de la instancia EC2 de AWS
AWS_DB_HOST = os.getenv("AWS_DB_HOST", "TU_IP_PUBLICA_EC2_AWS")
AWS_DB_PORT = int(os.getenv("AWS_DB_PORT", "5432"))
AWS_DB_NAME = os.getenv("AWS_DB_NAME", "smart_irrigation")
AWS_DB_USER = os.getenv("AWS_DB_USER", "postgres")
AWS_DB_PASS = os.getenv("AWS_DB_PASS", "FloraSenseSecure2026!")

# Archivo o tabla para persistir el último ID sincronizado
STATE_FILE = os.path.expanduser("~/.florasense_last_sync_id.txt")


def get_last_synced_id():
    """Obtiene el último ID de telemetría sincronizado desde el archivo de estado."""
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r") as f:
                content = f.read().strip()
                if content:
                    return int(content)
        except Exception as e:
            print(f"⚠️ [WARN] Error leyendo archivo de estado ({e}). Iniciando en 0.")
    return 0


def save_last_synced_id(last_id):
    """Guarda atómicamente el último ID sincronizado."""
    temp_file = STATE_FILE + ".tmp"
    with open(temp_file, "w") as f:
        f.write(str(last_id))
    os.replace(temp_file, STATE_FILE)


def ensure_device_exists_in_aws(aws_cursor, device_id):
    """Asegura que el dispositivo existe en la tabla Device de AWS para evitar violación de FK."""
    aws_cursor.execute('SELECT id FROM "Device" WHERE id = %s LIMIT 1;', (device_id,))
    if aws_cursor.fetchone() is None:
        print(f"ℹ️ Registrando dispositivo {device_id} en AWS EC2...")
        aws_cursor.execute(
            '''
            INSERT INTO "Device" (id, "deviceKey", name, status, mode, "updatedAt")
            VALUES (%s, %s, %s, %s, %s, NOW())
            ON CONFLICT (id) DO NOTHING;
            ''',
            (device_id, f"key-{device_id}", f"FloraSense Node {device_id[:8]}", "ONLINE", "AUTO")
        )


def sync_batch():
    """Ejecuta una iteración de sincronización de la Raspberry Pi a AWS."""
    last_id = get_last_synced_id()
    
    # 1. Conexión a la base de datos local
    try:
        local_conn = psycopg2.connect(
            host=LOCAL_DB_HOST,
            port=LOCAL_DB_PORT,
            dbname=LOCAL_DB_NAME,
            user=LOCAL_DB_USER,
            password=LOCAL_DB_PASS,
            connect_timeout=5
        )
    except Exception as e:
        print(f"❌ [LOCAL DB] No se pudo conectar a PostgreSQL local: {e}")
        return

    try:
        with local_conn.cursor() as cur:
            cur.execute(
                '''
                SELECT id, "deviceId", "recordedAt", "temperatureC", "airHumidityPct",
                       "soilMoistureRaw", "soilMoisturePct", "pumpOn", "fanOn", "rssi", "payloadVersion"
                FROM "Telemetry"
                WHERE id > %s
                ORDER BY id ASC
                LIMIT %s;
                ''',
                (last_id, BATCH_SIZE)
            )
            rows = cur.fetchall()
    except Exception as e:
        print(f"❌ [LOCAL DB] Error consultando telemetría local: {e}")
        local_conn.close()
        return
    finally:
        local_conn.close()

    if not rows:
        # No hay datos nuevos pendientes de sincronización
        return

    print(f"📦 [SYNC] Se encontraron {len(rows)} lecturas pendientes desde ID {last_id}. Conectando a AWS EC2...")

    # 2. Conexión a AWS PostgreSQL
    try:
        aws_conn = psycopg2.connect(
            host=AWS_DB_HOST,
            port=AWS_DB_PORT,
            dbname=AWS_DB_NAME,
            user=AWS_DB_USER,
            password=AWS_DB_PASS,
            connect_timeout=10
        )
    except Exception as e:
        print(f"⚠️ [AWS DB] No se pudo conectar a AWS ({AWS_DB_HOST}:{AWS_DB_PORT}): {e}")
        print("⏳ Los datos permanecen a salvo en la Raspberry Pi. Reintentando en el próximo ciclo...")
        return

    try:
        with aws_conn.cursor() as aws_cur:
            # Obtener dispositivos únicos del lote para garantizar su existencia
            unique_device_ids = set(r[1] for r in rows)
            for dev_id in unique_device_ids:
                ensure_device_exists_in_aws(aws_cur, dev_id)

            # Preparar datos para inserción por lote
            # Excluimos el id autoincremental para que AWS genere el suyo o conservemos coherencia
            insert_data = [
                (
                    r[1], # deviceId
                    r[2], # recordedAt
                    r[3], # temperatureC
                    r[4], # airHumidityPct
                    r[5], # soilMoistureRaw
                    r[6], # soilMoisturePct
                    r[7], # pumpOn
                    r[8], # fanOn
                    r[9], # rssi
                    r[10] # payloadVersion
                )
                for r in rows
            ]

            insert_query = '''
                INSERT INTO "Telemetry" (
                    "deviceId", "recordedAt", "temperatureC", "airHumidityPct",
                    "soilMoistureRaw", "soilMoisturePct", "pumpOn", "fanOn", "rssi", "payloadVersion"
                ) VALUES %s;
            '''

            execute_values(aws_cur, insert_query, insert_data)

            # Actualizar lastSeenAt y estado ONLINE del dispositivo en AWS
            for dev_id in unique_device_ids:
                aws_cur.execute(
                    '''
                    UPDATE "Device" 
                    SET "lastSeenAt" = NOW(), status = 'ONLINE' 
                    WHERE id = %s;
                    ''',
                    (dev_id,)
                )

            aws_conn.commit()

            # Guardar el último ID local sincronizado
            new_last_id = rows[-1][0]
            save_last_synced_id(new_last_id)
            print(f"✅ [SUCCESS] ¡{len(rows)} registros sincronizados con éxito en AWS EC2! Último ID: {new_last_id}")

    except Exception as e:
        aws_conn.rollback()
        print(f"❌ [AWS DB] Error durante la inserción por lotes en AWS: {e}")
    finally:
        aws_conn.close()


def main():
    print("===============================================================")
    print("🌿 FloraSense IoT - Servicio de Sincronización Raspberry -> AWS")
    print(f"⏱️ Intervalo configurado: cada {SYNC_INTERVAL_SECONDS} segundos")
    print(f"🎯 Servidor Destino (AWS EC2): {AWS_DB_HOST}:{AWS_DB_PORT}/{AWS_DB_NAME}")
    print(f"📍 Servidor Origen (Local RPi): {LOCAL_DB_HOST}:{LOCAL_DB_PORT}/{LOCAL_DB_NAME}")
    print("===============================================================")

    while True:
        try:
            sync_batch()
        except Exception as e:
            print(f"❌ Excepción inesperada en el bucle principal: {e}")
        
        time.sleep(SYNC_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
