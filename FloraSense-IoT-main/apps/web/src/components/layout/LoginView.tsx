"use client";

import React, { useState } from 'react';
import { TopographicPattern } from '../ui/TopographicPattern';
import { Droplets, ArrowRight, Lock } from 'lucide-react';
const safeGetItem = (k: string) => { try { return typeof window !== 'undefined' ? window.localStorage.getItem(k) : null; } catch(e) { return null; } };
const safeSetItem = (k: string, v: string) => { try { if (typeof window !== 'undefined') window.localStorage.setItem(k, v); } catch(e) {} };


export function LoginView({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  React.useEffect(() => {
    const saved = safeGetItem('fs_remember_email');
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch(`http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3001/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        throw new Error('Credenciales inválidas');
      }

      const data = await res.json();
      safeSetItem('fs_jwt_token', data.access_token);
      safeSetItem('fs_auth_token', 'true');
      if (rememberMe) {
        safeSetItem('fs_remember_email', email);
      } else {
        try { window.localStorage.removeItem('fs_remember_email'); } catch(e){}
      }
      onLogin();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-canvas">
      {/* Lado Visual */}
      <div className="hidden lg:flex w-[55%] bg-moss relative overflow-hidden flex-col justify-between p-16 text-canvas">
        <TopographicPattern className="opacity-20 text-canvas-elevated" />
        
        {/* Glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-moss-bright/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <Droplets className="w-8 h-8 text-water-soft" />
            <span className="font-display text-3xl tracking-wide">FloraSense</span>
          </div>
        </div>

        <div className="relative z-10 max-w-xl">
          <h1 className="font-display text-6xl leading-[1.1] mb-6">
            El agua correcta,<br />en el momento correcto.
          </h1>
          <p className="text-moss-bright text-xl max-w-md font-light leading-relaxed">
            Observa el pulso del suelo, entiende el ambiente y controla cada ciclo de riego con precisión de laboratorio.
          </p>
          
          <div className="mt-16 font-mono-data text-xs text-moss-bright tracking-widest uppercase flex gap-8">
            <div>SISTEMA ONLINE</div>
            <div>VERSIÓN 1.0.0</div>
            <div>STATUS: ÓPTIMO</div>
          </div>
        </div>
      </div>

      {/* Lado Formulario */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 relative">
        <div className="w-full max-w-md relative z-10">
          
          <div className="lg:hidden flex items-center gap-3 mb-12 justify-center">
            <Droplets className="w-8 h-8 text-water" />
            <span className="font-display text-3xl tracking-wide text-ink">FloraSense</span>
          </div>

          <h2 className="font-display text-4xl text-ink mb-2">Acceso al sistema</h2>
          <p className="text-ink-soft mb-12">Ingresa tus credenciales para continuar.</p>

          {errorMsg && (
            <div className="bg-warning/10 border border-warning text-warning px-4 py-3 rounded-lg mb-6 text-sm font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-ink-soft mb-2">
                Correo electrónico
              </label>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-canvas-elevated border-b-2 border-line text-ink px-4 py-3 focus:outline-none focus:border-water transition-colors placeholder:text-ink/30"
                placeholder="operador@florasense.io"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-ink-soft mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-canvas-elevated border-b-2 border-line text-ink px-4 py-3 focus:outline-none focus:border-water transition-colors placeholder:text-ink/30"
                  placeholder="••••••••"
                  required
                />
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-line-strong" />
              </div>
            
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer text-ink-soft hover:text-ink transition-colors">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="accent-moss-bright w-4 h-4 rounded border-line"
                />
                Recordar usuario
              </label>
              <button 
                type="button" 
                onClick={() => alert("Por seguridad, el restablecimiento de contraseña debe solicitarse al administrador del sistema local.")} 
                className="text-moss hover:text-moss-bright transition-colors font-medium"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button 
              disabled={loading}
              className="w-full mt-8 bg-ink text-canvas py-4 px-6 flex items-center justify-between hover:bg-ink-soft transition-colors group disabled:opacity-50"
            >
              <span className="font-semibold tracking-wide uppercase text-sm">
                {loading ? 'Verificando...' : 'Ingresar al panel'}
              </span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-12 text-center text-xs text-ink-soft font-mono-data">
            PROTEGIDO POR ENCRIPTACIÓN E2E
          </div>
        </div>
      </div>
    </div>
  );
}
