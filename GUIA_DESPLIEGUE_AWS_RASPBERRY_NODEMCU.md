# 🌿 FloraSense IoT - Guía Maestra de Despliegue Distribuido
## NodeMCU (1 Hz) ➔ Raspberry Pi (DB Local) ➔ AWS EC2 PostgreSQL (Sync cada 5 min/seg) + Web Cloud

Este documento contiene la **guía paso a paso, definitiva y completa** para desplegar el ecosistema industrial **FloraSense IoT** de forma distribuida:

1. **NodeMCU (ESP8266):** Mide sensores físicos y transmite telemetría **cada 1 segundo** a la Raspberry Pi.
2. **Raspberry Pi (Edge Gateway):** Recibe datos a 1 Hz, los almacena en su **base de datos PostgreSQL local** y ejecuta un servicio de sincronización por lotes cada **5 minutos (o 5 segundos)** hacia la nube.
3. **Amazon EC2 (AWS Student / Free Tier):** Hospeda la **Base de Datos PostgreSQL Cloud**, el Broker MQTT, la API NestJS y el Dashboard Web Next.js en una máquina virtual `t2.micro` / `t3.micro`.
4. **Bidireccionalidad:** Toda la funcionalidad de la plataforma web se preserva al 100% (gráficos en vivo, activación remota de la electrobomba, ajuste de reglas de riego y auditoría).

---

## 📐 1. Arquitectura General del Sistema

```mermaid
flowchart TD
    subgraph HardwareEdge ["📡 Nivel 1: Hardware en Campo (Invernadero)"]
        SensorSuelo["Sensor YL-69 (Suelo)"] -->|Analógico A0| NodeMCU["ESP8266 NodeMCU"]
        SensorDHT["Sensor DHT22 / AM2302"] -->|Digital D2| NodeMCU
        NodeMCU -->|Digital D1| Rele["Módulo Relé 5V"]
        Rele --> Bomba["Bomba de Agua / Solenoide"]
    end

    subgraph RaspberryEdge ["🍓 Nivel 2: Gateway Local (Raspberry Pi)"]
        NodeMCU -->|"Telemetría cada 1 segundo (Wi-Fi MQTT / USB Serial)"| RPiIngest["Colector Local (1 Hz)"]
        RPiIngest -->|"INSERT inmediato"| RPiDB[("PostgreSQL Local\n(Buffer Ininterrumpido)")]
        SyncService["Servidor de Sincronización\n(florasense_sync_to_aws.py)"] -->|"SELECT lotes no enviados"| RPiDB
    end

    subgraph AWSCloud ["☁️ Nivel 3: Amazon EC2 (Tier Estudiante - 1GB RAM + 2GB Swap)"]
        SyncService -->|"Batch INSERT (Cada 5 min o 5 seg)\nPuerto 5432"| AWSDB[("PostgreSQL 15 Cloud\n(smart_irrigation)")]
        AWSMosquitto["Eclipse Mosquitto\n(Puerto 1883)"] <-->|"Bridge Bidireccional"| RPiIngest
        AWSAPI["Backend NestJS API\n(Puerto 3001)"] <-->|"Prisma ORM"| AWSDB
        AWSAPI <-->|"Eventos y Comandos"| AWSMosquitto
        AWSWeb["Frontend Next.js 14\n(Puerto 3000)"] <-->|"REST API + JWT"| AWSAPI
    end

    subgraph Usuario ["👤 Nivel 4: Control del Usuario"]
        Navegador["Navegador Web / Celular\n(http://IP-PUBLICA-EC2:3000)"] <--> AWSWeb
        Navegador -.->|"Click 'Activar Bomba'"| AWSAPI
    end
```

---

## ☁️ 2. Fase 1: Configuración de la Instancia EC2 en AWS (Tier Estudiante)

En programas para estudiantes (como **AWS Academy Learner Lab** o la capa gratuita estándar de AWS Free Tier), dispones de instancias con **1 vCPU y 1 GB de memoria RAM** (`t2.micro` o `t3.micro`). 

> [!IMPORTANT]
> **El problema del 1 GB de RAM:** Un contenedor PostgreSQL junto con Node.js (NestJS y Next.js) puede consumir más de 1 GB en picos de compilación o arranque, provocando que el kernel de Linux cierre procesos por *Out of Memory (OOM Killer)*. **Crear una memoria SWAP de 2 GB en este paso es obligatorio para garantizar estabilidad del 100%.**

---

### Paso 2.1: Lanzar la Instancia en la Consola de AWS
1. Ingresa a la consola de AWS (o tu consola de AWS Academy Learner Lab).
2. Ve al servicio **EC2** y haz clic en **Launch Instance** (Lanzar Instancia).
3. Configuración recomendada:
   - **Name:** `FloraSense-Cloud-Server`
   - **AMI:** `Ubuntu Server 24.04 LTS` o `Ubuntu Server 22.04 LTS` (64-bit x86).
   - **Instance Type:** `t2.micro` (o `t3.micro`).
   - **Key Pair (Login):** Selecciona una clave existente o crea una nueva `.pem` (ej: `florasense-key.pem`) para conectarte por SSH.
   - **Storage:** Cambia el disco a `25 GB` o `30 GB` General Purpose SSD (`gp3`). (El tier de estudiante incluye hasta 30 GB gratis).

---

### Paso 2.2: Configurar el Grupo de Seguridad (Firewall de AWS)
En la sección **Network Settings** > **Security Group Rules**, añade las siguientes reglas de entrada (**Inbound Rules**):

| Tipo | Puerto | Protocolo | Origen (Source) | Propósito |
| :--- | :---: | :---: | :--- | :--- |
| **SSH** | `22` | TCP | `Mi IP` o `0.0.0.0/0` | Conexión a la terminal de la EC2 |
| **HTTP Web** | `3000` | TCP | `0.0.0.0/0` | Dashboard Web (Next.js) |
| **HTTP (Alt)** | `80` | TCP | `0.0.0.0/0` | Acceso Web estándar / Nginx |
| **API REST** | `3001` | TCP | `0.0.0.0/0` | Backend API (NestJS) |
| **PostgreSQL**| `5432` | TCP | `IP Pública Raspberry Pi` o `0.0.0.0/0`* | Inserción directa de datos desde Raspberry Pi |
| **MQTT** | `1883` | TCP | `0.0.0.0/0` | Puente de comandos para el actuador/bomba |

*\*Nota de seguridad:* Si tu conexión de internet en la Raspberry Pi tiene IP dinámica, puedes usar `0.0.0.0/0` protegido por la contraseña fuerte de PostgreSQL (`FloraSenseSecure2026!`).

---

### Paso 2.3: Conectarse por SSH y Crear Memoria SWAP
Abre una terminal en tu computadora y conéctate:

```bash
chmod 400 florasense-key.pem
ssh -i florasense-key.pem ubuntu@<TU_IP_PUBLICA_EC2>
```

Una vez dentro, ejecuta los siguientes comandos para **crear 2 GB de SWAP**:

```bash
# 1. Crear archivo de intercambio de 2 GB
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 2. Hacer permanente la memoria swap tras reinicios
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 3. Optimizar el uso de swap en RAM baja
sudo sysctl vm.swappiness=20
echo 'vm.swappiness=20' | sudo tee -a /etc/sysctl.conf

# 4. Verificar que esté activo (debe mostrar 2.0G Swap)
free -h
```

---

### Paso 2.4: Instalar Docker y Docker Compose en la EC2

```bash
# Actualizar repositorios
sudo apt update && sudo apt upgrade -y

# Instalar Docker oficial
sudo apt install -y ca-certificates curl gnupg lsb-release
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Permitir ejecutar docker sin sudo
sudo usermod -aG docker $USER
newgrp docker
docker --version
```

---

### Paso 2.5: Clonar el Repositorio y Configurar Variables de Entorno en AWS

```bash
# Clonar tu repositorio
git clone https://github.com/V333I/FloraSense-IoT.git
cd FloraSense-IoT

# Crear el archivo de variables .env
nano .env
```

Pega el siguiente contenido en `.env` (reemplaza `<TU_IP_PUBLICA_EC2>` con la IPv4 pública de tu instancia de AWS):

```env
# ==========================================
# CONFIGURACIÓN DE PRODUCCIÓN AWS EC2
# ==========================================
# Base de Datos PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=FloraSenseSecure2026!
POSTGRES_DB=smart_irrigation
DATABASE_URL="postgresql://postgres:FloraSenseSecure2026!@postgres:5432/smart_irrigation?schema=public"

# Broker MQTT
MQTT_BROKER_URL="mqtt://mosquitto:1883"
MQTT_USERNAME="dev_user"
MQTT_PASSWORD="dev_password"

# Backend NestJS
PORT=3001
JWT_SECRET="florasense-super-secret-production-jwt-key-2026"

# Frontend Next.js (Usa la IP pública de tu EC2)
NEXT_PUBLIC_API_URL="http://<TU_IP_PUBLICA_EC2>:3001/api/v1"
EC2_PUBLIC_IP="<TU_IP_PUBLICA_EC2>"
```

Guarda los cambios (`Ctrl + O`, `Enter`, `Ctrl + X`).

---

### Paso 2.6: Desplegar los Servicios en AWS con Docker

En el repositorio ya tienes listo el archivo `docker-compose.prod.yml`:

```bash
# Levantar el clúster en segundo plano
docker compose -f docker-compose.prod.yml up -d
```

Espera 30 segundos mientras los contenedores compilan y levantan. Puedes verificar su estado con:

```bash
docker compose -f docker-compose.prod.yml ps
```

Deberás ver 4 contenedores en estado `Up`:
- `smart_irrigation_db` (PostgreSQL en puerto `0.0.0.0:5432`)
- `smart_irrigation_mqtt` (Mosquitto en puerto `0.0.0.0:1883`)
- `smart_irrigation_api` (NestJS en puerto `0.0.0.0:3001`)
- `smart_irrigation_web` (Next.js en puerto `0.0.0.0:3000`)

---

### Paso 2.7: Cargar las Tablas e Inicializar el Usuario Administrador en AWS
Ejecuta la migración de Prisma y el usuario administrador en el contenedor de la API:

```bash
# 1. Aplicar el esquema de base de datos a PostgreSQL
docker compose -f docker-compose.prod.yml exec api npx prisma db push --schema=apps/api/prisma/schema.prisma

# 2. Sembrar el usuario administrador inicial
docker compose -f docker-compose.prod.yml exec api npx tsx apps/api/seed-admin.ts
```

Verás el mensaje:
> `✅ Usuario semilla (Admin) creado correctamente.`
> `Email: admin@florasense.local`
> `Contraseña: FloraAdmin2026!`

Ya puedes abrir en tu navegador: `http://<TU_IP_PUBLICA_EC2>:3000` y comprobar que la interfaz web carga limpiamente.

---

## 🍓 3. Fase 2: Configuración de la Raspberry Pi (Gateway y DB Local)

La Raspberry Pi actúa como el **cerebro local de alta frecuencia**. Debe:
1. Tener su propia base de datos PostgreSQL local para garantizar que nunca se pierda un solo dato (incluso si se corta internet).
2. Recibir los datos del NodeMCU **a 1 Hz (cada 1 segundo)**.
3. Ejecutar el servicio que envía los datos a AWS cada 5 minutos o 5 segundos.

---

### Paso 3.1: Instalar PostgreSQL y Mosquitto en la Raspberry Pi
Conéctate por SSH a tu Raspberry Pi (`ssh pi@<IP_RASPBERRY>`) y ejecuta:

```bash
sudo apt update && sudo apt upgrade -y

# Instalar PostgreSQL local, cliente y Python
sudo apt install -y postgresql postgresql-contrib python3 python3-pip python3-psycopg2 mosquitto mosquitto-clients

# Instalar librerías de Python para MQTT y Serial
pip3 install paho-mqtt pyserial --break-system-packages
```

---

### Paso 3.2: Configurar la Base de Datos Local en la Raspberry Pi
Crea la base de datos `smart_irrigation` e importa el esquema idéntico del repositorio:

```bash
# 1. Cambiar contraseña del usuario postgres local a "postgres"
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"

# 2. Crear la base de datos smart_irrigation
sudo -u postgres psql -c "CREATE DATABASE smart_irrigation OWNER postgres;"

# 3. Clonar el repositorio en la Raspberry Pi
cd /home/pi
git clone https://github.com/V333I/FloraSense-IoT.git
cd FloraSense-IoT

# 4. Cargar el esquema completo de tablas
sudo -u postgres psql -d smart_irrigation -f esquema_base_datos.sql
```

Para verificar que las tablas están creadas localmente:
```bash
sudo -u postgres psql -d smart_irrigation -c "\dt"
```

---

### Paso 3.3: Configurar el Broker Mosquitto Local en la Raspberry Pi
Permite conexiones de red para que el NodeMCU pueda conectarse vía Wi-Fi:

```bash
sudo nano /etc/mosquitto/conf.d/local.conf
```
Agrega:
```conf
listener 1883
allow_anonymous true
```
Reinicia el servicio:
```bash
sudo systemctl restart mosquitto
```

---

## 📡 4. Fase 3: Configurar el NodeMCU para Envío Cada 1 Segundo (1 Hz)

En el código original, el NodeMCU enviaba telemetría cada 10 segundos. Lo ajustamos a **1 segundo exacto (1000 ms)**.

### Paso 4.1: Código C++ del Firmware (`esp8266_florasense_1hz.ino`)
Abre Arduino IDE y carga el archivo que hemos generado en:
[`firmware/esp8266_florasense/esp8266_florasense_1hz.ino`](file:///c:/Users/yulia/Downloads/FloraSense-IoT-main/FloraSense-IoT-main/firmware/esp8266_florasense/esp8266_florasense_1hz.ino).

Verifica y ajusta los siguientes parámetros al inicio del archivo:

```cpp
// Tu red Wi-Fi local
const char* ssid = "NOMBRE_DE_TU_WIFI";
const char* password = "PASSWORD_DE_TU_WIFI";

// Dirección IP local de la RASPBERRY PI (NO de AWS)
const char* mqtt_server = "192.168.1.100"; // Pon la IP de tu Raspberry Pi
const int mqtt_port = 1883;

// ID del dispositivo
const char* DEVICE_ID = "123e4567-e89b-12d3-a456-426614174000";

// Intervalo de muestreo: 1 segundo (1000 milisegundos)
const unsigned long TELEMETRY_INTERVAL_MS = 1000;
```

### Paso 4.2: Conexión de Pines Físicos
- **Sensor de Humedad de Suelo (YL-69 / YL-38):** Pin `A0` del NodeMCU. VCC a `3.3V` o `5V`, GND a `GND`.
- **Relé de la Bomba de Agua (5V):** Pin de control `IN` al Pin `D1` (GPIO5) del NodeMCU. VCC a `5V` (o Pin `VIN`), GND a `GND`.

> [!TIP]
> **Doble Salida Simultánea (Wi-Fi + USB Serial):** El nuevo firmware emite la telemetría tanto por **MQTT (Wi-Fi)** como por el **Puerto Serial USB (`Serial.println(jsonBuffer)`) a 115200 baudios**. Esto significa que puedes elegir conectarlo por Wi-Fi a la Raspberry Pi, o simplemente enchufar el NodeMCU con su cable micro-USB directamente a un puerto USB de la Raspberry Pi.

---

## 📥 5. Fase 4: Recepción a 1 Hz en la Raspberry Pi y Guardado en DB Local

Dependiendo de cómo conectes el NodeMCU a la Raspberry Pi, utiliza uno de los dos métodos:

### Opción A: Vía Wi-Fi con el Colector MQTT Local (Recomendado)
El script [`rpi_mqtt_collector.py`](file:///c:/Users/yulia/Downloads/FloraSense-IoT-main/FloraSense-IoT-main/scripts/rpi/rpi_mqtt_collector.py) escucha el tópico `iot/v1/devices/+/telemetry` e inserta la telemetría cada segundo en PostgreSQL local.

Crear servicio systemd para que arranque solo:
```bash
sudo nano /etc/systemd/system/florasense-collector.service
```
Contenido:
```ini
[Unit]
Description=FloraSense - Colector Local MQTT 1Hz
After=network.target mosquitto.service postgresql.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/FloraSense-IoT/scripts/rpi
ExecStart=/usr/bin/python3 /home/pi/FloraSense-IoT/scripts/rpi/rpi_mqtt_collector.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```
Activar e iniciar:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now florasense-collector
```

### Opción B: Vía Cable USB Serial Directo
Si prefieres no usar Wi-Fi entre el NodeMCU y la Raspberry Pi, conecta el NodeMCU por USB al puerto de la Raspberry Pi y usa [`rpi_serial_collector.py`](file:///c:/Users/yulia/Downloads/FloraSense-IoT-main/FloraSense-IoT-main/scripts/rpi/rpi_serial_collector.py):

```bash
# Dar permisos de lectura serial al usuario pi
sudo usermod -a -G dialout pi

# Probar la lectura en vivo
python3 /home/pi/FloraSense-IoT/scripts/rpi/rpi_serial_collector.py
```

### Verificación del Registro a 1 Hz en la Base de Datos Local
Ejecuta en la Raspberry Pi:
```bash
sudo -u postgres psql -d smart_irrigation -c 'SELECT id, "recordedAt", "soilMoisturePct", "pumpOn" FROM "Telemetry" ORDER BY id DESC LIMIT 5;'
```
Verás que cada fila tiene una diferencia exacta de **1 segundo**.

---

## 🔄 6. Fase 5: Servicio de Sincronización Raspberry Pi ➔ AWS EC2 (Cada 5 min o 5 seg)

El script [`florasense_sync_to_aws.py`](file:///c:/Users/yulia/Downloads/FloraSense-IoT-main/FloraSense-IoT-main/scripts/rpi/florasense_sync_to_aws.py) es el encargado de transferir los datos acumulados a AWS.

### Paso 6.1: Configuración del Intervalo de Sincronización
Edita el archivo del servicio en la Raspberry Pi:

```bash
sudo cp /home/pi/FloraSense-IoT/scripts/rpi/florasense-sync.service /etc/systemd/system/
sudo nano /etc/systemd/system/florasense-sync.service
```

En la sección `[Service]`, ajusta las variables:

```ini
# Configuración del Intervalo:
# - Para enviar cada 5 minutos: 300
# - Para enviar cada 5 segundos: 5
Environment="SYNC_INTERVAL_SECONDS=300"

# IP Pública de tu Instancia AWS EC2 y Contraseña configurada en el Paso 2.5
Environment="AWS_DB_HOST=<TU_IP_PUBLICA_EC2>"
Environment="AWS_DB_PORT=5432"
Environment="AWS_DB_NAME=smart_irrigation"
Environment="AWS_DB_USER=postgres"
Environment="AWS_DB_PASS=FloraSenseSecure2026!"
```

### Paso 6.2: Activar y Arrancar el Sincronizador Automático
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now florasense-sync
```

### Paso 6.3: Monitorear la Sincronización en Vivo
```bash
sudo journalctl -u florasense-sync -f
```

Verás una salida similar a esta:
```text
📦 [SYNC] Se encontraron 300 lecturas pendientes desde ID 1200. Conectando a AWS EC2...
✅ [SUCCESS] ¡300 registros sincronizados con éxito en AWS EC2! Último ID: 1500
⏱️ Esperando 300 segundos para el próximo ciclo...
```

> [!TIP]
> **Tolerancia Inmune a Caídas de Internet:** Si el módem o la conexión a internet en la Raspberry Pi se desconecta durante 2 horas, la Raspberry Pi continuará grabando a 1 Hz en su base de datos local. Tan pronto vuelva el internet, el servicio detectará las 7.200 lecturas acumuladas y las subirá por lotes a AWS sin perder ni un solo segundo de histórico.

---

## 🌐 7. Fase 6: Preservar Toda la Funcionalidad Web y Control Remoto en AWS

### Paso 7.1: Visualización del Dashboard en la Nube
1. Abre en tu navegador: `http://<TU_IP_PUBLICA_EC2>:3000`
2. Inicia sesión:
   - **Correo:** `admin@florasense.local`
   - **Contraseña:** `FloraAdmin2026!`
3. Entra al **Dashboard**: Los gráficos de humedad de suelo y humedad ambiental se alimentarán con las lecturas sincronizadas desde la Raspberry Pi.

---

### Paso 7.2: Control Remoto Bidireccional de la Bomba (AWS ➔ Raspberry Pi ➔ NodeMCU)
Cuando un usuario hace clic en **"Activar Bomba"** en la web de AWS, la orden se publica en el broker MQTT de AWS en el tópico:
`iot/v1/devices/<DEVICE_ID>/commands`

Para que esta orden viaje de AWS a la Raspberry Pi física y accione el relé, configuramos un **Puente Mosquitto (Bridge)** en la Raspberry Pi.

En la Raspberry Pi, copia la configuración:
```bash
sudo cp /home/pi/FloraSense-IoT/scripts/rpi/mosquitto-bridge-aws.conf /etc/mosquitto/conf.d/bridge-aws.conf
sudo nano /etc/mosquitto/conf.d/bridge-aws.conf
```

Reemplaza `TU_IP_PUBLICA_EC2_AWS` por la IP pública de tu EC2:
```conf
connection florasense-aws-bridge
address <TU_IP_PUBLICA_EC2>:1883

# Traer comandos desde AWS hacia la Raspberry Pi
topic iot/v1/devices/+/commands in 1

# Enviar confirmaciones ACK desde la Raspberry Pi hacia AWS
topic iot/v1/devices/+/acks out 1
```

Reinicia Mosquitto en la Raspberry Pi:
```bash
sudo systemctl restart mosquitto
```

**¡Listo!** El circuito bidireccional está completo:
1. Das clic en **"Activar Bomba"** en la web de AWS.
2. NestJS emite la orden al Mosquitto de AWS.
3. El puente de la Raspberry Pi la recibe instantáneamente por internet y se la reenvía al NodeMCU por Wi-Fi.
4. El NodeMCU activa el pin digital `D1`, encendiendo la electrobomba.
5. El NodeMCU envía un `ACK` que regresa a AWS y actualiza el historial de riego en la pantalla.

---

## 🛠️ 8. Resumen de Scripts y Ubicaciones de Archivos Creados

| Archivo | Ubicación en el Repositorio | Dónde se ejecuta | Función |
| :--- | :--- | :--- | :--- |
| **`docker-compose.prod.yml`** | `FloraSense-IoT/docker-compose.prod.yml` | **AWS EC2** | Orquesta PostgreSQL, Mosquitto, API y Web optimizados para 1GB RAM |
| **`esp8266_florasense_1hz.ino`** | `firmware/esp8266_florasense/` | **NodeMCU** | Firmware C++ con transmisión cada 1 segundo por Wi-Fi y Serial |
| **`rpi_mqtt_collector.py`** | `scripts/rpi/rpi_mqtt_collector.py` | **Raspberry Pi** | Recibe telemetría a 1 Hz del NodeMCU y la guarda en la BD local |
| **`rpi_serial_collector.py`** | `scripts/rpi/rpi_serial_collector.py` | **Raspberry Pi** | Alternativa para recibir a 1 Hz por cable USB Serial |
| **`florasense_sync_to_aws.py`** | `scripts/rpi/florasense_sync_to_aws.py` | **Raspberry Pi** | Sincroniza lotes de datos hacia AWS PostgreSQL cada 5 min/seg |
| **`florasense-sync.service`** | `scripts/rpi/florasense-sync.service` | **Raspberry Pi** | Servicio de sistema para autoarranque y persistencia de sincronización |
| **`mosquitto-bridge-aws.conf`**| `scripts/rpi/mosquitto-bridge-aws.conf` | **Raspberry Pi** | Conecta los comandos de la web en AWS con el relé físico |

---

## 🔍 9. Diagnóstico y Preguntas Frecuentes (Troubleshooting)

### P1: La instancia EC2 se congela o da error 502/OOM.
**Solución:** Verifica que la memoria SWAP esté activa ejecutando `free -h` en la EC2. Si `Swap:` está en `0B`, repite los comandos del **Paso 2.3** para habilitar los 2 GB de SWAP.

### P2: El script `florasense_sync_to_aws.py` da error `Connection refused (port 5432)`.
**Solución:**
1. Revisa el **Security Group** de AWS: Asegúrate de que el puerto `5432` tenga una regla de entrada (Inbound Rule) permitida.
2. Comprueba que el contenedor de PostgreSQL en AWS esté corriendo: `docker compose -f docker-compose.prod.yml ps`.

### P3: Al dar clic en "Activar Bomba" en la Web, no prende el relé físico.
**Solución:**
1. En la Raspberry Pi, verifica el log del broker Mosquitto: `sudo systemctl status mosquitto`.
2. Prueba que el relé funcione enviando un comando manual desde la Raspberry Pi:
   ```bash
   mosquitto_pub -h localhost -t "iot/v1/devices/123e4567-e89b-12d3-a456-426614174000/commands" -m '{"commandId":"test-1","action":"on"}'
   ```
3. Si el relé enciende al revés (apaga en ON y prende en OFF), cambia en el código del NodeMCU la variable `RELAY_ACTIVE_HIGH = false;` y vuelve a cargar el firmware.

### P4: En la Raspberry Pi, `ls /dev/ttyUSB0` da "No such file or directory".
**Solución:** En algunos NodeMCU el chip serie es CH340 o CP2102 y puede llamarse `/dev/ttyUSB1` o `/dev/ttyACM0`. Ejecuta `ls /dev/tty*` antes y después de conectar el cable USB para identificar el nombre exacto.

### P5: Los contenedores `api` y `web` están en bucle de reinicio `Restarting (1)` y `Restarting (127)`.
**Causa:** 
- `Restarting (127)` en Linux significa **Command not found** (`next: not found`).
- `Restarting (1)` significa que `nest` o `prisma` fallaron porque al clonar el repositorio en una máquina nueva, la carpeta `node_modules` no existe o no tiene los binarios para Linux.

**Solución Inmediata (en 2 pasos):**
1. Detén los contenedores caídos:
   ```bash
   docker compose -f docker-compose.prod.yml down
   ```
2. Instala las dependencias del monorepo dentro del contenedor de Node (para que se compilen para Linux):
   ```bash
   docker compose -f docker-compose.prod.yml run --rm api npm install
   ```
3. Genera Prisma y levanta el clúster:
   ```bash
   docker compose -f docker-compose.prod.yml run --rm api npx prisma generate --schema=apps/api/prisma/schema.prisma
   docker compose -f docker-compose.prod.yml up -d
   ```
4. Comprueba de nuevo con `docker compose -f docker-compose.prod.yml ps`: todos los contenedores estarán en estado `Up`.

