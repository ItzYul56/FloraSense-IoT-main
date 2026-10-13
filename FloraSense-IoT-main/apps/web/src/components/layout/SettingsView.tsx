"use client";
import { apiFetch } from '../../lib/api';

import React, { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { LoginView } from './LoginView';
import { TopographicPattern } from '../ui/TopographicPattern';
import { Smartphone, Wifi, Shield, RefreshCw, X, CheckCircle, AlertTriangle } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

export function SettingsView() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  // Devices state
  const [devices, setDevices] = useState<any[]>([]);
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceKey, setNewDeviceKey] = useState<string | null>(null);
  const [newDeviceId, setNewDeviceId] = useState<string | null>(null);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);

  // MQTT state
  const [mqttStatus, setMqttStatus] = useState<any>(null);
  const [pinging, setPinging] = useState(false);

  // Security state
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secError, setSecError] = useState('');
  const [secSuccess, setSecSuccess] = useState('');
  const [secLoading, setSecLoading] = useState(false);

  useEffect(() => {
    const isAuth = localStorage.getItem('fs_auth_token') === 'true';
    setIsAuthenticated(isAuth);
    if (typeof window !== 'undefined') {
      setActiveDeviceId(localStorage.getItem('fs_active_device'));
    }
    if (isAuth) {
      loadDevices();
      pingMqtt();
    }
  }, []);

  const loadDevices = async () => {
    try {
      const res = await apiFetch('/api/devices');
      const data = await res.json();
      setDevices(data);
    } catch (e) {
      console.error('Error cargando dispositivos:', e);
    }
  };

  const pingMqtt = async () => {
    setPinging(true);
    try {
      const res = await apiFetch('/api/system/mqtt-status');
      const data = await res.json();
      setMqttStatus(data);
    } catch (e) {
      console.error('Error MQTT:', e);
    } finally {
      setPinging(false);
    }
  };

  
  const handleDeleteDevice = async (id: string, name: string) => {
    MySwal.fire({
      title: '¿Estás seguro?',
      text: `¿Estás seguro que deseas eliminar este dispositivo ("${name}")?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--color-warning)',
      cancelButtonColor: 'var(--color-ink-soft)',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: 'var(--color-canvas)',
      color: 'var(--color-ink)'
    }).then((result) => {
      if (result.isConfirmed) {
        MySwal.fire({
          title: 'Confirmar Identidad',
          input: 'password',
          inputPlaceholder: 'Ingresa tu contraseña',
          inputAttributes: {
            autocapitalize: 'off',
            autocorrect: 'off'
          },
          showCancelButton: true,
          confirmButtonText: 'Eliminar permanentemente',
          cancelButtonText: 'Cancelar',
          showLoaderOnConfirm: true,
          confirmButtonColor: 'var(--color-warning)',
          background: 'var(--color-canvas)',
          color: 'var(--color-ink)',
          preConfirm: async (password) => {
            try {
              const res = await apiFetch('/api/auth/verify', {
                method: 'POST',
                body: JSON.stringify({ password })
              });
              if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || 'Contraseña incorrecta');
              }
              await apiFetch('/api/devices/' + id, { method: 'DELETE' });
            } catch (error) {
              MySwal.showValidationMessage(error.message);
            }
          },
          allowOutsideClick: () => !MySwal.isLoading()
        }).then((res2) => {
          if (res2.isConfirmed) {
            if (activeDeviceId === id) {
              localStorage.removeItem('fs_active_device');
              setActiveDeviceId(null);
            }
            loadDevices();
            MySwal.fire({
              title: 'Eliminado',
              text: 'El dispositivo ha sido eliminado exitosamente.',
              icon: 'success',
              background: 'var(--color-canvas)',
              color: 'var(--color-ink)',
              confirmButtonColor: 'var(--color-moss)'
            });
          }
        });
      }
    });
  };

  const handleSelectActive = (id: string) => {
    localStorage.setItem('fs_active_device', id);
    setActiveDeviceId(id);
  };

  const handleAddDevice = async () => {
    if (!newDeviceName.trim()) return;
    try {
      const res = await apiFetch('/api/devices', {
        method: 'POST',
        body: JSON.stringify({ name: newDeviceName }),
      });
      const data = await res.json();
      setNewDeviceKey(data.deviceKey);
      setNewDeviceId(data.id);
      loadDevices();
    } catch (e) {
      console.error('Error al añadir:', e);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecError('');
    setSecSuccess('');

    if (newPassword !== confirmPassword) {
      setSecError('Las contraseñas nuevas no coinciden.');
      return;
    }
    if (newPassword.length < 8) {
      setSecError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setSecLoading(true);
    try {
      const res = await apiFetch('/api/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al cambiar contraseña');
      }

      setSecSuccess('¡Contraseña actualizada exitosamente!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setIsSecurityModalOpen(false), 2000);
    } catch (err: any) {
      setSecError(err.message);
    } finally {
      setSecLoading(false);
    }
  };

  if (isAuthenticated === null) return <div className="min-h-screen bg-canvas" />;
  if (!isAuthenticated) return <LoginView onLogin={() => setIsAuthenticated(true)} />;

  return (
    <div className="flex h-screen bg-canvas overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col h-full relative overflow-y-auto">
        <TopographicPattern />
        
        <main className="flex-1 p-6 md:p-10 lg:p-14 max-w-[800px] mx-auto w-full relative z-10">
          <header className="mb-10">
            <h1 className="font-display text-5xl text-ink mb-2">Configuración</h1>
            <p className="text-ink-soft">Administra tus dispositivos y preferencias de la cuenta.</p>
          </header>

          <div className="flex flex-col gap-6">
            
            {/* DISPOSITIVOS */}
            <div className="border border-line rounded-[32px] p-8 bg-canvas-elevated shadow-sm flex flex-col sm:flex-row gap-6 items-start">
              <div className="w-12 h-12 rounded-xl bg-ink/5 flex items-center justify-center shrink-0">
                <Smartphone className="w-6 h-6 text-ink" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold tracking-widest uppercase text-sm mb-1 text-ink">Dispositivos Emparejados</h3>
                <p className="text-ink-soft mb-4">Tienes {devices.length} dispositivo(s) ESP32 activo(s) conectado(s) a tu cuenta.</p>
                
                {devices.length > 0 && (
                  <div className="mb-4 bg-canvas p-4 rounded-xl border border-line text-sm">
                    {devices.map(d => (
                      <div key={d.id} className="flex justify-between items-center py-2 border-b border-line last:border-0 last:pb-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink">{d.name}</span>
                          <span className="text-ink-soft text-xs">({d.status})</span>
                          {activeDeviceId === d.id && (
                            <span className="bg-moss/20 text-moss text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">Activo</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="font-mono-data text-xs text-ink-soft hidden sm:block">ID: {d.id.split('-')[0]}...</div>
                          {activeDeviceId !== d.id && (
                            <button onClick={() => handleSelectActive(d.id)} className="text-xs text-water font-bold uppercase tracking-wider hover:underline">Seleccionar</button>
                          )}
                          <button onClick={() => handleDeleteDevice(d.id, d.name)} className="text-xs text-warning font-bold uppercase tracking-wider hover:underline">Eliminar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button 
                  onClick={() => setIsAddDeviceOpen(true)}
                  className="px-6 py-2 border border-line rounded-lg text-sm font-bold uppercase tracking-widest text-ink hover:bg-line transition-colors">
                  Añadir Nuevo
                </button>
              </div>
            </div>

            {/* MQTT */}
            <div className="border border-line rounded-[32px] p-8 bg-canvas-elevated shadow-sm flex flex-col sm:flex-row gap-6 items-start">
              <div className="w-12 h-12 rounded-xl bg-ink/5 flex items-center justify-center shrink-0">
                <Wifi className="w-6 h-6 text-ink" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold tracking-widest uppercase text-sm mb-1 text-ink">Conexión MQTT</h3>
                <p className="text-ink-soft mb-4">Broker MQTT administrando la telemetría en tiempo real.</p>
                
                {mqttStatus && (
                  <div className="mb-4 text-sm font-mono-data bg-canvas p-3 rounded-lg border border-line flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${mqttStatus.connected ? 'bg-moss' : 'bg-warning'}`} />
                      <span>Estado: {mqttStatus.connected ? 'CONECTADO' : 'DESCONECTADO'}</span>
                    </div>
                    {mqttStatus.connected && (
                      <div className="text-ink-soft ml-4">Subscripciones activas detectadas.</div>
                    )}
                  </div>
                )}

                <button 
                  onClick={pingMqtt}
                  disabled={pinging}
                  className="px-6 py-2 border border-line rounded-lg text-sm font-bold uppercase tracking-widest text-ink hover:bg-line transition-colors flex items-center gap-2 disabled:opacity-50">
                  <RefreshCw className={`w-4 h-4 ${pinging ? 'animate-spin' : ''}`} /> 
                  {pinging ? 'Probando...' : 'Probar Conexión'}
                </button>
              </div>
            </div>

            {/* SEGURIDAD */}
            <div className="border border-line rounded-[32px] p-8 bg-canvas-elevated shadow-sm flex flex-col sm:flex-row gap-6 items-start">
              <div className="w-12 h-12 rounded-xl bg-ink/5 flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6 text-ink" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold tracking-widest uppercase text-sm mb-1 text-ink">Seguridad de la Cuenta</h3>
                <p className="text-ink-soft mb-4">Actualiza tus credenciales cifradas (OWASP/ASVS) para proteger el acceso a los comandos MQTT.</p>
                <button 
                  onClick={() => setIsSecurityModalOpen(true)}
                  className="px-6 py-2 border border-line rounded-lg text-sm font-bold uppercase tracking-widest text-ink hover:bg-line transition-colors">
                  Gestionar Seguridad
                </button>
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* ADD DEVICE MODAL */}
      {isAddDeviceOpen && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-canvas rounded-[32px] w-full max-w-4xl p-8 relative shadow-2xl max-h-[90vh] flex flex-col">
            <button 
              onClick={() => { setIsAddDeviceOpen(false); setNewDeviceKey(null); setNewDeviceId(null); setNewDeviceName(''); }}
              className="absolute top-6 right-6 text-ink-soft hover:text-ink z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="font-display text-3xl mb-2">Nuevo ESP8266</h2>
            <p className="text-ink-soft mb-6 shrink-0">Registra un nuevo microcontrolador y obtén el firmware listo para flashear.</p>
            
            {!newDeviceKey ? (
              <div>
                <input 
                  type="text"
                  placeholder="Ej: Invernadero Principal"
                  value={newDeviceName}
                  onChange={e => setNewDeviceName(e.target.value)}
                  className="w-full bg-canvas-elevated border border-line p-4 rounded-xl focus:outline-none focus:border-water text-ink mb-6"
                />
                <button 
                  onClick={handleAddDevice}
                  className="w-full bg-ink text-canvas py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-ink-soft transition-colors"
                >
                  Generar Firmware
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="bg-moss/10 border border-moss p-4 rounded-xl mb-4 shrink-0">
                  <div className="flex items-center gap-2 text-moss font-bold mb-2">
                    <CheckCircle className="w-5 h-5" /> Dispositivo Registrado Exitosamente
                  </div>
                  <p className="text-sm text-ink-soft">Copia este código y pégalo directamente en Arduino IDE. Ya contiene tu ID único y está configurado para la red de FloraSense.</p>
                </div>
                
                <div className="flex-1 overflow-auto bg-[#1e1e1e] rounded-xl p-4 text-xs font-mono-data text-gray-300 select-all border border-line shadow-inner">
                  <pre><code>{`#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ==========================================
// CONFIGURACIÓN DE RED Y MQTT
// ==========================================
const char* ssid = "TU_RED_WIFI";
const char* password = "TU_PASSWORD_WIFI";

// Reemplaza por la IP local de la computadora ejecutando Docker (ej: 192.168.1.50)
const char* mqtt_server = "IP_DE_TU_PC_CON_DOCKER"; 
const int mqtt_port = 1883;

// Credenciales autogeneradas para este dispositivo
const char* DEVICE_ID = "${newDeviceId}";
const char* DEVICE_KEY = "${newDeviceKey}"; 

// ==========================================
// CONFIGURACIÓN DE HARDWARE (PINES ESP8266)
// ==========================================
const int SOIL_MOISTURE_PIN = A0;
const int PUMP_PIN = 5; // D1

const int DRY_VALUE = 1023;
const int WET_VALUE = 300;

WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastMsg = 0;
bool isPumpOn = false;

char topic_telemetry[100];
char topic_commands[100];
char topic_acks[100];

void setup_wifi() {
  delay(10);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(500);
}

void callback(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];

  StaticJsonDocument<256> doc;
  if (!deserializeJson(doc, msg)) {
    if (String(topic) == topic_commands) {
      String action = doc["action"];
      if (action == "on") { digitalWrite(PUMP_PIN, HIGH); isPumpOn = true; }
      if (action == "off") { digitalWrite(PUMP_PIN, LOW); isPumpOn = false; }
      publishTelemetry();
    }
  }
}

void reconnect() {
  while (!client.connected()) {
    if (client.connect(DEVICE_ID)) {
      client.subscribe(topic_commands);
    } else {
      delay(5000);
    }
  }
}

void publishTelemetry() {
  int rawValue = analogRead(SOIL_MOISTURE_PIN);
  int pct = constrain(map(rawValue, DRY_VALUE, WET_VALUE, 0, 100), 0, 100);

  StaticJsonDocument<256> doc;
  doc["version"] = 1;
  doc["deviceId"] = DEVICE_ID;
  doc["temperatureC"] = 24.5; 
  doc["airHumidityPct"] = 50.0;
  doc["soilMoistureRaw"] = rawValue;
  doc["soilMoisturePct"] = (float)pct;
  doc["pumpOn"] = isPumpOn;
  doc["rssi"] = WiFi.RSSI();

  char jsonBuffer[256];
  serializeJson(doc, jsonBuffer);
  client.publish(topic_telemetry, jsonBuffer);
}

void setup() {
  pinMode(PUMP_PIN, OUTPUT);
  digitalWrite(PUMP_PIN, LOW);
  
  sprintf(topic_telemetry, "iot/v1/devices/%s/telemetry", DEVICE_ID);
  sprintf(topic_commands, "iot/v1/devices/%s/commands", DEVICE_ID);
  sprintf(topic_acks, "iot/v1/devices/%s/acks", DEVICE_ID);

  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  unsigned long now = millis();
  if (now - lastMsg > 10000) {
    lastMsg = now;
    publishTelemetry();
  }
}`}</code></pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECURITY MODAL */}
      {isSecurityModalOpen && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-canvas rounded-[32px] w-full max-w-lg p-8 relative shadow-2xl">
            <button 
              onClick={() => {
                setIsSecurityModalOpen(false);
                setSecError('');
                setSecSuccess('');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }}
              className="absolute top-6 right-6 text-ink-soft hover:text-ink"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="font-display text-3xl mb-2">Cambiar Contraseña</h2>
            <p className="text-ink-soft mb-6">Asegura tu cuenta actualizando tu clave criptográfica.</p>
            
            {secError && (
              <div className="bg-warning/10 border border-warning text-warning p-4 rounded-xl mb-6 flex items-start gap-3 text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>{secError}</span>
              </div>
            )}

            {secSuccess && (
              <div className="bg-moss/10 border border-moss text-moss p-4 rounded-xl mb-6 flex items-start gap-3 text-sm">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <span>{secSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-ink-soft mb-2">Contraseña Actual</label>
                <input 
                  type="password"
                  required
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="w-full bg-canvas-elevated border border-line p-3 rounded-xl focus:outline-none focus:border-water text-ink"
                />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-ink-soft mb-2">Nueva Contraseña</label>
                <input 
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-canvas-elevated border border-line p-3 rounded-xl focus:outline-none focus:border-water text-ink"
                />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-ink-soft mb-2">Confirmar Nueva Contraseña</label>
                <input 
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-canvas-elevated border border-line p-3 rounded-xl focus:outline-none focus:border-water text-ink"
                />
              </div>

              <button 
                type="submit"
                disabled={secLoading || !!secSuccess}
                className="w-full mt-4 bg-ink text-canvas py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-ink-soft transition-colors disabled:opacity-50"
              >
                {secLoading ? 'Actualizando...' : 'Guardar Cambios'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
