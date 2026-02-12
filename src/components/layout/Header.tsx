'use client';

import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';
import { NotificationBell } from './NotificationBell';

/**
 * Header Component
 *
 * Header del dashboard con:
 * - NotificationBell (campana con badge dinámico)
 * - ThemeToggle (cambio de tema)
 * - UserMenu (menú de usuario)
 */
export function Header() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
      {/* Spacer para empujar elementos a la derecha */}
      <div className="flex-1" />

      {/* Right side: Notifications + Theme + User */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <NotificationBell />

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Menu */}
        <UserMenu />
      </div>
    </header>
  );
}
