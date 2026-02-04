'use client';

import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

export function Header() {
  return (
    <header className="bg-background sticky top-0 z-10">
      <div className="flex h-16 items-center justify-end px-6">
        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <NotificationBell />
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
