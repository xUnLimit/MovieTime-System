import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchDashboardMock = vi.fn();
const recalculateDashboardMock = vi.fn();
const fetchNotificacionesMock = vi.fn();
const fetchCategoriasMock = vi.fn();
const resyncContadoresCategoriasMock = vi.fn();
const resyncPerfilesDisponiblesTotalMock = vi.fn();
const resyncServicioReferenciasMock = vi.fn();
const resyncServiciosActivosMock = vi.fn();
const toastLoadingMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
const callOrder: string[] = [];

vi.mock('next/dynamic', () => ({
  default: () => () => null,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('@/components/dashboard/DashboardMetrics', () => ({
  DashboardMetrics: () => <div>DashboardMetrics</div>,
}));

vi.mock('@/components/dashboard/RecentActivity', () => ({
  RecentActivity: () => <div>RecentActivity</div>,
}));

vi.mock('@/components/dashboard/PronosticoFinanciero', () => ({
  PronosticoFinanciero: () => <div>PronosticoFinanciero</div>,
}));

vi.mock('@/components/layout/UserMenu', () => ({
  UserMenu: () => <div>UserMenu</div>,
}));

vi.mock('@/components/notificaciones/NotificationBell', () => ({
  NotificationBell: () => <div>NotificationBell</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div>Skeleton</div>,
}));

vi.mock('@/store/dashboardStore', () => ({
  useDashboardStore: () => ({
    fetchDashboard: fetchDashboardMock,
    recalculateDashboard: recalculateDashboardMock,
    isRecalculating: false,
  }),
}));

const useNotificacionesStoreMock = Object.assign(
  () => ({
    fetchNotificaciones: fetchNotificacionesMock,
  }),
  {
    getState: () => ({
      notificaciones: [],
    }),
  }
);

vi.mock('@/store/notificacionesStore', () => ({
  useNotificacionesStore: useNotificacionesStoreMock,
}));

vi.mock('@/store/serviciosStore', () => ({
  useServiciosStore: () => ({
    resyncPerfilesDisponiblesTotal: resyncPerfilesDisponiblesTotalMock,
    resyncServicioReferencias: resyncServicioReferenciasMock,
  }),
}));

vi.mock('@/store/categoriasStore', () => ({
  useCategoriasStore: () => ({
    fetchCategorias: fetchCategoriasMock,
    resyncContadoresCategorias: resyncContadoresCategoriasMock,
  }),
}));

vi.mock('@/store/usuariosStore', () => ({
  useUsuariosStore: () => ({
    resyncServiciosActivos: resyncServiciosActivosMock,
  }),
}));

vi.mock('@/types/notificaciones', () => ({
  esNotificacionVenta: () => false,
  esNotificacionServicio: () => false,
}));

vi.mock('sonner', () => ({
  toast: {
    loading: toastLoadingMock,
    success: toastSuccessMock,
    error: toastErrorMock,
    custom: vi.fn(),
    dismiss: vi.fn(),
  },
}));

describe('Dashboard sync button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callOrder.length = 0;

    fetchDashboardMock.mockResolvedValue(undefined);
    fetchNotificacionesMock.mockResolvedValue(undefined);
    toastLoadingMock.mockReturnValue('toast-1');

    resyncPerfilesDisponiblesTotalMock.mockImplementation(async () => {
      callOrder.push('perfiles');
      return { categoriasActualizadas: 0 };
    });
    resyncServicioReferenciasMock.mockImplementation(async () => {
      callOrder.push('servicios');
      return { serviciosRevisados: 3, ventasActualizadas: 2 };
    });
    resyncServiciosActivosMock.mockImplementation(async () => {
      callOrder.push('usuarios');
      return { usuariosReparados: 1 };
    });
    resyncContadoresCategoriasMock.mockImplementation(async () => {
      callOrder.push('categorias');
    });
    recalculateDashboardMock.mockImplementation(async () => {
      callOrder.push('dashboard');
    });
    fetchCategoriasMock.mockImplementation(async () => {
      callOrder.push('fetchCategorias');
    });
  });

  it('dispara la resincronizacion de servicios al hacer click en Sincronizar sistema', async () => {
    const { default: DashboardPage } = await import('./page');

    render(<DashboardPage />);

    const button = await screen.findByRole('button', { name: /sincronizar sistema/i });
    await userEvent.click(button);

    await waitFor(() => {
      expect(resyncPerfilesDisponiblesTotalMock).toHaveBeenCalledTimes(1);
      expect(resyncServicioReferenciasMock).toHaveBeenCalledTimes(1);
      expect(resyncServiciosActivosMock).toHaveBeenCalledTimes(1);
      expect(resyncContadoresCategoriasMock).toHaveBeenCalledTimes(1);
      expect(recalculateDashboardMock).toHaveBeenCalledTimes(1);
      expect(fetchCategoriasMock).toHaveBeenCalledWith(true);
    });

    expect(callOrder).toEqual([
      'perfiles',
      'servicios',
      'usuarios',
      'categorias',
      'dashboard',
      'fetchCategorias',
    ]);

    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Sistema sincronizado correctamente',
      expect.objectContaining({
        id: 'toast-1',
        description: expect.stringContaining('2 venta(s) resincronizadas desde 3 servicio(s).'),
      })
    );
  });
});
