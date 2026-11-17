import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import { Check, Laptop } from "lucide-react";
import { Text } from "@skillhiive/ui";
import { useTokens } from "@/theme";
import { useAuth } from "@/hooks/useAuth";
import { loginUrlFor } from "@/lib/returnTo";
import { approveCueLink, normalizeLinkCode, peekCueLink, type CueLinkPreview } from "@/lib/cue";

type Stage = "enter" | "checking" | "confirm" | "approving" | "done" | "gone";

/** /link?code=ABCD-2345 — approve the device that printed this code in the terminal. */
export default function CueLink() {
  const { colors, spacing, radii } = useTokens();
  const session = useAuth();
  const [params] = useSearchParams();
  const location = useLocation();
  const fromUrl = normalizeLinkCode(params.get("code"));
  const [typed, setTyped] = useState(fromUrl ?? "");
  const [code, setCode] = useState<string | null>(fromUrl);
  const [stage, setStage] = useState<Stage>(fromUrl ? "checking" : "enter");
  const [device, setDevice] = useState<CueLinkPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !code) return;
    let active = true;
    void peekCueLink(code).then((preview) => {
      if (!active) return;
      setDevice(preview);
      setStage(preview ? "confirm" : "gone");
    });
    return () => {
      active = false;
    };
  }, [session, code]);

  async function approve() {
    if (!code) return;
    setStage("approving");
    setError(null);
    const result = await approveCueLink(code);
    if (result.ok) {
      setStage("done");
    } else {
      setError(result.error);
      setStage("confirm");
    }
  }

  function submitTyped(event: React.FormEvent) {
    event.preventDefault();
    const next = normalizeLinkCode(typed);
    if (!next) {
      setError("Enter the 8-character code from your terminal.");
      return;
    }
    setError(null);
    setStage("checking");
    setCode(next);
  }

  const button: React.CSSProperties = {
    padding: "10px 18px",
    borderRadius: radii.pill,
    border: "none",
    background: colors.surface.skillhive,
    color: colors.text.onTint,
    fontFamily: "inherit",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
  };

  let body: React.ReactNode;
  if (session === undefined) {
    body = <Text variant="bodySm" tone="tertiary">Loading…</Text>;
  } else if (session === null) {
    body = (
      <>
        <Text variant="bodySm" tone="secondary">
          Sign in to SkillHiive and you will come straight back here to finish linking your computer.
        </Text>
        <Link to={loginUrlFor(location.pathname + location.search)} style={{ ...button, textDecoration: "none", width: "fit-content" }}>Sign in</Link>
      </>
    );
  } else if (stage === "done") {
    body = (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
          <Check size={18} color={colors.tint.success} />
          <Text variant="title" weight={800}>{device?.device_name ?? "Your computer"} is linked</Text>
        </div>
        <Text variant="bodySm" tone="secondary">
          Go back to your terminal. Your time will start appearing on your profile within a few minutes.
        </Text>
        <Link to="/settings/trackers" style={{ color: colors.text.skillhive, fontWeight: 700 }}>Manage linked devices</Link>
      </>
    );
  } else if (stage === "gone") {
    body = (
      <>
        <Text variant="title" weight={800}>That code isn't valid any more</Text>
        <Text variant="bodySm" tone="secondary">
          Codes last ten minutes and work once. Run <code>cue login</code> again to get a new one.
        </Text>
      </>
    );
  } else if ((stage === "confirm" || stage === "approving") && device) {
    body = (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
          <Laptop size={18} color={colors.surface.skillhive} />
          <div>
            <Text variant="title" weight={800}>{device.device_name}</Text>
            <Text variant="caption" tone="tertiary">{device.platform} · code {code}</Text>
          </div>
        </div>
        <Text variant="bodySm" tone="secondary">
          Linking lets this computer send your daily coding totals to SkillHiive. Project names are sent only
          for projects you publish with <code>cue publish</code>; commands, file names and paths are never sent.
          Only approve a code you just saw in your own terminal.
        </Text>
        <button onClick={approve} disabled={stage === "approving"} style={{ ...button, width: "fit-content", opacity: stage === "approving" ? 0.6 : 1 }}>
          {stage === "approving" ? "Linking…" : "Link this computer"}
        </button>
      </>
    );
  } else if (stage === "checking") {
    body = <Text variant="bodySm" tone="tertiary">Checking the code…</Text>;
  } else {
    body = (
      <form onSubmit={submitTyped} style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
        <label htmlFor="cue-code">
          <Text variant="bodySm" tone="secondary">Enter the code that <code>cue login</code> printed.</Text>
        </label>
        <input
          id="cue-code"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder="ABCD-2345"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          style={{
            padding: "10px 12px",
            borderRadius: radii.md,
            border: `1px solid ${colors.border.subtle}`,
            background: colors.bg.canvas,
            color: colors.text.primary,
            fontFamily: "ui-monospace, monospace",
            fontSize: 16,
            letterSpacing: 2,
            width: 180,
          }}
        />
        <button type="submit" style={{ ...button, width: "fit-content" }}>Continue</button>
      </form>
    );
  }

  return (
    <main
      className="focus-ring"
      style={{
        minHeight: "100vh",
        background: colors.bg.canvas,
        color: colors.text.primary,
        padding: "120px 20px 80px",
        ["--ring-inner" as string]: colors.bg.canvas,
        ["--ring-outer" as string]: colors.text.primary,
      }}
    >
      <div
        style={{
          maxWidth: 480,
          margin: "0 auto",
          background: colors.surface.primary,
          border: `1px solid ${colors.border.subtle}`,
          borderRadius: radii.lg,
          padding: spacing.lg,
          display: "flex",
          flexDirection: "column",
          gap: spacing.base,
        }}
      >
        <Text variant="headline" weight={900} style={{ letterSpacing: -0.5 }}>Link Cue</Text>
        {body}
        {error && (
          <Text variant="bodySm" role="alert" style={{ color: colors.tint.warning }}>{error}</Text>
        )}
      </div>
    </main>
  );
}
