"use client";
import { apiFetch } from '../../lib/api';


import React, { useState } from 'react';
import { Wind, Clock, Power, Loader2 } from 'lucide-react';

export function FanControl({ deviceId, fanOn, lastCycle, onRefresh }: { deviceId: string, fanOn: boolean, lastCycle?: string, onRefresh?: () => void }) {
  const [loading, setLoading] = useState(false);

  const toggleFan = async () => {
    const action = fanOn ? 'off' : 'on';
    setLoading(true);
    try {
      await apiFetch(`/api/devices/${deviceId}/fan/${action}`, {
        method: 'POST',
      });
      // Esperamos medio segundo para que el simulador mande la telemetría nueva
      setTimeout(() => {
        if (onRefresh) onRefresh();
      }, 500);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-line rounded-[32px] p-8 relative overflow-hidden bg-canvas-elevated shadow-sm">
      {fanOn && (
        <div className="absolute inset-0 bg-water/5 animate-pulse" />
      )}
      
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div>
          <h3 className="font-display text-3xl mb-1 text-ink">Ventilación</h3>
          {fanOn ? (
            <div className="mt-4">
              <div className="flex items-center gap-3 text-water font-medium mb-2">
                <Wind className="w-5 h-5 animate-bounce" />
                <span>Extractor Activa</span>
              </div>
              <div className="font-mono-data text-sm opacity-80 mt-1">
                Flujo continuo en progreso...
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <div className="flex items-center gap-3 text-ink-soft mb-2">
                <Power className="w-5 h-5" />
                <span>Extractor en reposo</span>
              </div>
              {lastCycle && (
                <div className="flex items-center gap-2 font-mono-data text-xs text-ink-soft mt-3">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Último ciclo: {lastCycle}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <button 
          onClick={toggleFan}
          disabled={loading}
          className={`mt-8 w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold tracking-widest text-xs uppercase transition-colors
            ${fanOn 
              ? 'bg-warning/10 text-warning hover:bg-warning/20' 
              : 'bg-water text-canvas hover:bg-water-soft'
            }
          `}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
          {fanOn ? 'Apagar Manualmente' : 'Forzar Ventilación Manual'}
        </button>
      </div>
    </div>
  );
}
