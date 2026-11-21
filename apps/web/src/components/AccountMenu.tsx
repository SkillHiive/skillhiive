import { Menu, MenuButton, MenuItem, MenuItems, MenuSeparator } from "@headlessui/react";
import { FolderGit2, LogOut, Monitor, Moon, Sun, Timer, UserRound, type LucideIcon } from "lucide-react";
import { useNavigate } from "react-router";
import { useTheme, type Theme } from "./themeContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";
import { useConfirm } from "@/lib/confirm";
import { useFocusSession } from "@/hooks/useFocusSession";

const THEMES: { value: Theme; label: string; Icon: LucideIcon }[] = [
  { value: "system", label: "Auto", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

const itemClass =
  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-[var(--color-text-primary)] data-[focus]:bg-[var(--color-surface-secondary)]";

/**
 * The avatar button in the top bar: the one place for "you". It lights up while you are
 * on your profile, projects or settings, and opens a short menu: profile, projects, coding
 * time, theme, sign out.
 */
export default function AccountMenu({ active = false }: { active?: boolean }) {
  const { profile } = useProfile();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const confirm = useConfirm();
  const focus = useFocusSession();

  async function signOut() {
    const ok = await confirm({
      title: "Sign out?",
      description: "You'll need to sign in again to get back in.",
      confirmLabel: "Sign out",
      tone: "neutral",
    });
    if (!ok) return;
    // A focus session belongs to whoever is signed in; don't hand it to the next person.
    focus.end();
    const { error } = await supabase.auth.signOut();
    // If the server can't be reached, still end the session on this device.
    if (error) await supabase.auth.signOut({ scope: "local" });
    navigate("/", { replace: true });
  }

  const name = profile?.displayname || profile?.username || "You";
  const initial = name.slice(0, 1).toUpperCase();

  return (
    <Menu>
      <MenuButton
        aria-label="Your account"
        aria-current={active ? "page" : undefined}
        className={`nav-block grid size-[45px] place-items-center p-1 text-sm font-semibold text-black transition-ui hover:scale-[1.05] active:scale-[1] dark:text-white ${
          active ? "!border-[#fffd01] ring-2 ring-[#fffd01]" : ""
        }`}
      >
        {profile?.avatar ? (
          <img src={profile.avatar} alt="" className="size-full rounded-xl object-cover" />
        ) : (
          <span aria-hidden="true">{initial}</span>
        )}
      </MenuButton>

      <MenuItems
        anchor="bottom end"
        className="z-[1100] w-56 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-1.5 text-[var(--color-text-primary)] shadow-xl [--anchor-gap:8px] focus:outline-none"
      >
        <div className="px-3 pb-1.5 pt-1">
          <p className="truncate text-sm font-semibold">{name}</p>
          {profile?.username && (
            <p className="truncate text-xs text-[var(--color-text-secondary)]">@{profile.username}</p>
          )}
        </div>

        <MenuSeparator className="my-1 h-px bg-[var(--color-border-subtle)]" />

        <MenuItem>
          <button type="button" className={itemClass} onClick={() => navigate("/profile")}>
            <UserRound size={16} aria-hidden="true" />
            Profile
          </button>
        </MenuItem>
        <MenuItem>
          <button type="button" className={itemClass} onClick={() => navigate("/projects")}>
            <FolderGit2 size={16} aria-hidden="true" />
            Projects
          </button>
        </MenuItem>
        <MenuItem>
          <button type="button" className={itemClass} onClick={() => navigate("/settings/trackers")}>
            <Timer size={16} aria-hidden="true" />
            Coding time
          </button>
        </MenuItem>

        <MenuSeparator className="my-1 h-px bg-[var(--color-border-subtle)]" />

        <div className="flex items-center justify-between gap-2 px-3 py-1.5">
          <span id="theme-label" className="text-sm text-[var(--color-text-secondary)]">
            Theme
          </span>
          <div role="group" aria-labelledby="theme-label" className="flex gap-0.5 rounded-full bg-[var(--color-surface-secondary)] p-0.5">
            {THEMES.map(({ value, label, Icon }) => (
              <MenuItem key={value}>
                <button
                  type="button"
                  aria-label={label}
                  aria-pressed={theme === value}
                  title={label}
                  onClick={(e) => {
                    e.preventDefault(); // keep the menu open so the change is visible
                    setTheme(value);
                  }}
                  className={`grid size-8 place-items-center rounded-full ${
                    theme === value
                      ? "bg-[var(--color-text-primary)] text-[var(--color-bg-canvas)]"
                      : "text-[var(--color-text-secondary)] data-[focus]:bg-[var(--color-border-subtle)]"
                  }`}
                >
                  <Icon size={15} aria-hidden="true" />
                </button>
              </MenuItem>
            ))}
          </div>
        </div>

        <MenuSeparator className="my-1 h-px bg-[var(--color-border-subtle)]" />

        <MenuItem>
          <button type="button" className={itemClass} onClick={() => void signOut()}>
            <LogOut size={16} aria-hidden="true" />
            Sign out
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}
