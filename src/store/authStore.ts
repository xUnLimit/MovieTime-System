import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  checkAuth: () => void;
  setHydrated: (hydrated: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isHydrated: false,

        login: async (email: string, password: string) => {
          set({ isLoading: true });

          try {
            // Simular delay de red
            await new Promise(resolve => setTimeout(resolve, 800));

            // Mock login - validación simple
            if (email && password.length >= 6) {
              const mockUser: User = {
                id: '1',
                email,
                displayName: 'Allan Ordoñez',
                role: email.includes('admin') ? 'admin' : 'operador',
                active: true,
                createdAt: new Date(),
                updatedAt: new Date()
              };

              set({
                user: mockUser,
                isAuthenticated: true,
                isLoading: false
              });
            } else {
              set({ isLoading: false });
              throw new Error('Credenciales inválidas');
            }
          } catch (error) {
            set({ isLoading: false });
            throw error;
          }
        },

        logout: () => {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false
          });
        },

        setUser: (user: User) => {
          set({ user, isAuthenticated: true });
        },

        checkAuth: () => {
          const state = useAuthStore.getState();
          if (!state.user) {
            set({ isAuthenticated: false });
          }
        },

        setHydrated: (hydrated: boolean) => {
          set({ isHydrated: hydrated });
        }
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated
        }),
        onRehydrateStorage: () => {
          return (state) => {
            state?.setHydrated(true);
          };
        }
      }
    )
  )
);
