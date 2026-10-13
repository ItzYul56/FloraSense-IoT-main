export function HealthStrip({ 
  deviceId, 
  status, 
  lastReading, 
  pumpStatus 
}: { 
  deviceId: string;
  status: 'ONLINE' | 'OFFLINE';
  lastReading: string;
  pumpStatus: 'ON' | 'OFF';
}) {
  return (
    <div className="w-full bg-ink text-canvas text-xs font-mono-data py-1.5 px-4 flex justify-between items-center overflow-x-auto whitespace-nowrap">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${status === 'ONLINE' ? 'bg-moss-bright' : 'bg-danger'}`} />
          <span>ESP32 {status}</span>
        </div>
        <div className="hidden sm:block opacity-60">|</div>
        <div className="hidden sm:block">ID: {deviceId}</div>
        <div className="opacity-60">|</div>
        <div>ÚLTIMA LECTURA: {lastReading}</div>
        <div className="opacity-60">|</div>
        <div className="flex items-center gap-2">
          BOMBA {pumpStatus}
          {pumpStatus === 'ON' && <span className="w-1.5 h-1.5 rounded-full bg-water-soft animate-ping ml-1" />}
        </div>
      </div>
    </div>
  );
}
