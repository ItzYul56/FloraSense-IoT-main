"use client";
import { apiFetch } from '../../lib/api';


import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

type TelemetryPoint = {
  recordedAt: string;
  airHumidityPct: number;
  temperatureC: number;
};

export function AirHistoryChart({ currentHumidity, deviceId }: { currentHumidity?: number; deviceId?: string }) {
  const [data, setData] = useState<{ time: string; Humedad: number; temp: number }[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!deviceId) return;
    
    let isMounted = true;
    
    const fetchTelemetry = async () => {
      try {
        const res = await apiFetch(`/api/devices/${deviceId}/telemetry`);
        if (res.ok) {
          const telemetryList: TelemetryPoint[] = await res.json();
          if (telemetryList.length === 0) return;
          
          const lastPoints = telemetryList.slice(-30); // Ultimos 30 puntos
          
          const formattedData = lastPoints.map(t => {
            const date = new Date(t.recordedAt);
            return {
              time: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`,
              Humedad: t.airHumidityPct,
              temp: t.temperatureC
            };
          });
          
          if (currentHumidity !== undefined) {
             formattedData.push({ time: 'AHORA', Humedad: currentHumidity, temp: 24 });
          }

          if (isMounted) {
            setData(formattedData);
            setError(false);
          }
        } else {
          setError(true);
        }
      } catch (e) {
        console.error('Error fetching telemetry:', e);
        setError(true);
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [deviceId, currentHumidity]);

  return (
    <div className="w-full h-[280px]">
      {error && data.length === 0 ? (
        <div className="w-full h-full flex flex-col items-center justify-center text-warning">
          <span>Error de conexión al cargar la gráfica.</span>
        </div>
      ) : data.length === 0 ? (
        <div className="w-full h-full flex items-center justify-center text-ink-soft animate-pulse">
          Esperando datos reales de telemetría...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-water)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--color-water)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-line)" />
            <XAxis 
              dataKey="time" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'var(--color-ink-soft)', fontSize: 12, fontFamily: 'var(--font-plex-mono)' }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'var(--color-ink-soft)', fontSize: 12, fontFamily: 'var(--font-plex-mono)' }}
              domain={[0, 100]}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'var(--color-ink)', 
                borderColor: 'transparent',
                borderRadius: '8px',
                color: 'var(--color-canvas)' 
              }}
              itemStyle={{ color: 'var(--color-canvas)', fontFamily: 'var(--font-plex-mono)' }}
              labelStyle={{ fontFamily: 'var(--font-manrope)', color: 'var(--color-canvas-muted)', marginBottom: '4px' }}
            />
            <ReferenceLine y={40} stroke="var(--color-warning)" strokeDasharray="4 4" opacity={0.5} />
            <ReferenceLine y={70} stroke="var(--color-water-soft)" strokeDasharray="4 4" opacity={0.5} />
            <Area 
              type="monotone" 
              dataKey="Humedad" 
              stroke="var(--color-water)" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorMoisture)" 
              animationDuration={500}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
