import React from 'react';

export function EnvironmentalReading({
  temp,
  humidity,
  trendText
}: {
  temp: number;
  humidity: number;
  trendText?: string;
}) {
  return (
    <div className="border border-line rounded-2xl p-6 bg-canvas-elevated">
      <h3 className="font-display text-2xl mb-5 text-ink">Ambiente</h3>
      
      <div className="flex gap-8 mb-4">
        <div>
          <div className="text-sm text-ink-soft mb-1 uppercase tracking-wider font-semibold">Temperatura</div>
          <div className="font-mono-data text-3xl text-ink">
            {temp.toFixed(1)}<span className="text-lg text-ink-soft ml-1">°C</span>
          </div>
        </div>
        
        <div>
          <div className="text-sm text-ink-soft mb-1 uppercase tracking-wider font-semibold">Hum. Relativa</div>
          <div className="font-mono-data text-3xl text-ink">
            {humidity.toFixed(1)}<span className="text-lg text-ink-soft ml-1">%</span>
          </div>
        </div>
      </div>

      {trendText && (
        <div className="text-xs text-ink-soft mt-4 pt-4 border-t border-line">
          {trendText}
        </div>
      )}
    </div>
  );
}
