"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Droplets, Activity, Settings, Calendar, History, Sprout, LogOut, Shield } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { icon: Activity, label: 'Dashboard', href: '/' },
    { icon: History, label: 'Historial', href: '/history' },
    { icon: Calendar, label: 'Reglas', href: '/rules' },
    { icon: Settings, label: 'Configuración', href: '/settings' },
    { icon: Shield, label: 'Políticas', href: '/policies' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('fs_auth_token');
    window.location.reload();
  };

  return (
    <aside className="hidden lg:flex w-[88px] h-screen border-r border-line bg-canvas flex-col items-center py-8 justify-between shrink-0">
      <div className="flex flex-col items-center gap-12">
        <Link href="/">
          <div className="w-12 h-12 rounded-2xl bg-water flex items-center justify-center text-canvas shadow-lg shadow-water/20 cursor-pointer">
            <Droplets className="w-6 h-6" />
          </div>
        </Link>

        <nav className="flex flex-col gap-6">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={idx} href={item.href}>
                <button 
                  title={item.label}
                  className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                    isActive 
                      ? 'bg-ink text-canvas shadow-md' 
                      : 'text-ink-soft hover:bg-line hover:text-ink'
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                  {isActive && (
                    <div className="absolute -left-5 w-1 h-8 bg-ink rounded-r-full" />
                  )}
                </button>
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-4">
        <button 
          onClick={handleLogout}
          title="Cerrar sesión"
          className="w-12 h-12 rounded-xl flex items-center justify-center text-ink-soft hover:bg-line hover:text-ink transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
        
        <Link href="/profile">
          <div 
            className={`w-12 h-12 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
              pathname === '/profile' 
                ? 'border-moss text-moss bg-moss/10' 
                : 'border-line text-ink-soft hover:bg-line'
            }`} 
            title="Mi perfil"
          >
            <Sprout className="w-5 h-5" />
          </div>
        </Link>
      </div>
    </aside>
  );
}
