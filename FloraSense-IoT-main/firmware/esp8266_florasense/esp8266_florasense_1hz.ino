#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ==============================================================================
// CONFIGURACIÓN DE RED Y MQTT (RASPBERRY PI LOCAL)
// ==============================================================================
const char* ssid = "TU_RED_WIFI";
const char* password = "TU_PASSWORD_WIFI";

// Dirección IP local de tu Raspberry Pi en la red Wi-Fi (ej: 192.168.1.100)
// Si la Raspberry Pi está en modo Punto de Acceso (AP), suele ser 192.168.4.1
const char* mqtt_server = "IP_LOCAL_DE_TU_RASPBERRY_PI"; 
const int mqtt_port = 1883;

// Identificador único del dispositivo (debe coincidir con la base de datos)
const char* DEVICE_ID = "123e4567-e89b-12d3-a456-426614174000"; 
const char* DEVICE_KEY = "key-123e4567-e89b-12d3-a456-426614174000";

// Intervalo de muestreo y envío: 1 segundo (1000 ms)
const unsigned long TELEMETRY_INTERVAL_MS = 1000;

// ==============================================================================
// CONFIGURACIÓN DE HARDWARE (PINES ESP8266 NODEMCU)
// ==============================================================================
// Pin Analógico A0 - Sensor de Humedad de Suelo (YL-69 / YL-38 resistivo o capacitivo)
const int SOIL_MOISTURE_PIN = A0;

// Pin Digital D1 (GPIO5) - Módulo Relé para la Bomba de Agua 5V
const int PUMP_PIN = 5; 

// Tipo de relé:
// true  = Módulo relé normal (Activo en HIGH / 1 enciende, 0 apaga)
// false = Módulo relé optoacoplado invertido (Activo en LOW / 0 enciende, 1 apaga)
const bool RELAY_ACTIVE_HIGH = true;

// Calibración analógica del sensor de suelo
const int DRY_VALUE = 1023; // Valor ADC en aire seco (0% humedad)
const int WET_VALUE = 300;  // Valor ADC sumergido en agua (100% humedad)

// ==============================================================================
// VARIABLES GLOBALES
// ==============================================================================
WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastMsg = 0;
bool isPumpOn = false;

// Tópicos MQTT dinámicos
char topic_telemetry[100];
char topic_commands[100];
char topic_acks[100];

void setPump(bool state) {
  isPumpOn = state;
  if (RELAY_ACTIVE_HIGH) {
    digitalWrite(PUMP_PIN, state ? HIGH : LOW);
  } else {
    digitalWrite(PUMP_PIN, state ? LOW : HIGH);
  }
}

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("📡 Conectando a Wi-Fi: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 30) {
    delay(500);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ Wi-Fi conectado exitosamente!");
    Serial.print("📍 IP asignada al NodeMCU: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n⚠️ No se pudo conectar a Wi-Fi. Funcionando en modo Serial directo por USB.");
  }
}

void sendAck(const char* commandId, const char* status) {
  StaticJsonDocument<200> doc;
  doc["version"] = 1;
  doc["commandId"] = commandId;
  doc["status"] = status;
  doc["pumpOn"] = isPumpOn;

  char jsonBuffer[200];
  serializeJson(doc, jsonBuffer);
  
  if (client.connected()) {
    client.publish(topic_acks, jsonBuffer);
  }
  Serial.print("📤 ACK enviado: ");
  Serial.println(jsonBuffer);
}

void publishTelemetry() {
  // 1. Lectura del sensor analógico de suelo
  int rawValue = analogRead(SOIL_MOISTURE_PIN);
  
  // 2. Mapeo a porcentaje (0% a 100%)
  int pct = map(rawValue, DRY_VALUE, WET_VALUE, 0, 100);
  pct = constrain(pct, 0, 100);

  long rssi = (WiFi.status() == WL_CONNECTED) ? WiFi.RSSI() : -50;

  // 3. Creación del payload JSON estandarizado
  StaticJsonDocument<256> doc;
  doc["version"] = 1;
  doc["deviceId"] = DEVICE_ID;
  doc["temperatureC"] = 24.5; // Si tienes DHT, sustituir con dht.readTemperature()
  doc["airHumidityPct"] = 52.0; // Si tienes DHT, sustituir con dht.readHumidity()
  doc["soilMoistureRaw"] = rawValue;
  doc["soilMoisturePct"] = (float)pct;
  doc["pumpOn"] = isPumpOn;
  doc["fanOn"] = false;
  doc["rssi"] = rssi;

  char jsonBuffer[256];
  serializeJson(doc, jsonBuffer);

  // 4. Salida por USB Serial (para método por cable o depuración)
  Serial.println(jsonBuffer);

  // 5. Salida por MQTT a la Raspberry Pi (si hay conexión Wi-Fi)
  if (client.connected()) {
    client.publish(topic_telemetry, jsonBuffer);
  }
}

void callback(char* topic, byte* payload, unsigned int length) {
  String messageTemp;
  for (unsigned int i = 0; i < length; i++) {
    messageTemp += (char)payload[i];
  }
  Serial.print("📩 Comando recibido [");
  Serial.print(topic);
  Serial.print("]: ");
  Serial.println(messageTemp);

  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, messageTemp);
  if (error) {
    Serial.println("❌ Error parseando JSON de comando");
    return;
  }

  if (String(topic) == topic_commands) {
    const char* action = doc["action"];
    const char* commandId = doc["commandId"];
    
    if (String(action) == "on" || String(action) == "ON") {
      setPump(true);
      Serial.println("💧 [RELÉ ACTIVADO - BOMBA ON]");
      sendAck(commandId, "ACKNOWLEDGED");
      publishTelemetry();
    } 
    else if (String(action) == "off" || String(action) == "OFF") {
      setPump(false);
      Serial.println("🛑 [RELÉ DESACTIVADO - BOMBA OFF]");
      sendAck(commandId, "ACKNOWLEDGED");
      publishTelemetry();
    }
  }
}

void reconnect() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }
  
  if (!client.connected()) {
    Serial.print("🔄 Conectando a Broker MQTT en Raspberry Pi...");
    if (client.connect(DEVICE_ID)) {
      Serial.println(" ¡Conectado!");
      client.subscribe(topic_commands);
      Serial.print("📡 Suscrito al tópico de comandos: ");
      Serial.println(topic_commands);
    } else {
      Serial.print(" Falló conexión MQTT, rc=");
      Serial.print(client.state());
      Serial.println(" (reintentará en segundo plano)");
    }
  }
}

void setup() {
  pinMode(PUMP_PIN, OUTPUT);
  setPump(false); // Arrancar apagada por seguridad

  Serial.begin(115200);
  delay(500);
  Serial.println("\n🌿 FloraSense IoT - Firmware NodeMCU ESP8266 (1 Hz Mode)");

  sprintf(topic_telemetry, "iot/v1/devices/%s/telemetry", DEVICE_ID);
  sprintf(topic_commands, "iot/v1/devices/%s/commands", DEVICE_ID);
  sprintf(topic_acks, "iot/v1/devices/%s/acks", DEVICE_ID);

  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!client.connected()) {
      static unsigned long lastReconnect = 0;
      if (millis() - lastReconnect > 5000) {
        lastReconnect = millis();
        reconnect();
      }
    } else {
      client.loop();
    }
  }

  // ============================================================================
  // ENVÍO DE TELEMETRÍA CADA 1 SEGUNDO (1 Hz)
  // ============================================================================
  unsigned long now = millis();
  if (now - lastMsg >= TELEMETRY_INTERVAL_MS) {
    lastMsg = now;
    publishTelemetry();
  }
}
