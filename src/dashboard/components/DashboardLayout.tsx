import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  MessageSquarePlus,
  FileText,
  Home
} from 'lucide-react';
import clsx from 'clsx';

export default function DashboardLayout() {
  const location = useLocation();
  
  const navItems = [
    { href: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Inicio' },
    { href: '/dashboard/encuestas', icon: <FileText size={20} />, label: 'Encuestas' },
    { href: '/dashboard/resultados', icon: <BarChart3 size={20} />, label: 'Resultados' },
    { href: '/dashboard/agentes', icon: <Users size={20} />, label: 'Panelistas' },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-gray-800">
            Pulso<span className="text-blue-600">Social</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">Panel de Control Chile</p>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink 
              key={item.href}
              href={item.href} 
              icon={item.icon} 
              label={item.label}
              isActive={location.pathname === item.href}
            />
          ))}
          
          <div className="pt-4 mt-4 border-t border-gray-100">
            <NavLink
              href="/dashboard/config"
              icon={<Settings size={20} />}
              label="Configuración"
              isActive={location.pathname === '/dashboard/config'}
            />
          </div>
          
          <div className="pt-4 mt-4 border-t border-gray-100">
            <Link
              to="/"
              className="flex items-center gap-3 px-3 py-2 text-gray-600 rounded-lg hover:bg-green-50 hover:text-green-700 transition-colors"
            >
              <Home size={20} />
              <span className="font-medium">Volver al Juego</span>
            </Link>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
              A
            </div>
            <div>
              <p className="text-sm font-medium">Admin</p>
              <p className="text-xs text-gray-500">admin@pulso.cl</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}

interface NavLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
}

function NavLink({ href, icon, label, isActive }: NavLinkProps) {
  return (
    <Link 
      to={href} 
      className={clsx(
        'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
        isActive 
          ? 'bg-blue-50 text-blue-700' 
          : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
      )}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </Link>
  );
}