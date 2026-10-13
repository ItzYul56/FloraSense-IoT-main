"use client";
import React, { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { LoginView } from './LoginView';
import { TopographicPattern } from '../ui/TopographicPattern';
import { ShieldCheck, Lock, FileText, Server } from 'lucide-react';

export function PoliciesView() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const isAuth = localStorage.getItem('fs_auth_token') === 'true';
    setIsAuthenticated(isAuth);
  }, []);

  if (isAuthenticated === null) return <div className="min-h-screen bg-canvas" />;
  if (!isAuthenticated) return <LoginView onLogin={() => setIsAuthenticated(true)} />;

  return (
    <div className="flex h-screen bg-canvas overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col h-full relative overflow-y-auto">
        <TopographicPattern />
        
        <main className="flex-1 p-6 md:p-10 lg:p-14 max-w-[800px] mx-auto w-full relative z-10">
          <header className="mb-10">
            <h1 className="font-display text-5xl text-ink mb-2">Políticas de Seguridad</h1>
            <p className="text-ink-soft">Alineación normativa ISO 27001 y OWASP ASVS 5.0 de FloraSense.</p>
          </header>

          <div className="space-y-8">
            <section className="bg-canvas-elevated border border-line rounded-[32px] p-8 shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-ink/5 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6 text-ink" />
                </div>
                <h2 className="font-display text-2xl">Alineación Normativa</h2>
              </div>
              <p className="text-ink-soft leading-relaxed mb-4">
                El ciclo de desarrollo de FloraSense está diseñado con seguridad desde su concepción (Security by Design), cumpliendo con los controles de seguridad internacionales para IoT y datos corporativos:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-ink-soft">
                <li><strong>ISO/IEC 27001:2022:</strong> Sistema de Gestión de Seguridad de la Información (SGSI).</li>
                <li><strong>ISO/IEC 27002:2022:</strong> Controles A.9 (Acceso) y A.10 (Criptografía).</li>
                <li><strong>OWASP Top 10 (2021):</strong> Prevención de vulnerabilidades críticas.</li>
                <li><strong>OWASP ASVS 5.0:</strong> Nivel 2 para aplicaciones que manejan datos sensibles de negocio.</li>
              </ul>
            </section>

            <section className="bg-canvas-elevated border border-line rounded-[32px] p-8 shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-ink/5 flex items-center justify-center shrink-0">
                  <Lock className="w-6 h-6 text-ink" />
                </div>
                <h2 className="font-display text-2xl">Gestión de Accesos y Criptografía</h2>
              </div>
              <div className="space-y-4 text-ink-soft leading-relaxed">
                <p>
                  <strong>Autenticación JWT:</strong> El sistema rechaza cualquier solicitud a la API que no cuente con un token criptográfico validado mediante firmas asimétricas/HMAC. No existen cuentas compartidas o quemadas en el código (hardcoded).
                </p>
                <p>
                  <strong>Cifrado de Credenciales:</strong> Ninguna contraseña se almacena en texto plano. Se utiliza el algoritmo de derivación de claves fuertes <code>Bcrypt</code> con un factor de costo mínimo de 10, previniendo ataques de fuerza bruta y diccionarios.
                </p>
                <p>
                  <strong>Denegación por defecto:</strong> Todos los endpoints de FloraSense implementan Guards de autorización bajo el principio de privilegio mínimo (Zero Trust).
                </p>
              </div>
            </section>

            <section className="bg-canvas-elevated border border-line rounded-[32px] p-8 shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-ink/5 flex items-center justify-center shrink-0">
                  <Server className="w-6 h-6 text-ink" />
                </div>
                <h2 className="font-display text-2xl">Seguridad IoT (Hardware)</h2>
              </div>
              <div className="space-y-4 text-ink-soft leading-relaxed">
                <p>
                  <strong>Device Keys:</strong> Cada microcontrolador (ESP32) que se conecta al sistema requiere credenciales únicas (Device ID y Secret Key). Esto previene ataques de suplantación (Spoofing) sobre el canal MQTT.
                </p>
                <p>
                  <strong>Trazabilidad (Logs):</strong> Toda acción crítica de hardware, como forzar el encendido manual de la bomba, queda registrada de forma inmutable con su marca de tiempo (timestamp) e identidad del usuario que la provocó (Audit Logging).
                </p>
              </div>
            </section>

            <div className="text-center text-xs text-ink-soft font-mono-data py-8 uppercase tracking-widest">
              Documento confidencial - Propiedad de FloraSense v1.0
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
