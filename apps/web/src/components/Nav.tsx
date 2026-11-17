import { Link, useLocation } from "react-router";
import { DoorOpen, Sun, UserRound, Users, type LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { activeTab, hidesNav, isOverlayPage, type NavTab } from "@/lib/nav";
import NotificationBell from "./NotificationBell";
import AccountMenu from "./AccountMenu";

const TABS: { id: NavTab; to: string; label: string; Icon: LucideIcon }[] = [
  { id: "today", to: "/home", label: "Today", Icon: Sun },
  { id: "rooms", to: "/rooms", label: "Rooms", Icon: DoorOpen },
  { id: "feed", to: "/feed", label: "Feed", Icon: Users },
  { id: "you", to: "/profile", label: "You", Icon: UserRound },
];

/**
 * The app's navigation: a top bar everywhere, the four tabs in its middle on wide
 * screens and in a bottom bar on phones. The class "nav" lets focus mode hide it.
 */
const Nav = () => {
  const session = useAuth();
  const { profile } = useProfile();
  const { pathname } = useLocation();

  if (hidesNav(pathname)) return null;

  const signedIn = !!session;
  const overlay = isOverlayPage(pathname);
  const current = activeTab(pathname, profile?.username);

  const barClass = overlay
    ? "bg-gradient-to-b from-black/70 to-transparent text-white"
    : "border-b border-[var(--color-border-subtle)] bg-[color-mix(in_srgb,var(--color-bg-muted)_88%,transparent)] text-[var(--color-text-primary)] backdrop-blur-md";
  const guestLinkClass = overlay
    ? "inline-flex h-10 items-center rounded-full px-4 text-sm font-medium text-white/90 hover:text-white"
    : "inline-flex h-10 items-center rounded-full px-4 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]";
  const guestButtonClass = overlay
    ? "inline-flex h-10 items-center rounded-full border border-white/40 px-4 text-sm font-semibold text-white hover:border-white"
    : "inline-flex h-10 items-center rounded-full border border-[var(--color-border-strong)] px-4 text-sm font-semibold text-[var(--color-text-primary)]";

  return (
    <>
      <header className={`nav fixed inset-x-0 top-0 z-[1000] ${barClass}`}>
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-3 px-4 md:px-6">
          <Link
            to={signedIn ? "/home" : "/"}
            className="font-mono text-sm font-semibold tracking-wide"
          >
            SkillHiive
          </Link>

          {signedIn && (
            <nav
              aria-label="Primary"
              className="hidden items-center gap-0.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-primary)] p-1 md:flex"
            >
              {TABS.map(({ id, to, label, Icon }) => {
                const on = current === id;
                return (
                  <Link
                    key={id}
                    to={to}
                    aria-current={on ? "page" : undefined}
                    className={`flex h-10 items-center gap-2 rounded-full px-4 text-sm transition-colors ${
                      on
                        ? "bg-[var(--color-surface-raised)] font-semibold text-[var(--color-text-primary)] shadow-[inset_0_0_0_1px_var(--color-border-strong)]"
                        : "font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    <Icon size={16} aria-hidden="true" />
                    {label}
                  </Link>
                );
              })}
            </nav>
          )}

          <div className="flex items-center gap-2">
            {signedIn ? (
              <>
                <NotificationBell />
                <AccountMenu />
              </>
            ) : session === null ? (
              <>
                {pathname !== "/login" && (
                  <Link to="/login" className={guestLinkClass}>
                    Log in
                  </Link>
                )}
                {pathname !== "/register" && (
                  <Link to="/register" className={guestButtonClass}>
                    Sign up
                  </Link>
                )}
              </>
            ) : null}
          </div>
        </div>
      </header>

      {signedIn && (
        <nav
          aria-label="Primary"
          className="nav fixed inset-x-0 bottom-0 z-[1000] border-t border-[var(--color-border-subtle)] bg-[color-mix(in_srgb,var(--color-bg-muted)_94%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        >
          <ul className="grid grid-cols-4">
            {TABS.map(({ id, to, label, Icon }) => {
              const on = current === id;
              return (
                <li key={id}>
                  <Link
                    to={to}
                    aria-current={on ? "page" : undefined}
                    className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] ${
                      on
                        ? "font-semibold text-[var(--color-text-primary)]"
                        : "font-medium text-[var(--color-text-secondary)]"
                    }`}
                  >
                    <span
                      className={`grid h-7 w-12 place-items-center rounded-full ${
                        on ? "bg-[var(--color-surface-raised)] shadow-[inset_0_0_0_1px_var(--color-border-strong)]" : ""
                      }`}
                    >
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </>
  );
};

export default Nav;
