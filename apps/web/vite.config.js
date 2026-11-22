import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
const ORG = "SkillHiive";
/**
 * The landing page's latest public commits, read once when the site is built so a visitor's
 * browser never calls GitHub. Raw items from GitHub's commits API, cut down to the fields the
 * page parses (src/lib/landing.ts). An empty list when GitHub can't be reached: the page then
 * shows the link and no history.
 */
async function recentCommits() {
    const get = async (path) => {
        const res = await fetch(`https://api.github.com${path}`, { signal: AbortSignal.timeout(8000) });
        if (!res.ok)
            throw new Error(`GitHub ${res.status}`);
        return res.json();
    };
    try {
        const repos = (await get(`/orgs/${ORG}/repos?type=public&sort=pushed&per_page=3`));
        return await Promise.all(repos.map(async ({ name }) => {
            const items = (await get(`/repos/${ORG}/${encodeURIComponent(name)}/commits?per_page=4`));
            return {
                repo: name,
                items: items.map((i) => ({
                    sha: i.sha,
                    html_url: i.html_url,
                    commit: { message: i.commit?.message, author: { date: i.commit?.author?.date ?? i.commit?.committer?.date } },
                })),
            };
        }));
    }
    catch {
        return [];
    }
}
export default defineConfig(async ({ mode }) => ({
    plugins: [react(), tailwindcss(), tsconfigPaths()],
    define: {
        __RECENT_COMMITS__: JSON.stringify(mode === "test" ? [] : await recentCommits()),
    },
    server: {
        proxy: {
            // The same rewrite as vercel.json: the status page's live state, from our own origin.
            "/api/status": {
                target: "https://status.skillhiive.com",
                changeOrigin: true,
                rewrite: () => "/api/status-page/heartbeat/skillhiive",
            },
        },
    },
}));
//# sourceMappingURL=vite.config.js.map