#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ==========================================
// CONFIGURACIÓN DE RED Y MQTT
// ==========================================
const char* ssid = "TU_RED_WIFI";
const char* password = "TU_PASSWORD_WIFI";

// Dirección IP local de tu computadora ejecutando Docker (ej: 192.168.1.50)
const char* mqtt_server = "IP_DE_TU_PC_CON_DOCKER"; 
const int mqtt_port = 1883;

// Credenciales generadas en el panel FloraSense
const char* DEVICE_ID = "123e4567-e89b-12d3-a456-426614174000"; // Reemplaza por el ID mostrado en /settings
const char* DEVICE_KEY = "key-123e4567-e89b-12d3-a456-426614174000"; // Si mosquitto pide pass a futuro

// ==========================================
// CONFIGURACIÓN DE HARDWARE (PINES ESP8266)
// ==========================================
// Pin Analógico (A0) - Sensor de Humedad de Suelo YL-69
const int SOIL_MOISTURE_PIN = A0;

// Pin Digital (D1 -> GPIO5) - Relé de la Bomba de Agua 5V
const int PUMP_PIN = 5; 

// Calibración del sensor de humedad
const int DRY_VALUE = 1023; // Valor cuando el sensor está al aire libre (seco)
const int WET_VALUE = 300;  // Valor cuando el sensor está en un vaso con agua (húmedo)

// ==========================================
// VARIABLES GLOBALES
// ==========================================
WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastMsg = 0;
bool isPumpOn = false;

// Tópicos MQTT
char topic_telemetry[100];
char topic_commands[100];
char topic_acks[100];

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Conectando a ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi conectado!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Mensaje recibido [");
  Serial.print(topic);
  Serial.print("]: ");
  
  String messageTemp;
  for (unsigned int i = 0; i < length; i++) {
    messageTemp += (char)payload[i];
  }
  Serial.println(messageTemp);

  // Analizar JSON del comando
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, messageTemp);

  if (error) {
    Serial.print("Error al parsear JSON: ");
    Serial.println(error.c_str());
    return;
  }

  if (String(topic) == topic_commands) {
    const char* action = doc["action"];
    const char* commandId = doc["commandId"];
    
    if (String(action) == "on") {
      digitalWrite(PUMP_PIN, HIGH); // Encender relé (Asumiendo relé activo en HIGH. Cambiar a LOW si es módulo invertido)
      isPumpOn = true;
      Serial.println("[BOMBA ENCENDIDA]");
      sendAck(commandId, "ACKNOWLEDGED");
      publishTelemetry(); // Actualizar estado inmediatamente
    } 
    else if (String(action) == "off") {
      digitalWrite(PUMP_PIN, LOW); // Apagar relé
      isPumpOn = false;
      Serial.println("[BOMBA APAGADA]");
      sendAck(commandId, "ACKNOWLEDGED");
      publishTelemetry(); // Actualizar estado inmediatamente
    }
  }
}

void reconnect() {
  // Loop hasta que nos conectemos
  while (!client.connected()) {
    Serial.print("Intentando conexión MQTT...");
    // Intentar conectar con el DEVICE_ID
    if (client.connect(DEVICE_ID)) {
      Serial.println("conectado");
      // Suscribirse a los comandos
      client.subscribe(topic_commands);
      Serial.print("Suscrito a: ");
      Serial.println(topic_commands);
    } else {
      Serial.print("falló, rc=");
      Serial.print(client.state());
      Serial.println(" intentando de nuevo en 5 segundos");
      delay(5000);
    }
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
  client.publish(topic_acks, jsonBuffer);
}

void publishTelemetry() {
  int rawValue = analogRead(SOIL_MOISTURE_PIN);
  
  // Mapear el valor analógico a un porcentaje (0% a 100%)
  // constrain() asegura que no salgamos de los límites aunque el sensor dé valores extraños
  int pct = map(rawValue, DRY_VALUE, WET_VALUE, 0, 100);
  pct = constrain(pct, 0, 100);

  long rssi = WiFi.RSSI();

  StaticJsonDocument<256> doc;
  doc["version"] = 1;
  doc["deviceId"] = DEVICE_ID;
  // ESP8266 no tiene sensor de temp interno confiable, se deja un mock. 
  // Podrías conectar un DHT11 al pin D2 en el futuro.
  doc["temperatureC"] = 24.5; 
  doc["airHumidityPct"] = 50.0;
  doc["soilMoistureRaw"] = rawValue;
  doc["soilMoisturePct"] = (float)pct;
  doc["pumpOn"] = isPumpOn;
  doc["rssi"] = rssi;

  char jsonBuffer[256];
  serializeJson(doc, jsonBuffer);

  Serial.print("Publicando telemetría: ");
  Serial.println(jsonBuffer);
  client.publish(topic_telemetry, jsonBuffer);
}

void setup() {
  pinMode(PUMP_PIN, OUTPUT);
  digitalWrite(PUMP_PIN, LOW); // Asegurar que arranque apagada
  
  Serial.begin(115200);

  // Formatear tópicos dinámicamente
  sprintf(topic_telemetry, "iot/v1/devices/%s/telemetry", DEVICE_ID);
  sprintf(topic_commands, "iot/v1/devices/%s/commands", DEVICE_ID);
  sprintf(topic_acks, "iot/v1/devices/%s/acks", DEVICE_ID);

  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // Enviar telemetría cada 10 segundos
  unsigned long now = millis();
  if (now - lastMsg > 10000) {
    lastMsg = now;
    publishTelemetry();
  }
}
