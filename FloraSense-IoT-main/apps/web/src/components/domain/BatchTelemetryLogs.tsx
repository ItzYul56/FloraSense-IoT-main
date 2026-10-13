"use client";

import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { RefreshCw, Clock, Droplets, Thermometer, Wind, Wifi, Database, CheckCircle2, Layers } from 'lucide-react';

type TelemetryRow = {
  id: string;
  recordedAt: string;
  temperatureC: number | null;
  airHumidityPct: number | null;
  soilMoistureRaw: number | null;
  soilMoisturePct: number | null;
  pumpOn: boolean;
  fanOn: boolean;
  rssi: number | null;
};

export function BatchTelemetryLogs({ deviceId }: { deviceId: string }) {
  const [logs, setLogs] = useState<TelemetryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(15);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/devices/${deviceId}/telemetry?limit=${limit}&order=desc&_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
        if (data.length > 0) {
          setLastSyncTime(new Date(data[0].recordedAt));
        }
      }
    } catch (e) {
      console.error('Error cargando logs de telemetría:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // Auto-refresco suave cada 15 segundos para capturar nuevos lotes de 5 minutos
    const interval = setInterval(fetchLogs, 15000);
    return () => clearInterval(interval);
  }, [deviceId, limit]);

  // Formatear fecha y hora local de Chile / América Latina
  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('es-CL', {
        timeZone: 'America/Santiago',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }) + ' • ' + date.toLocaleDateString('es-CL', {
        timeZone: 'America/Santiago',
        day: '2-digit',
        month: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getTimeAgo = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const sec = Math.floor(diffMs / 1000);
      if (sec < 60) return `hace ${sec}s`;
      const min = Math.floor(sec / 60);
      if (min < 60) return `hace ${min}m`;
      const hours = Math.floor(min / 60);
      return `hace ${hours}h`;
    } catch {
      return '';
    }
  };

  return (
    <div className="border border-line rounded-[32px] p-8 lg:p-10 bg-canvas-elevated shadow-sm relative overflow-hidden flex flex-col">
      {/* Fondo estético superior sutil */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-moss/5 to-transparent pointer-events-none" />

      {/* Cabecera del apartado */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2 rounded-xl bg-moss/10 text-moss">
              <Database className="w-5 h-5" />
            </span>
            <h2 className="font-display text-3xl md:text-4xl text-ink">
              Registro de Sensores (Lotes cada 5 min)
            </h2>
          </div>
          <p className="text-ink-soft text-sm flex items-center gap-2">
            <span>Sincronización en segundo plano desde la Raspberry Pi hacia AWS PostgreSQL</span>
            <span className="inline-block w-2 h-2 rounded-full bg-moss animate-pulse" />
          </p>
        </div>

        {/* Acciones y Filtros */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          {/* Selector de límite */}
          <div className="flex items-center bg-line/60 rounded-xl p-1 text-xs font-mono-data">
            {[10, 25, 50].map((n) => (
              <button
                key={n}
                onClick={() => setLimit(n)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  limit === n
                    ? 'bg-canvas text-ink font-bold shadow-xs'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          {/* Botón de refresco manual */}
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-2.5 rounded-xl border border-line bg-canvas hover:bg-line/40 transition-colors text-ink disabled:opacity-50"
            title="Actualizar registros ahora"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-moss' : ''}`} />
          </button>
        </div>
      </div>

      {/* Banner de estado del último lote */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="border border-line/80 rounded-2xl p-4 bg-canvas/60 flex items-center gap-3">
          <Clock className="w-5 h-5 text-water" />
          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink-soft font-bold">Último Lote Recibido</div>
            <div className="text-sm font-mono-data text-ink font-semibold">
              {lastSyncTime ? `${formatDateTime(lastSyncTime.toISOString())} (${getTimeAgo(lastSyncTime.toISOString())})` : 'Esperando datos...'}
            </div>
          </div>
        </div>

        <div className="border border-line/80 rounded-2xl p-4 bg-canvas/60 flex items-center gap-3">
          <Layers className="w-5 h-5 text-moss" />
          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink-soft font-bold">Registros en Pantalla</div>
            <div className="text-sm font-mono-data text-ink font-semibold">
              {logs.length} lecturas mostradas (de las más recientes)
            </div>
          </div>
        </div>

        <div className="border border-line/80 rounded-2xl p-4 bg-canvas/60 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink-soft font-bold">Frecuencia de Ingesta</div>
            <div className="text-sm font-mono-data text-ink font-semibold">
              Captura: 1 Hz • Sync AWS: 5 min
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Telemetría */}
      <div className="relative z-10 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full text-left text-sm font-mono-data border-collapse">
          <thead>
            <tr className="bg-line/40 text-ink-soft text-xs uppercase tracking-wider border-b border-line">
              <th className="py-3 px-4">Hora (Chile)</th>
              <th className="py-3 px-4">
                <span className="flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-moss" /> Suelo
                </span>
              </th>
              <th className="py-3 px-4">
                <span className="flex items-center gap-1.5">
                  <Thermometer className="w-3.5 h-3.5 text-warning" /> Temperatura
                </span>
              </th>
              <th className="py-3 px-4">
                <span className="flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-water" /> Hum. Aire
                </span>
              </th>
              <th className="py-3 px-4">ADC Crudo</th>
              <th className="py-3 px-4">Bomba</th>
              <th className="py-3 px-4">Ventilador</th>
              <th className="py-3 px-4">
                <span className="flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5" /> Señal
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60 bg-canvas">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-ink-soft font-sans">
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-moss" />
                      <span>Consultando telemetría en AWS PostgreSQL...</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="font-semibold text-ink">Aún no hay lecturas de sensores registradas en AWS.</p>
                      <p className="text-xs">El script de sincronización en la Raspberry Pi enviará el primer lote tras 5 minutos de acumulación.</p>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              logs.map((row, index) => {
                const isRecent = index === 0;
                const soil = row.soilMoisturePct ?? 0;
                let soilBadge = 'bg-moss/10 text-moss border-moss/20';
                if (soil < 40) soilBadge = 'bg-warning/10 text-warning border-warning/20';
                else if (soil > 70) soilBadge = 'bg-water/10 text-water border-water/20';

                return (
                  <tr
                    key={row.id}
                    className={`hover:bg-line/20 transition-colors ${
                      isRecent ? 'bg-moss/5 font-medium' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-xs whitespace-nowrap">
                      <span className="text-ink font-semibold">{formatDateTime(row.recordedAt)}</span>
                      <span className="ml-2 text-[10px] text-ink-soft">({getTimeAgo(row.recordedAt)})</span>
                      {isRecent && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold bg-moss/20 text-moss">
                          Última
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-lg border text-xs font-bold ${soilBadge}`}>
                          {soil.toFixed(1)}%
                        </span>
                        <div className="w-16 h-1.5 bg-line rounded-full overflow-hidden hidden sm:block">
                          <div
                            className="h-full bg-moss rounded-full"
                            style={{ width: `${Math.min(100, Math.max(0, soil))}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-ink">
                      {row.temperatureC !== null ? `${row.temperatureC.toFixed(1)} °C` : '--'}
                    </td>

                    <td className="py-3 px-4 text-ink">
                      {row.airHumidityPct !== null ? `${row.airHumidityPct.toFixed(1)} %` : '--'}
                    </td>

                    <td className="py-3 px-4 text-ink-soft text-xs">
                      {row.soilMoistureRaw ?? '--'}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          row.pumpOn
                            ? 'bg-water text-canvas animate-pulse'
                            : 'bg-line/60 text-ink-soft'
                        }`}
                      >
                        {row.pumpOn ? 'ON' : 'OFF'}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          row.fanOn
                            ? 'bg-warning text-canvas'
                            : 'bg-line/60 text-ink-soft'
                        }`}
                      >
                        {row.fanOn ? 'ON' : 'OFF'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-xs text-ink-soft">
                      {row.rssi ? `${row.rssi} dBm` : '--'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
