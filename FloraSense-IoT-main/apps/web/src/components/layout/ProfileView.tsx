"use client";

import React, { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { LoginView } from './LoginView';
import { TopographicPattern } from '../ui/TopographicPattern';
import { User, Mail, Star, Bell, LogOut, Sprout } from 'lucide-react';

export function ProfileView() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const isAuth = localStorage.getItem('fs_auth_token') === 'true';
    setIsAuthenticated(isAuth);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('fs_auth_token');
    window.location.reload();
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
            <h1 className="font-display text-5xl text-ink mb-2">Mi Perfil</h1>
            <p className="text-ink-soft">Información personal y detalles de tu cuenta en FloraSense.</p>
          </header>

          <div className="flex flex-col gap-8">
            
            {/* Header del Perfil */}
            <div className="border border-line rounded-[32px] p-8 md:p-12 bg-canvas-elevated shadow-sm flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-moss/10 to-transparent pointer-events-none" />
              
              <div className="relative z-10 w-32 h-32 rounded-full border-4 border-canvas shadow-xl bg-ink text-canvas flex items-center justify-center shrink-0">
                <Sprout className="w-16 h-16 text-moss-bright" />
              </div>
              
              <div className="relative z-10 flex-1 text-center md:text-left">
                <h2 className="font-display text-4xl text-ink mb-1">Víctor (Admin)</h2>
                <p className="text-moss font-bold uppercase tracking-widest text-sm mb-4">Administrador Principal</p>
                
                <div className="flex flex-col md:flex-row gap-4 text-sm text-ink-soft">
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <Mail className="w-4 h-4" /> victor@florasense.local
                  </div>
                  <div className="hidden md:block text-line">•</div>
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <Star className="w-4 h-4 text-warning" /> Plan: Enterprise Ilimitado
                  </div>
                </div>
              </div>
            </div>

            {/* Preferencias */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="border border-line rounded-[32px] p-8 bg-canvas-elevated shadow-sm">
                <h3 className="font-bold tracking-widest uppercase text-sm mb-6 text-ink flex items-center gap-2">
                  <User className="w-5 h-5" /> Datos Personales
                </h3>
                
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs uppercase tracking-widest text-ink-soft font-bold block mb-1">Nombre Completo</label>
                    <div className="font-mono-data text-ink bg-line/30 px-4 py-2 rounded-lg">Víctor Administrativo</div>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-widest text-ink-soft font-bold block mb-1">Empresa / Finca</label>
                    <div className="font-mono-data text-ink bg-line/30 px-4 py-2 rounded-lg">FloraSense Central</div>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-widest text-ink-soft font-bold block mb-1">Zona Horaria</label>
                    <div className="font-mono-data text-ink bg-line/30 px-4 py-2 rounded-lg">América/Local (GMT)</div>
                  </div>
                </div>
              </div>

              <div className="border border-line rounded-[32px] p-8 bg-canvas-elevated shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-bold tracking-widest uppercase text-sm mb-6 text-ink flex items-center gap-2">
                    <Bell className="w-5 h-5" /> Preferencias
                  </h3>
                  
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-ink">Alertas por Email</span>
                      <div className="w-12 h-6 bg-moss rounded-full relative cursor-pointer">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-canvas rounded-full" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-ink">Reporte Semanal</span>
                      <div className="w-12 h-6 bg-moss rounded-full relative cursor-pointer">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-canvas rounded-full" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-ink">Tema Oscuro</span>
                      <div className="w-12 h-6 bg-line rounded-full relative cursor-not-allowed opacity-50">
                        <div className="absolute left-1 top-1 w-4 h-4 bg-canvas rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleLogout}
                  className="mt-8 w-full px-6 py-3 border border-warning text-warning hover:bg-warning hover:text-canvas rounded-xl font-bold uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Cerrar Sesión
                </button>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
