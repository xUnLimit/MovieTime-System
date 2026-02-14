'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Server,
  CreditCard,
  Bell,
  Folder,
  Wallet,
  MessageSquare,
  FileText,
  Moon,
  Sun,
  ChevronLeft
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSidebarState } from '@/hooks/use-sidebar';
import React, { useEffect } from 'react';

type NavItem = { name: string; href: string; icon: React.ComponentType<{ className?: string }>; badge?: string };
type NavSection = { label?: string; items: NavItem[] };

const navigationSections: NavSection[] = [
  {
    items: [
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard
      }
    ]
  },
  {
    label: 'GESTIÓN',
    items: [
      {
        name: 'Usuarios',
        href: '/usuarios',
        icon: Users
      },
      {
        name: 'Servicios',
        href: '/servicios',
        icon: Server
      },
      {
        name: 'Ventas',
        href: '/ventas',
        icon: CreditCard
      },
    ]
  },
  {
    label: 'ADMINISTRACIÓN',
    items: [
      {
        name: 'Notificaciones',
        href: '/notificaciones',
        icon: Bell
      },
      {
        name: 'Categorías',
        href: '/categorias',
        icon: Folder
      },
      {
        name: 'Métodos de Pago',
        href: '/metodos-pago',
        icon: Wallet
      }
    ]
  },
  {
    label: 'OTROS',
    items: [
      {
        name: 'Editor de Mensajes',
        href: '/editor-mensajes',
        icon: MessageSquare
      },
      {
        name: 'Log de Actividad',
        href: '/log-actividad',
        icon: FileText
      }
    ]
  }
];

interface SidebarProps {
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed: controlledCollapsed, onCollapse }: SidebarProps = {}) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { isOpen, toggle } = useSidebarState();

  const collapsed = controlledCollapsed !== undefined ? controlledCollapsed : !isOpen;
  const setCollapsed = onCollapse || (() => toggle());

  // Keyboard shortcut: Ctrl/Cmd + B
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setCollapsed(!collapsed);
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "group/sidebar relative flex flex-col bg-sidebar border-r border-sidebar-border",
        "transition-[width] duration-300 ease-in-out"
      )}
      style={{
        width: collapsed ? '48px' : '200px'
      }}
    >
      {/* Header - Logo y Título */}
      <div className="relative h-16 border-b border-sidebar-border overflow-hidden">
        {/* Logo - Posición ABSOLUTA FIJA (no se mueve) */}
        <div className="absolute top-1/2 -translate-y-1/2 left-3 flex h-8 w-8 items-center justify-center">
          <Image
            src="/logo.svg"
            alt="MovieTime Logo"
            width={32}
            height={32}
            className="w-8 h-8"
            priority
          />
        </div>

        {/* Texto - Posición ABSOLUTA FIJA */}
        <span
          className="absolute top-1/2 -translate-y-1/2 left-14 text-base font-semibold whitespace-nowrap"
          style={{
            opacity: collapsed ? 0 : 1,
            transition: 'opacity 200ms ease-in-out',
            pointerEvents: collapsed ? 'none' : 'auto'
          }}
        >
          MovieTime PTY
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
        {navigationSections.map((section, sectionIdx) => (
          <div key={sectionIdx} className="mb-4">
            {/* Label de sección */}
            {section.label && (
              <div className="px-3 mb-2 h-5 overflow-hidden">
                <p
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                  style={{
                    opacity: collapsed ? 0 : 1,
                    transition: 'opacity 200ms ease-in-out'
                  }}
                >
                  {section.label}
                </p>
              </div>
            )}

            {/* Items */}
            <div className="space-y-1 px-2">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "relative flex items-center h-9 rounded-lg overflow-hidden",
                      "transition-colors duration-200",
                      isActive
                        ? "bg-primary/15 text-foreground border-l-2 border-primary font-medium"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                    title={collapsed ? item.name : undefined}
                  >
                    {/* Icono - Posición ABSOLUTA FIJA */}
                    <div className="absolute left-0 w-11 h-9 flex items-center justify-center">
                      <Icon className={cn("h-4 w-4", isActive && "text-primary")} />
                    </div>

                    {/* Texto - Posición ABSOLUTA FIJA */}
                    <span
                      className="absolute left-11 text-sm whitespace-nowrap flex items-center gap-2"
                      style={{
                        opacity: collapsed ? 0 : 1,
                        transition: 'opacity 200ms ease-in-out',
                        pointerEvents: collapsed ? 'none' : 'auto'
                      }}
                    >
                      {item.name}
                      {/* Badge (si existe) */}
                      {item.badge && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-orange-500 text-white rounded">
                          {item.badge}
                        </span>
                      )}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Separador - POSICIÓN FIJA */}
            {sectionIdx < navigationSections.length - 1 && (
              <div className="h-px w-full bg-sidebar-border my-4" />
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border mt-auto">
        <div className="p-2 space-y-1">
          {/* Botón Tema */}
          <button
            onClick={toggleTheme}
            className={cn(
              "relative flex items-center h-9 w-full rounded-lg overflow-hidden",
              "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              "transition-colors duration-200"
            )}
            title={collapsed ? "Tema" : undefined}
          >
            <div className="absolute left-0 w-11 h-9 flex items-center justify-center">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </div>
            <span
              className="absolute left-11 text-sm whitespace-nowrap"
              style={{
                opacity: collapsed ? 0 : 1,
                transition: 'opacity 200ms ease-in-out',
                pointerEvents: collapsed ? 'none' : 'auto'
              }}
            >
              Tema
            </span>
          </button>

          {/* Botón Colapsar */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "relative flex items-center h-9 w-full rounded-lg overflow-hidden",
              "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              "transition-colors duration-200"
            )}
            title={collapsed ? "Expandir" : "Colapsar"}
          >
            <div className="absolute left-0 w-11 h-9 flex items-center justify-center">
              <ChevronLeft
                className="h-4 w-4"
                style={{
                  transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 300ms ease-in-out'
                }}
              />
            </div>
            <span
              className="absolute left-11 text-sm whitespace-nowrap"
              style={{
                opacity: collapsed ? 0 : 1,
                transition: 'opacity 200ms ease-in-out',
                pointerEvents: collapsed ? 'none' : 'auto'
              }}
            >
              Colapsar
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}
