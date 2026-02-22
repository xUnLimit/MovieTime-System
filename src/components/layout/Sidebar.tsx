'use client';

import Link from 'next/link';
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
  ChevronLeft,
  X
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
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ collapsed: controlledCollapsed, onCollapse, mobileOpen = false, onMobileClose }: SidebarProps = {}) {
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

  // Close mobile sidebar on route change
  useEffect(() => {
    if (mobileOpen && onMobileClose) {
      onMobileClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const sidebarContent = (isMobile: boolean) => (
    <aside
      data-collapsed={isMobile ? false : collapsed}
      className={cn(
        "relative flex flex-col bg-sidebar border-r border-sidebar-border h-full",
        !isMobile && "transition-[width] duration-300 ease-in-out"
      )}
      style={{
        width: isMobile ? '200px' : (collapsed ? '48px' : '200px')
      }}
    >
      {/* Header - Logo y Título */}
      <div className="relative h-16 border-b border-sidebar-border overflow-hidden flex-shrink-0">
        {/* Logo - posición absoluta fija, siempre centrado en los 48px del ancho colapsado */}
        <div
          className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center text-sidebar-foreground"
          style={{
            left: '2px',
            width: '48px',
            transition: 'left 300ms ease-in-out',
          }}
        >
          <svg width="32" height="32" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
            <path fill="none" d="M0 0h256v256H0z" />
            <path fill="currentColor" d="M168,40V176a8,8,0,0,1-16,0V50.8L89.2,210.8a8.2,8.2,0,0,1-7.2,4.4,8.1,8.1,0,0,1-7.2-4.4L42.2,50.8V176a8,8,0,0,1-16,0V40a8,8,0,0,1,8-32h48a8,8,0,0,1,7.2,4.4L128,100.8l28.8-88.4a8,8,0,0,1,7.2-4.4h48a8,8,0,0,1,8,32Z" />
          </svg>
        </div>

        {/* Texto - aparece a la derecha del logo */}
        <span
          className="absolute top-1/2 -translate-y-1/2 text-base font-semibold whitespace-nowrap"
          style={{
            left: '44px',
            opacity: isMobile ? 1 : (collapsed ? 0 : 1),
            transition: 'opacity 200ms ease-in-out',
            pointerEvents: (!isMobile && collapsed) ? 'none' : 'auto'
          }}
        >
          MovieTime PTY
        </span>

        {/* Botón cerrar en mobile */}
        {isMobile && (
          <button
            onClick={onMobileClose}
            className="absolute top-1/2 -translate-y-1/2 right-3 flex items-center justify-center h-7 w-7 rounded-md text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <X className="h-4 w-4" />
          </button>
        )}
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
                    opacity: isMobile ? 1 : (collapsed ? 0 : 1),
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
                    title={(!isMobile && collapsed) ? item.name : undefined}
                  >
                    {/* Icono - Posición ABSOLUTA FIJA */}
                    <div className="absolute left-0 w-11 h-9 flex items-center justify-center">
                      <Icon className={cn("h-4 w-4", isActive && "text-primary")} />
                    </div>

                    {/* Texto - Posición ABSOLUTA FIJA */}
                    <span
                      className="absolute left-11 text-sm whitespace-nowrap flex items-center gap-2"
                      style={{
                        opacity: isMobile ? 1 : (collapsed ? 0 : 1),
                        transition: 'opacity 200ms ease-in-out',
                        pointerEvents: (!isMobile && collapsed) ? 'none' : 'auto'
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
      <div className="border-t border-sidebar-border mt-auto flex-shrink-0">
        <div className="p-2 space-y-1">
          {/* Botón Tema */}
          <button
            onClick={toggleTheme}
            className={cn(
              "relative flex items-center h-9 w-full rounded-lg overflow-hidden",
              "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              "transition-colors duration-200"
            )}
            title={(!isMobile && collapsed) ? "Tema" : undefined}
          >
            <div className="absolute left-0 w-11 h-9 flex items-center justify-center">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </div>
            <span
              className="absolute left-11 text-sm whitespace-nowrap"
              style={{
                opacity: isMobile ? 1 : (collapsed ? 0 : 1),
                transition: 'opacity 200ms ease-in-out',
                pointerEvents: (!isMobile && collapsed) ? 'none' : 'auto'
              }}
            >
              Tema
            </span>
          </button>

          {/* Botón Colapsar - solo en desktop */}
          {!isMobile && (
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
          )}
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex h-screen">
        {sidebarContent(false)}
      </div>

      {/* Mobile overlay + drawer */}
      {mobileOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={onMobileClose}
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 z-50 md:hidden flex h-full">
            {sidebarContent(true)}
          </div>
        </>
      )}
    </>
  );
}
