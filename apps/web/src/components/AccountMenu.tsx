import {
  Menu,
  MenuButton,
  MenuHeading,
  MenuItem,
  MenuItems,
  MenuSection,
  MenuSeparator,
} from "@headlessui/react";
import { Check, LogOut, Monitor, Moon, Pencil, Sun, Timer, UserRound } from "lucide-react";
import { useNavigate } from "react-router";
import { useTheme, type Theme } from "./themeContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";

const THEMES: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "system", label: "Match my computer", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

const itemClass =
  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-[var(--color-text-primary)] data-[focus]:bg-[var(--color-surface-secondary)]";

/** The avatar button in the top bar: profile, settings, theme and sign out. */
export default function AccountMenu() {
  const { profile } = useProfile();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    // If the server can't be reached, still end the session on this device.
    if (error) await supabase.auth.signOut({ scope: "local" });
    navigate("/", { replace: true });
  }

  const name = profile?.displayname || profile?.username || "Your account";
  const initial = name.slice(0, 1).toUpperCase();

  return (
    <Menu>
      <MenuButton
        aria-label="Account menu"
        className="grid size-10 place-items-center overflow-hidden rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] text-sm font-semibold text-[var(--color-text-primary)]"
      >
        {profile?.avatar ? (
          <img src={profile.avatar} alt="" className="size-full object-cover" />
        ) : (
          <span aria-hidden="true">{initial}</span>
        )}
      </MenuButton>

      <MenuItems
        anchor="bottom end"
        className="z-[1100] w-64 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-1.5 text-[var(--color-text-primary)] shadow-xl [--anchor-gap:8px] focus:outline-none"
      >
        <div className="px-3 pb-2 pt-1.5">
          <p className="truncate text-sm font-semibold">{name}</p>
          {profile?.username && (
            <p className="truncate font-mono text-xs text-[var(--color-text-secondary)]">
              @{profile.username}
            </p>
          )}
        </div>

        <MenuSeparator className="my-1 h-px bg-[var(--color-border-subtle)]" />

        <MenuItem>
          <button type="button" className={itemClass} onClick={() => navigate("/profile")}>
            <UserRound size={16} aria-hidden="true" />
            Your profile
          </button>
        </MenuItem>
        <MenuItem>
          <button type="button" className={itemClass} onClick={() => navigate("/settings/profile")}>
            <Pencil size={16} aria-hidden="true" />
            Edit profile
          </button>
        </MenuItem>
        <MenuItem>
          <button type="button" className={itemClass} onClick={() => navigate("/settings/trackers")}>
            <Timer size={16} aria-hidden="true" />
            Coding time and Cue
          </button>
        </MenuItem>

        <MenuSeparator className="my-1 h-px bg-[var(--color-border-subtle)]" />

        <MenuSection>
          <MenuHeading className="px-3 pb-1 pt-2 font-mono text-[11px] uppercase tracking-wider text-[var(--color-text-secondary)]">
            Theme
          </MenuHeading>
          {THEMES.map(({ value, label, Icon }) => (
            <MenuItem key={value}>
              <button type="button" className={itemClass} onClick={() => setTheme(value)}>
                <Icon size={16} aria-hidden="true" />
                <span className="flex-1">{label}</span>
                {theme === value && (
                  <>
                    <Check size={16} aria-hidden="true" />
                    <span className="sr-only">(current)</span>
                  </>
                )}
              </button>
            </MenuItem>
          ))}
        </MenuSection>

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
