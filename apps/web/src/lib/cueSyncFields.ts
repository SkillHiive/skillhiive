/**
 * What the Cue program sends to SkillHiive, in the words the Privacy page uses.
 * Every entry lists the contract fields it covers (the paths in
 * packages/contracts/src/api/cueSync.ts); a unit test keeps this list and the
 * schemas in step, so a field cannot be added to the wire without being declared here.
 */
export interface CueSyncDisclosure {
  /** Plain wording shown on the Privacy page. */
  text: string;
  /** Contract field paths: "days.*" and "projects.*" for a days push, "link.*" for linking. */
  fields: readonly string[];
}

export interface CueSyncDisclosureGroup {
  id: "every-day" | "published-only" | "linking";
  heading: string;
  items: readonly CueSyncDisclosure[];
}

export const CUE_SYNC_DISCLOSURE: readonly CueSyncDisclosureGroup[] = [
  {
    id: "every-day",
    heading: "For every day, on every project",
    items: [
      { text: "the date", fields: ["days.date"] },
      { text: "an opaque project id that cannot be traced back to a folder, or “private” for time on projects you have not published", fields: ["days.projectKey"] },
      { text: "the number of active seconds", fields: ["days.seconds"] },
      { text: "how many of those seconds involved a coding agent", fields: ["days.agentSeconds"] },
      { text: "the same time split by source: shell, file changes, agent and commits", fields: ["days.sources.shell", "days.sources.fs", "days.sources.agent", "days.sources.git"] },
      { text: "your time zone, the Cue version and the format version", fields: ["timezone", "cueVersion", "schema"] },
    ],
  },
  {
    id: "published-only",
    heading: "Only for projects you chose to publish",
    items: [
      { text: "the project name", fields: ["projects.key", "projects.name"] },
      { text: "the host and path of its git remote, without a scheme or credentials", fields: ["projects.remote"] },
      { text: "language names with the seconds spent in each", fields: ["days.languages.name", "days.languages.seconds"] },
      { text: "a commit count", fields: ["days.commits"] },
    ],
  },
  {
    id: "linking",
    heading: "Once, when you link a computer",
    items: [
      { text: "the computer’s name and platform", fields: ["link.deviceName", "link.platform"] },
      { text: "the Cue version", fields: ["link.cueVersion"] },
      { text: "a one-way hash of the computer’s id, so linking it again reuses the same device and its time is not counted twice", fields: ["link.machineId"] },
      { text: "a public key that identifies the device; the private key never leaves it", fields: ["link.publicKey"] },
    ],
  },
];

/** Every contract field path the disclosure covers, for the test that keeps it in step with the schemas. */
export function disclosedFieldPaths(): string[] {
  return CUE_SYNC_DISCLOSURE.flatMap((group) => group.items.flatMap((item) => [...item.fields])).sort();
}
