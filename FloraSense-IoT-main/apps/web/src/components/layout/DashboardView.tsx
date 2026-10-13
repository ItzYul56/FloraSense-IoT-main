"use client";
import { apiFetch } from '../../lib/api';


import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { HealthStrip } from '../domain/HealthStrip';
import { SoilMoistureInstrument } from '../domain/SoilMoistureInstrument';
import { PumpControl } from '../domain/PumpControl';
import { FanControl } from '../domain/FanControl';
import { EnvironmentalReading } from '../domain/EnvironmentalReading';
import { Sidebar } from './Sidebar';
import { TopographicPattern } from '../ui/TopographicPattern';
import { HistoryChart } from '../charts/HistoryChart';
import { AirHistoryChart } from '../charts/AirHistoryChart';
import { BatchTelemetryLogs } from '../domain/BatchTelemetryLogs';
import { LoginView } from './LoginView';
const safeGetItem = (k: string) => { try { return typeof window !== 'undefined' ? window.localStorage.getItem(k) : null; } catch(e) { return null; } };
const safeSetItem = (k: string, v: string) => { try { if (typeof window !== 'undefined') window.localStorage.setItem(k, v); } catch(e) {} };


type DeviceData = {
  id: string;
  name: string;
  status: 'ONLINE' | 'OFFLINE';
  lastTelemetry: {
    temperatureC: number;
    airHumidityPct: number;
    soilMoisturePct: number;
    pumpOn: boolean;
    timestamp: string;
  } | null;
};

type LastEvent = {
  startedAt: string;
  durationSeconds: number | null;
};

export function DashboardView() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [data, setData] = useState<DeviceData | null>(null);
  const [lastEvent, setLastEvent] = useState<LastEvent | null>(null);
  const [loading, setLoading] = useState(true);

  // Check auth on mount
  useEffect(() => {
    const isAuth = safeGetItem('fs_auth_token') === 'true';
    setIsAuthenticated(isAuth);
  }, []);

  const handleLogin = () => {
    safeSetItem('fs_auth_token', 'true');
    setIsAuthenticated(true);
  };

  const fetchDevice = async () => {
    if (!isAuthenticated) return;
    try {
      const activeId = typeof window !== 'undefined' ? window.localStorage.getItem('fs_active_device') : null;
      const url = activeId 
        ? `/api/devices/demo?id=${activeId}&_t=${Date.now()}`
        : `/api/devices/demo?_t=${Date.now()}`;
      const res = await apiFetch(url);
      if (res.ok) {
        const text = await res.text();
        if (!text) {
          setData(null);
          return;
        }
        const json = JSON.parse(text);
        setData(json);
        
        // Also fetch the last event
        const evtRes = await apiFetch(`/api/devices/${json.id}/events`);
        if (evtRes.ok) {
           const events = await evtRes.json();
           if (events && events.length > 0) {
             setLastEvent(events[0]);
           }
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
      fetchDevice();
      const interval = setInterval(fetchDevice, 2000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  if (isAuthenticated === null) {
    return <div className="min-h-screen bg-canvas" />; 
  }

  if (!isAuthenticated) {
    return <LoginView onLogin={handleLogin} />;
  }

  if (loading && !data) {
    return (
      <div className="flex h-screen bg-canvas items-center justify-center">
        <div className="text-ink-soft animate-pulse font-mono-data tracking-widest uppercase">Cargando instrumentos...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-screen bg-canvas items-center justify-center">
        <div className="text-center">
          <h2 className="font-display text-4xl mb-4 text-ink">Aún no hay dispositivo</h2>
          <p className="text-ink-soft">Registra tu ESP32 para comenzar a recibir datos.</p>
        </div>
      </div>
    );
  }

  const { lastTelemetry } = data;
  
  let lastReadingText = "Sin datos";
  if (lastTelemetry?.timestamp) {
    const diffMs = new Date().getTime() - new Date(lastTelemetry.timestamp).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    lastReadingText = diffSec < 60 ? `hace ${diffSec} s` : `hace ${Math.floor(diffSec/60)} min`;
  }

  let soilStatus: 'SECO' | 'OPTIMO' | 'SATURADO' | 'OFFLINE' = 'OFFLINE';
  if (lastTelemetry) {
    if (lastTelemetry.soilMoisturePct < 40) soilStatus = 'SECO';
    else if (lastTelemetry.soilMoisturePct > 70) soilStatus = 'SATURADO';
    else soilStatus = 'OPTIMO';
  }

  const isCritical = lastTelemetry && lastTelemetry.soilMoisturePct >= 100;

  // Format last cycle text
  let lastCycleText = "Nunca";
  if (lastEvent) {
     const dt = new Date(lastEvent.startedAt);
     const timeStr = dt.toLocaleTimeString('es-CL', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', hour12: false });
     if (lastEvent.durationSeconds) {
       lastCycleText = `${timeStr} • ${lastEvent.durationSeconds}s`;
     } else {
       lastCycleText = `${timeStr} • En curso...`;
     }
  }

  return (
    <div className="flex h-screen bg-canvas overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col h-full relative overflow-y-auto">
        <TopographicPattern />
        
        <HealthStrip 
          deviceId={data.id.substring(0, 8)}
          status={data.status}
          lastReading={lastReadingText}
          pumpStatus={lastTelemetry?.pumpOn ? 'ON' : 'OFF'}
        />
        
        <main className="flex-1 p-6 md:p-10 lg:p-14 max-w-[1400px] mx-auto w-full relative z-10">
          <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-5xl text-ink mb-2">{data.name}</h1>
              <div className="flex items-center gap-3 text-ink-soft text-sm font-mono-data uppercase tracking-wider">
                <span className="bg-line px-2 py-0.5 rounded text-ink">Modo Auto</span>
                <span>•</span>
                <span>Sync: {lastReadingText}</span>
              </div>
            </div>
            <div className="text-right hidden md:block">
              <div className="text-3xl font-display text-ink">Hoy</div>
              <div className="text-sm text-ink-soft">Riego Inteligente</div>
            </div>
          </header>

                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
            {/* --- FILA 1: SUELO Y RIEGO --- */}
            <div className="col-span-1 lg:col-span-8 flex flex-col">
              <div className="border border-line rounded-[32px] p-8 lg:p-12 bg-canvas-elevated shadow-sm relative overflow-hidden h-full flex flex-col">
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-moss/5 to-transparent pointer-events-none" />
                <div className="relative z-10 flex justify-between items-start mb-12">
                  <h2 className="font-display text-4xl text-ink">Estado del suelo</h2>
                  <div className="text-right">
                    <div className="text-xs text-ink-soft uppercase tracking-widest font-bold mb-1">Tendencia</div>
                    <div className="font-mono-data text-moss font-medium">Estable</div>
                  </div>
                </div>
                
                <div className="mb-12 relative z-10">
                  {lastTelemetry ? (
                    <div className="w-full">
                      <SoilMoistureInstrument 
                        valuePct={lastTelemetry.soilMoisturePct} 
                        status={soilStatus} 
                      />
                    </div>
                  ) : (
                    <div className="py-8 text-center text-ink-soft">Esperando lectura...</div>
                  )}
                </div>

                {/* Gráfica incrustada */}
                <div className="flex-grow min-h-[200px] relative z-10 flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-ink-soft">Historial de Humedad</h3>
                    <Link href="/history">
                      <button className="text-xs font-bold uppercase tracking-widest text-water hover:text-water-soft transition-colors">
                        Ver reporte
                      </button>
                    </Link>
                  </div>
                  <div className="flex-grow">
                    <HistoryChart currentMoisture={lastTelemetry?.soilMoisturePct} deviceId={data.id} />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-1 lg:col-span-4 flex flex-col gap-8">
              <PumpControl 
                deviceId={data.id}
                pumpOn={lastTelemetry?.pumpOn || false}
                lastCycle={lastCycleText}
                onRefresh={fetchDevice}
              />

              <div className={`border rounded-[32px] p-8 relative overflow-hidden transition-colors duration-500 flex-grow ${isCritical ? 'bg-warning border-warning text-canvas' : 'bg-ink border-line text-canvas'}`}>
                <TopographicPattern className="opacity-10 text-moss-bright" />
                <div className="relative z-10">
                  <h3 className={`text-xs font-bold tracking-widest uppercase mb-4 ${isCritical ? 'text-canvas/80' : 'text-moss-bright'}`}>
                    Análisis Automático
                  </h3>
                  <p className="font-display text-2xl leading-snug">
                    {isCritical
                      ? '"Los niveles muy altos de humedad pueden ser dañinos. Se ha forzado el apagado por seguridad."'
                      : lastTelemetry && lastTelemetry.soilMoisturePct < 40
                        ? '"Nivel de humedad crítico. Requiere ciclo de riego pronto."'
                        : '"El suelo se mantiene dentro del rango objetivo. No se requiere riego inmediato."'}
                  </p>
                </div>
              </div>
            </div>
          </div>

                    {/* --- FILA 2: CLIMA Y VENTILACION --- */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="col-span-1 lg:col-span-8 flex flex-col">
              <div className="border border-line rounded-[32px] p-8 bg-canvas-elevated shadow-sm h-full flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-display text-3xl text-ink">Historial de Humedad de Aire</h3>
                  <Link href="/history">
                    <button className="text-xs font-bold uppercase tracking-widest text-water hover:text-water-soft transition-colors">
                      Ver reporte
                    </button>
                  </Link>
                </div>
                <div className="flex-grow min-h-[300px]">
                  <AirHistoryChart currentHumidity={lastTelemetry?.airHumidityPct} deviceId={data.id} />
                </div>
              </div>
            </div>

            <div className="col-span-1 lg:col-span-4 flex flex-col gap-8">
              <EnvironmentalReading 
                temp={lastTelemetry?.temperatureC || 0}
                humidity={lastTelemetry?.airHumidityPct || 0}
                trendText={`El ambiente se mantiene estable. Última variación registrada hace unos instantes.`}
              />

              <FanControl 
                deviceId={data.id}
                fanOn={lastTelemetry?.fanOn || false}
                lastCycle="Nunca"
                onRefresh={fetchDevice}
              />

              <div className={`border rounded-[32px] p-8 relative overflow-hidden transition-colors duration-500 flex-grow ${
                (lastTelemetry && lastTelemetry.temperatureC > 28) 
                  ? 'bg-warning border-warning text-canvas' 
                  : (lastTelemetry && lastTelemetry.temperatureC < 15)
                    ? 'bg-water border-water text-canvas'
                    : 'bg-ink border-line text-canvas'
              }`}>
                <TopographicPattern className="opacity-10 text-moss-bright" />
                <div className="relative z-10">
                  <h3 className={`text-xs font-bold tracking-widest uppercase mb-4 ${
                    (lastTelemetry && (lastTelemetry.temperatureC > 28 || lastTelemetry.temperatureC < 15)) 
                      ? 'text-canvas/80' 
                      : 'text-moss-bright'
                  }`}>
                    Análisis Climático
                  </h3>
                  <p className="font-display text-2xl leading-snug">
                    {lastTelemetry && lastTelemetry.temperatureC > 28
                      ? '"Temperatura elevada. Se recomienda encender la extracción para disipar el calor."'
                      : lastTelemetry && lastTelemetry.temperatureC < 15
                        ? '"Temperatura baja. El metabolismo y desarrollo de la planta podría ralentizarse."'
                        : '"Clima en rango óptimo para el desarrollo vegetativo. No se requiere acción."'}
                  </p>
                </div>
              </div>
          </div>

          {/* --- FILA 3: REGISTRO DE SENSORES SINCRONIZADOS (CADA 5 MINUTOS) --- */}
          <div className="mt-8 mb-12">
            <BatchTelemetryLogs deviceId={data.id} />
          </div>
          </main>
      </div>
    </div>
  );
}
