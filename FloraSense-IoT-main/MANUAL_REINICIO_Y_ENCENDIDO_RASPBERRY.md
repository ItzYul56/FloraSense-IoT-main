# 🍓 Manual de Reinicio y Encendido - FloraSense IoT Gateway (Raspberry Pi)

Este manual te explica **exactamente qué ocurre y qué debes hacer cuando apagas tu Raspberry Pi y la vuelves a encender**, para garantizar que todo el sistema de riego, la base de datos local y la sincronización con AWS EC2 vuelvan a funcionar al 100% sin fricción.

---

## 🎯 Meta Principal: "Cero Intervención Humana" (Arranque 100% Automático)

El objetivo de un Gateway industrial es que **al enchufarlo a la corriente eléctrica, TODO arranque solo** sin necesidad de abrir una pantalla ni teclear comandos.

Para dejar tu Raspberry Pi configurada en modo automático para siempre, ejecuta este bloque de comandos **una sola vez**:

```bash
# 1. Habilitar la base de datos PostgreSQL en el arranque
sudo systemctl enable postgresql

# 2. Habilitar el Broker MQTT Mosquitto en el arranque
sudo systemctl enable mosquitto

# 3. Habilitar el sincronizador de AWS (cada 5 minutos) en el arranque
sudo systemctl enable florasense-sync
```

*(Con esto, cada vez que enciendas la Raspberry Pi, los tres servicios se iniciarán solos en segundo plano en menos de 10 segundos).*

---

## ⚠️ Los 2 Puntos Críticos a Cuidar tras un Reinicio

### 1. La IP Local de tu Raspberry Pi (Para que el NodeMCU no se desconecte)

En el código de tu NodeMCU tienes configurada la IP de la Raspberry Pi:
`const char* mqtt_server = "10.23.178.173";`

Si al reiniciar la Raspberry Pi tu router Wi-Fi le asigna una IP diferente (por ejemplo, `10.23.178.185`), el NodeMCU intentará conectarse a la IP vieja y no podrá transmitir datos.

#### ¿Cómo saber tu IP actual al encender?
```bash
hostname -I
```

#### ¿Cómo fijar la IP para que NUNCA cambie?
Ejecuta esto en la Raspberry Pi para fijar tu IP actual en tu conexión Wi-Fi:
```bash
# Ver el nombre de tu conexión Wi-Fi (ej: "pico" o "preconfigured")
nmcli connection show

# Fijar tu IP actual (ejemplo con 10.23.178.173)
sudo nmcli connection modify "pico" ipv4.addresses 10.23.178.173/24
sudo nmcli connection modify "pico" ipv4.gateway 10.23.178.1
sudo nmcli connection modify "pico" ipv4.dns "8.8.8.8 1.1.1.1"
sudo nmcli connection modify "pico" ipv4.method manual
sudo nmcli connection up "pico"
```
*(También puedes entrar a la configuración de tu router Wi-Fi y hacer una **Reserva de IP por dirección MAC** para la Raspberry Pi).*

---

### 2. La IP Pública de AWS EC2 (Si apagas la máquina virtual en AWS)

> [!IMPORTANT]
> En AWS (especialmente en cuentas de estudiante / Learner Lab), si le das a **Stop (Detener)** y luego **Start (Iniciar)** a tu instancia EC2, **AWS le asigna una IP pública NUEVA**.
> *(Si dejas la instancia encendida continuamente, la IP no cambia).*

#### Si tu IP pública de AWS llega a cambiar:
Solo debes actualizarla en dos lugares:

1. **En la Raspberry Pi (Sincronizador):**
   ```bash
   sudo nano /etc/systemd/system/florasense-sync.service
   # Cambias AWS_DB_HOST=NUEVA_IP
   sudo systemctl daemon-reload && sudo systemctl restart florasense-sync
   ```

2. **En la Raspberry Pi (Puente de Bomba Mosquitto):**
   ```bash
   sudo nano /etc/mosquitto/conf.d/bridge-aws.conf
   # Cambias address NUEVA_IP:1883
   sudo systemctl restart mosquitto
   ```

3. **En la EC2 (Frontend Web):**
   En el archivo `.env` de tu EC2, cambia `NEXT_PUBLIC_API_URL` y `EC2_PUBLIC_IP` con la nueva IP y reinicia con `docker compose -f docker-compose.prod.yml restart web`.

---

## 📋 Rutina Paso a Paso: Al Encender la Raspberry Pi

Cada vez que vayas a usar el sistema:

1. **Enciende la Raspberry Pi:** Conéctala a su fuente de poder y espera unos 30-40 segundos a que conecte al Wi-Fi.
2. **Ejecuta el script de diagnóstico rápido:**
   Hemos preparado un script que revisa todo con un solo comando:
   ```bash
   bash /home/iot/FloraSense-IoT-main/FloraSense-IoT-main/scripts/rpi/check_florasense.sh
   ```
   Te mostrará un reporte visual en colores:
   - `[OK] Base de Datos PostgreSQL local corriendo`
   - `[OK] Broker Mosquitto corriendo`
   - `[OK] Sincronizador a AWS activo`
   - `[OK] Conectividad con el puerto 5432 de AWS`
   - `[OK] Últimas lecturas registradas en la base local`

3. **Enciende el NodeMCU:**
   * Conéctalo a la corriente o puerto USB.
   * En su monitor serie (o por Wi-Fi) verás: `[WIFI] Conectado exitosamente` y `[MQTT] En línea`.
   * Comenzará a transmitir telemetría a la Raspberry Pi cada 1 segundo.

4. **Abre el Dashboard en tu navegador:**
   Ingresa a: `http://54.166.220.66:3000`
   * Verás tu dispositivo **ONLINE**.
   * Cada 5 minutos verás aparecer en la nueva tabla el bloque de lecturas acumuladas.

---

## 🛠️ Chuleta de Comandos Rápidos (Cheatsheet)

### Para reiniciar todos los servicios de FloraSense a la vez:
```bash
sudo systemctl restart postgresql mosquitto florasense-sync
```

### Para ver qué está sincronizando hacia AWS en este momento:
```bash
sudo journalctl -u florasense-sync -f
```

### Para ver el estado del broker MQTT:
```bash
sudo systemctl status mosquitto
```

### Para ver los últimos 5 datos guardados en la base de datos local de la Raspberry Pi:
```bash
sudo -u postgres psql -d smart_irrigation -c 'SELECT id, "recordedAt", "soilMoisturePct", "pumpOn" FROM "Telemetry" ORDER BY id DESC LIMIT 5;'
```

---

## 🔌 Cómo Apagar la Raspberry Pi de Forma Segura

Nunca desconectes el cable de golpe para evitar que se corrompa la memoria SD o la base de datos PostgreSQL:

```bash
sudo poweroff
```
Espera 10 segundos a que la luz verde deje de parpadear y desconecta el cable de alimentación. ¡Listo!
