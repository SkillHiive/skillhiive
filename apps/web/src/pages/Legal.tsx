import type { ReactNode } from "react";
import { Link } from "react-router";
import { useTokens } from "@/theme";
import { CUE_SYNC_DISCLOSURE } from "@/lib/cueSyncFields";

const UPDATED = "15 November 2026";

function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTokens();
  return (
    <main
      className="focus-ring"
      style={{
        ["--ring-inner" as string]: colors.bg.canvas,
        ["--ring-outer" as string]: colors.text.primary,
        minHeight: "100vh",
        background: colors.bg.canvas,
        color: colors.text.primary,
        fontFamily: '"popreg", system-ui, sans-serif',
        padding: "120px 20px 80px",
      }}
    >
      <article style={{ maxWidth: 680, margin: "0 auto", lineHeight: 1.7, fontSize: 16 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>{title}</h1>
        <p style={{ color: colors.text.secondary, marginBottom: 32 }}>Last updated {UPDATED}</p>
        {children}
        <p style={{ marginTop: 40, color: colors.text.secondary }}>
          <Link to="/terms" style={{ textDecoration: "underline" }}>Terms</Link>
          {" · "}
          <Link to="/privacy" style={{ textDecoration: "underline" }}>Privacy</Link>
        </p>
      </article>
    </main>
  );
}

function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{heading}</h2>
      {children}
    </section>
  );
}

export function Terms() {
  return (
    <LegalPage title="Terms of use">
      <Section heading="Using SkillHiive">
        <p>
          SkillHiive is a place to focus with other people and keep a record of the work you do. You need an
          account to use most of it, and you are responsible for what happens under your account.
        </p>
      </Section>
      <Section heading="Your work is yours">
        <p>
          You keep ownership of everything you post, including notes, project pages and profile content. You give
          us permission to store it and show it to the people you have chosen to share it with, which is what
          running the service requires.
        </p>
      </Section>
      <Section heading="What is not allowed">
        <p>
          Do not harass other people, post spam, impersonate someone, record others in rooms without their
          agreement, or try to break or overload the service. Do not submit activity data you know to be false.
        </p>
      </Section>
      <Section heading="Rooms">
        <p>
          Rooms use live audio and video. Treat them like a shared library: other people are there to work. A room
          host or SkillHiive can remove someone who disrupts a room.
        </p>
      </Section>
      <Section heading="Ending an account">
        <p>
          You can stop using SkillHiive at any time and ask us to delete your account. We can suspend or close
          an account that breaks these terms.
        </p>
      </Section>
      <Section heading="No warranty">
        <p>
          SkillHiive is in early testing and is provided as it is. It may change, lose data, or be unavailable.
          Do not rely on it as your only record of anything important.
        </p>
      </Section>
      <Section heading="Changes">
        <p>If these terms change in a way that matters, we will tell you in the product before it takes effect.</p>
      </Section>
    </LegalPage>
  );
}

export function Privacy() {
  return (
    <LegalPage title="Privacy">
      <Section heading="What we store">
        <p>
          Your account details (email address, username, display name and avatar), what you create here (tasks,
          projects, notes, posts and replies), who your allies are, and when you were in a room.
        </p>
      </Section>
      <Section heading="Rooms">
        <p>
          Audio and video in rooms pass through our LiveKit media server so participants can see and hear each
          other. SkillHiive does not record rooms.
        </p>
      </Section>
      <Section heading="Coding time">
        <p>
          Coding time is opt-in and comes from one of two sources. If you connect WakaTime or Hackatime, we store
          your API key for that service and the project names, languages and daily totals it reports.
        </p>
        <p style={{ marginTop: 12 }}>
          If you link Cue, the Cue program on your computer sends the following. Time on every project you have
          not published is sent as a single total with no name. Commands, file names, file contents and paths
          are never sent. Running <code>cue sync --dry-run</code> prints exactly what would be sent.
        </p>
        {CUE_SYNC_DISCLOSURE.map((group) => (
          <div key={group.id} style={{ marginTop: 12 }}>
            <p style={{ fontWeight: 600 }}>{group.heading}</p>
            <ul style={{ paddingLeft: 24, listStyle: "disc" }}>
              {group.items.map((item) => (
                <li key={item.text}>{item.text}</li>
              ))}
            </ul>
          </div>
        ))}
      </Section>
      <Section heading="Who can see it">
        <p>
          Coding time and project pages are private until you make them public. Posts are shown to your allies.
          Your public profile shows only what you have marked public.
        </p>
      </Section>
      <Section heading="Where it lives">
        <p>
          Data is stored in our Supabase database, and the site is served by Vercel. We do not sell personal data
          or share it with advertisers.
        </p>
      </Section>
      <Section heading="Deleting your data">
        <p>
          Disconnecting a tracker in Settings deletes what it sent. When you remove a linked Cue device you choose
          whether to keep the history it sent or delete it; either way the device can no longer send anything. To
          delete your whole account, contact us and we will remove it.
        </p>
      </Section>
    </LegalPage>
  );
}
