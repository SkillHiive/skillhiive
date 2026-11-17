import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { activeTab, hidesNav } from "@/lib/nav";
import NotificationBell from "./NotificationBell";
import AccountMenu from "./AccountMenu";

type Tab = { id: string; to: string; label: string; icon: string };

const SIGNED_IN_TABS: Tab[] = [
  { id: "today", to: "/home", label: "Home", icon: "fa-regular fa-home" },
  { id: "rooms", to: "/rooms", label: "Rooms", icon: "fa-solid fa-door-open" },
  { id: "feed", to: "/feed", label: "Feed", icon: "fa-regular fa-comment" },
];

type Pill = { left: number; top: number; width: number; height: number; opacity: number };

/**
 * The floating pill navigation with the sliding yellow highlight. The highlight sits on
 * the page you're on and follows the pointer (or keyboard focus) while you look around.
 * "You" is the avatar button beside the bell, not a tab, so there is one way to your profile.
 * The class "nav" lets focus mode hide it.
 */
const Nav = () => {
  const session = useAuth();
  const { profile } = useProfile();
  const { pathname } = useLocation();

  const signedIn = !!session;
  const tabs: Tab[] = signedIn
    ? SIGNED_IN_TABS
    : [
        { id: "home", to: "/", label: "Home", icon: "fa-regular fa-home" },
        pathname === "/login"
          ? { id: "register", to: "/register", label: "Sign up", icon: "fa-regular fa-user" }
          : { id: "login", to: "/login", label: "Log in", icon: "fa-regular fa-user" },
      ];

  const current = signedIn
    ? activeTab(pathname, profile?.username)
    : pathname === "/"
      ? "home"
      : null;

  const [hovered, setHovered] = useState<string | null>(null);
  const [pill, setPill] = useState<Pill>({ left: 0, top: 0, width: 0, height: 0, opacity: 0 });
  const tabRefs = useRef(new Map<string, HTMLAnchorElement>());

  const target = hovered ?? current;

  // Measure with layout sizes (offset*), which the hover scale on the pill doesn't distort.
  const measure = useCallback(() => {
    const el = target ? tabRefs.current.get(target) : undefined;
    setPill((prev) =>
      el
        ? { left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight, opacity: 1 }
        : { ...prev, opacity: 0 },
    );
  }, [target]);

  useLayoutEffect(() => {
    measure();
  }, [measure, pathname, signedIn]);

  // Tabs change size when the icon font arrives, labels hide on small screens, or the
  // window resizes; re-measure whenever any of them does.
  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measure());
    tabRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [measure, signedIn, pathname]);

  if (hidesNav(pathname)) return null;

  return (
    <div className="nav pointer-events-none fixed left-0 top-[2%] z-[1000] flex w-full justify-center px-2 transition-ui">
      <div className="pointer-events-auto flex w-fit items-center justify-center gap-1 sm:gap-2 transition-ui">
        <nav
          aria-label="Primary"
          onMouseLeave={() => setHovered(null)}
          className="nav-block relative flex items-center justify-center p-1.25 transition-ui hover:scale-[1.025]"
        >
          {tabs.map((tab) => {
            const lit = target === tab.id;
            return (
              <Link
                key={tab.id}
                to={tab.to}
                ref={(el) => {
                  if (el) tabRefs.current.set(tab.id, el);
                  else tabRefs.current.delete(tab.id);
                }}
                aria-current={current === tab.id ? "page" : undefined}
                aria-label={tab.label}
                onMouseEnter={() => setHovered(tab.id)}
                onFocus={() => setHovered(tab.id)}
                onBlur={() => setHovered(null)}
                draggable="false"
                className={`nav-link relative z-10 flex items-center rounded-2xl px-2.5 py-2 text-md transition-ui hover:scale-[1.075] lg:active:scale-[0.95] ${
                  lit ? "text-black" : "text-black dark:text-white"
                }`}
              >
                <i className={`${tab.icon} text-xl sm:mr-2`} aria-hidden="true" />
                <span className="hidden sm:inline">{tab.label}</span>
              </Link>
            );
          })}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute z-0 rounded-2xl bg-[#fffd01] transition-all duration-200"
            style={{
              left: pill.left,
              top: pill.top,
              width: pill.width,
              height: pill.height,
              opacity: pill.opacity,
            }}
          />
        </nav>

        {signedIn && (
          <>
            <NotificationBell />
            <AccountMenu active={current === "you"} />
          </>
        )}
      </div>
    </div>
  );
};

export default Nav;
