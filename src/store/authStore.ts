import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { User } from '@/types';
import { signIn, signOut as firebaseSignOut, onAuthStateChange, convertFirebaseUser } from '@/lib/firebase/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  checkAuth: () => void;
  setHydrated: (hydrated: boolean) => void;
  initAuth: () => void;
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
            const firebaseUser = await signIn(email, password);
            const user = convertFirebaseUser(firebaseUser);

            set({
              user,
              isAuthenticated: true,
              isLoading: false
            });
          } catch (error: any) {
            set({ isLoading: false });
            throw new Error(error.message || 'Error al iniciar sesión');
          }
        },

        logout: async () => {
          try {
            await firebaseSignOut();
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false
            });
          } catch (error: any) {
            console.error('Error logging out:', error);
            throw new Error(error.message || 'Error al cerrar sesión');
          }
        },

        setUser: (user: User | null) => {
          set({ user, isAuthenticated: !!user });
        },

        checkAuth: () => {
          const state = useAuthStore.getState();
          if (!state.user) {
            set({ isAuthenticated: false });
          }
        },

        setHydrated: (hydrated: boolean) => {
          set({ isHydrated: hydrated });
        },

        initAuth: () => {
          // Listen to Firebase auth state changes
          onAuthStateChange((firebaseUser) => {
            if (firebaseUser) {
              const user = convertFirebaseUser(firebaseUser);
              set({ user, isAuthenticated: true, isLoading: false });
            } else {
              set({ user: null, isAuthenticated: false, isLoading: false });
            }
          });
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
