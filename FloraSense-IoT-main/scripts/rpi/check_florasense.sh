#!/bin/bash
# ==============================================================================
# FloraSense IoT - Script de Diagnóstico y Estado en Raspberry Pi
# ==============================================================================
# Ejecuta este script cuando enciendas la Raspberry Pi para comprobar que
# todos los servicios estén corriendo al 100%.

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===============================================================${NC}"
echo -e "${BLUE}🌿 FloraSense IoT - Verificación de Estado (Raspberry Pi Gateway)${NC}"
echo -e "${BLUE}===============================================================${NC}"

# 1. Verificar IP local de la Raspberry Pi
IP_LOCAL=$(hostname -I | awk '{print $1}')
echo -e "\n📌 ${YELLOW}IP Local de la Raspberry Pi:${NC} ${IP_LOCAL}"
echo -e "   (Asegúrate de que coincida con mqtt_server en el código del NodeMCU)"

# 2. Verificar PostgreSQL Local
echo -ne "\n🐘 Verificando Base de Datos PostgreSQL local... "
if systemctl is-active --quiet postgresql; then
    echo -e "${GREEN}[OK] Corriendo${NC}"
else
    echo -e "${RED}[ERROR] Inactivo${NC} -> Ejecuta: sudo systemctl start postgresql"
fi

# 3. Verificar Broker Mosquitto
echo -ne "📡 Verificando Broker Mosquitto (Puerto 1883)... "
if systemctl is-active --quiet mosquitto; then
    echo -e "${GREEN}[OK] Corriendo${NC}"
else
    echo -e "${RED}[ERROR] Inactivo${NC} -> Ejecuta: sudo systemctl restart mosquitto"
fi

# 4. Verificar Servicio de Sincronización a AWS
echo -ne "☁️  Verificando Sincronizador a AWS (florasense-sync)... "
if systemctl is-active --quiet florasense-sync; then
    echo -e "${GREEN}[OK] Activo en segundo plano${NC}"
else
    echo -e "${YELLOW}[AVISO] Inactivo${NC} -> Ejecuta: sudo systemctl start florasense-sync"
fi

# 5. Probar conectividad con AWS EC2 (Puerto 5432)
AWS_HOST=$(grep -oP 'AWS_DB_HOST=\K[^\s]+' /etc/systemd/system/florasense-sync.service 2>/dev/null || echo "54.166.220.66")
echo -ne "\n🌐 Probando conexión hacia AWS EC2 (${AWS_HOST}:5432)... "
if nc -z -w3 "$AWS_HOST" 5432 2>/dev/null; then
    echo -e "${GREEN}[OK] Puerto 5432 accesible en AWS${NC}"
else
    echo -e "${RED}[FALLÓ]${NC} (Verifica que la instancia EC2 esté encendida y el puerto 5432 abierto en Security Group)"
fi

# 6. Comprobar últimas lecturas en la base de datos local
echo -e "\n📊 ${YELLOW}Últimas lecturas registradas en la base de datos local:${NC}"
sudo -u postgres psql -d smart_irrigation -c '
SELECT id, "recordedAt" AT TIME ZONE '\''America/Santiago'\'' as fecha_hora, "soilMoisturePct" as suelo_pct, "temperatureC" as temp_c, "pumpOn" as bomba 
FROM "Telemetry" 
ORDER BY id DESC 
LIMIT 3;
' 2>/dev/null || echo -e "${RED}No se pudo consultar la base de datos local.${NC}"

echo -e "\n${BLUE}===============================================================${NC}"
echo -e "💡 Para ver los logs de sincronización a AWS en tiempo real:"
echo -e "   ${YELLOW}sudo journalctl -u florasense-sync -f${NC}"
echo -e "${BLUE}===============================================================${NC}\n"
