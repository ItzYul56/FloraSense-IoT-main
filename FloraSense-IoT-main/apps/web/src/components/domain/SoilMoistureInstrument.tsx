import React from 'react';

export function SoilMoistureInstrument({ valuePct, status }: { valuePct: number | null, status: 'SECO' | 'OPTIMO' | 'SATURADO' | 'OFFLINE' }) {
  const safePct = valuePct || 0;
  // Posición del marcador (0 a 100%)
  const leftPos = Math.max(0, Math.min(100, safePct));
  
  let trackColor = 'bg-line-strong';
  let dotColor = 'bg-ink';
  
  if (status === 'SECO') { dotColor = 'bg-warning'; }
  else if (status === 'OPTIMO') { dotColor = 'bg-moss'; }
  else if (status === 'SATURADO') { dotColor = 'bg-water'; }
  else { dotColor = 'bg-ink-soft'; trackColor = 'bg-line'; }

  return (
    <div className="w-full py-4 font-mono-data">
      <div className="flex justify-between text-[10px] sm:text-xs text-ink-soft mb-3 uppercase tracking-widest">
        <span className={status === 'SECO' ? 'text-warning font-semibold' : ''}>Seco</span>
        <span className={status === 'OPTIMO' ? 'text-moss font-semibold' : ''}>Óptimo</span>
        <span className={status === 'SATURADO' ? 'text-water font-semibold' : ''}>Saturado</span>
      </div>
      
      <div className="relative w-full h-1.5 rounded-full overflow-visible" style={{ backgroundColor: 'var(--color-line)' }}>
        {/* Rango óptimo simulado (40% a 70%) */}
        <div className="absolute top-0 bottom-0 left-[40%] right-[30%] bg-moss/20 rounded-full" />
        
        {/* Marcador */}
        <div 
          className={`absolute top-1/2 -mt-2.5 -ml-2.5 w-5 h-5 rounded-full border-2 border-canvas shadow-sm transition-all duration-700 ease-out ${dotColor}`}
          style={{ left: `${leftPos}%` }}
        />
      </div>
      
      <div 
        className="mt-4 text-center transition-all duration-700 ease-out"
        style={{ paddingLeft: `calc(${leftPos}% - 24px)`, width: '48px' }}
      >
        <span className="text-xl font-medium tracking-tight text-ink">{safePct.toFixed(1)}<span className="text-sm text-ink-soft ml-0.5">%</span></span>
      </div>
    </div>
  );
}
