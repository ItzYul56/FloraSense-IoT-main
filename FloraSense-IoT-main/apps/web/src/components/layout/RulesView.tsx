"use client";
import { apiFetch } from '../../lib/api';


import React, { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { LoginView } from './LoginView';
import { TopographicPattern } from '../ui/TopographicPattern';

type IrrigationRule = {
  id: string;
  enabled: boolean;
  startBelowPct: number;
  stopAbovePct: number;
  maxRuntimeSeconds: number;
  cooldownSeconds: number;
};

export function RulesView() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [rule, setRule] = useState<IrrigationRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [startBelowPct, setStartBelowPct] = useState(40);
  const [stopAbovePct, setStopAbovePct] = useState(70);
  const [maxRuntimeSeconds, setMaxRuntimeSeconds] = useState(30);
  const [cooldownSeconds, setCooldownSeconds] = useState(60);

  useEffect(() => {
    const isAuth = localStorage.getItem('fs_auth_token') === 'true';
    setIsAuthenticated(isAuth);
  }, []);

  const handleLogin = () => {
    localStorage.setItem('fs_auth_token', 'true');
    setIsAuthenticated(true);
  };

  const fetchRule = async () => {
    try {
      const res = await apiFetch('/api/devices/demo');
      if (res.ok) {
        const json = await res.json();
        const deviceId = json.id;
        
        const ruleRes = await apiFetch(`/api/devices/${deviceId}/rules`);
        if (ruleRes.ok) {
          const ruleJson = await ruleRes.json();
          setRule(ruleJson);
          setStartBelowPct(ruleJson.startBelowPct);
          setStopAbovePct(ruleJson.stopAbovePct);
          setMaxRuntimeSeconds(ruleJson.maxRuntimeSeconds);
          setCooldownSeconds(ruleJson.cooldownSeconds);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchRule();
    }
  }, [isAuthenticated]);

  const handleSave = async () => {
    if (!rule) return;
    setSaving(true);
    try {
      const res = await apiFetch('/api/devices/demo');
      const json = await res.json();
      const deviceId = json.id;

      await apiFetch(`/api/devices/${deviceId}/rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startBelowPct,
          stopAbovePct,
          maxRuntimeSeconds,
          cooldownSeconds
        })
      });
      alert('Reglas actualizadas exitosamente');
    } catch (e) {
      console.error(e);
      alert('Error guardando las reglas');
    } finally {
      setSaving(false);
    }
  };

  if (isAuthenticated === null) return <div className="min-h-screen bg-canvas" />;
  if (!isAuthenticated) return <LoginView onLogin={handleLogin} />;

  return (
    <div className="flex h-screen bg-canvas overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col h-full relative overflow-y-auto">
        <TopographicPattern />
        
        <main className="flex-1 p-6 md:p-10 lg:p-14 max-w-[800px] mx-auto w-full relative z-10">
          <header className="mb-10">
            <h1 className="font-display text-5xl text-ink mb-2">Reglas de Riego</h1>
            <p className="text-ink-soft">Configura el comportamiento automático de tu campo.</p>
          </header>

          {loading ? (
            <div className="py-8 text-ink-soft">Cargando reglas...</div>
          ) : (
            <div className="flex flex-col gap-8">
              <div className="border border-line rounded-[32px] p-8 lg:p-12 bg-canvas-elevated shadow-sm">
                
                <div className="flex flex-col gap-8">
                  <div>
                    <label className="block text-sm font-bold tracking-widest uppercase text-ink-soft mb-4">
                      Umbral de Inicio (Suelo Seco)
                    </label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="range" 
                        min="10" max="80" 
                        value={startBelowPct} 
                        onChange={(e) => setStartBelowPct(Number(e.target.value))}
                        className="flex-1 accent-water"
                      />
                      <span className="font-mono-data text-2xl text-ink w-16 text-right">{startBelowPct}%</span>
                    </div>
                    <p className="text-sm text-ink-soft mt-2">La bomba se encenderá automáticamente cuando la humedad caiga por debajo de este valor.</p>
                  </div>

                  <div className="h-px bg-line w-full" />

                  <div>
                    <label className="block text-sm font-bold tracking-widest uppercase text-ink-soft mb-4">
                      Umbral de Parada (Suelo Húmedo)
                    </label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="range" 
                        min="40" max="95" 
                        value={stopAbovePct} 
                        onChange={(e) => setStopAbovePct(Number(e.target.value))}
                        className="flex-1 accent-moss"
                      />
                      <span className="font-mono-data text-2xl text-ink w-16 text-right">{stopAbovePct}%</span>
                    </div>
                    <p className="text-sm text-ink-soft mt-2">El riego se detendrá de forma anticipada si la humedad alcanza este valor ideal, ahorrando agua.</p>
                  </div>

                  <div className="h-px bg-line w-full" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-sm font-bold tracking-widest uppercase text-ink-soft mb-4">
                        Tiempo Máximo
                      </label>
                      <div className="flex items-center gap-4">
                        <input 
                          type="number" 
                          value={maxRuntimeSeconds}
                          onChange={(e) => setMaxRuntimeSeconds(Number(e.target.value))}
                          className="bg-canvas border border-line rounded-xl px-4 py-3 text-ink font-mono-data w-32"
                        />
                        <span className="text-ink font-medium">segundos</span>
                      </div>
                      <p className="text-sm text-ink-soft mt-2">Seguro contra inundaciones.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-bold tracking-widest uppercase text-ink-soft mb-4">
                        Descanso
                      </label>
                      <div className="flex items-center gap-4">
                        <input 
                          type="number" 
                          value={cooldownSeconds}
                          onChange={(e) => setCooldownSeconds(Number(e.target.value))}
                          className="bg-canvas border border-line rounded-xl px-4 py-3 text-ink font-mono-data w-32"
                        />
                        <span className="text-ink font-medium">segundos</span>
                      </div>
                      <p className="text-sm text-ink-soft mt-2">Tiempo de pausa entre riegos automáticos para evitar ciclos infinitos.</p>
                    </div>
                  </div>

                  <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="mt-6 bg-ink text-canvas font-bold uppercase tracking-widest text-sm py-4 px-8 rounded-xl hover:bg-ink/90 transition-colors"
                  >
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
