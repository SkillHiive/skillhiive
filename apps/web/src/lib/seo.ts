export const siteConfig = {
  name: "SkillHiive",
  description: "A developer collaboration platform built for presence, not performance. No algorithms. No leaderboards. Just intentional work with allies.",
  url: "https://skillhiive.com",
  ogImage: "/og-image.png",
  twitterHandle: "@skillhiive",
  organization: {
    name: "SkillHiive",
    url: "https://skillhiive.com",
    logo: "https://skillhiive.com/logo.png",
    sameAs: [
      "https://github.com/SkillHiive",
      "https://twitter.com/skillhiive",
    ],
  },
};

export type PageMeta = {
  title: string;
  description: string;
  path: string;
  ogType?: "website" | "article" | "profile";
  ogImage?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  jsonLd?: Record<string, unknown>[];
};

export const routeMeta: Record<string, PageMeta> = {
  "/": {
    title: "SkillHiive: a place to work",
    description: "Meet builders around real work, work beside them in live rooms, and keep your work moving while you sleep. Open source, no trackers, no ads.",
    path: "/",
    ogType: "website",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "SkillHiive",
        url: "https://skillhiive.com",
        logo: "https://skillhiive.com/logo.png",
        sameAs: ["https://github.com/SkillHiive"],
        description: "A place to work. Builders meet real people, work beside them, and keep their work moving while they sleep.",
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "SkillHiive",
        url: "https://skillhiive.com",
      },
    ],
  },
  "/login": {
    title: "Sign In — SkillHiive",
    description: "Sign in to your SkillHiive account to join rooms, collaborate with allies, and build intentionally.",
    path: "/login",
    noIndex: true,
    noFollow: true,
  },
  "/register": {
    title: "Join SkillHiive — Create Your Account",
    description: "Join SkillHiive, a place to work: real people, real work, live rooms. Free to belong, no trackers, no ads.",
    path: "/register",
    ogType: "website",
  },
  "/home": {
    title: "Today — SkillHiive",
    description: "Your SkillHiive daily driver. Plan what must happen today, focus, and capture what you shipped.",
    path: "/home",
    noIndex: true,
    noFollow: true,
  },
  "/rooms": {
    title: "Rooms — SkillHiive",
    description: "Join a work room and focus alongside allies with a shared rhythm.",
    path: "/rooms",
    noIndex: true,
    noFollow: true,
  },
  "/feed": {
    title: "Feed — SkillHiive",
    description: "What you and your allies are shipping. No strangers, no algorithm.",
    path: "/feed",
    noIndex: true,
    noFollow: true,
  },
  "/profile": {
    title: "Your Profile — SkillHiive",
    description: "Manage your SkillHiive profile, allies, and posts.",
    path: "/profile",
    noIndex: true,
    noFollow: true,
  },
  "/notifications": {
    title: "Notifications — SkillHiive",
    description: "Your SkillHiive notifications.",
    path: "/notifications",
    noIndex: true,
    noFollow: true,
  },
  "/settings/trackers": {
    title: "Coding time — SkillHiive",
    description: "Link Cue and choose what your profile shows.",
    path: "/settings/trackers",
    noIndex: true,
    noFollow: true,
  },
  "/settings/profile": {
    title: "Profile Settings — SkillHiive",
    description: "Update your SkillHiive profile settings.",
    path: "/settings/profile",
    noIndex: true,
    noFollow: true,
  },
};

export function getPageMeta(pathname: string, dynamicParams?: Record<string, string>): PageMeta {
  const exactMatch = routeMeta[pathname];
  if (exactMatch) return exactMatch;

  const dynamicRoutes: Array<{ pattern: RegExp; meta: PageMeta }> = [
    {
      pattern: /^\/profile\/([^/]+)$/,
      meta: {
        title: "",
        description: "",
        path: "/profile/:id",
        ogType: "profile",
      },
    },
    {
      pattern: /^\/post\/([^/]+)$/,
      meta: {
        title: "",
        description: "",
        path: "/post/:postId",
        ogType: "article",
      },
    },
    {
      pattern: /^\/rooms\/([^/]+)$/,
      meta: {
        title: "Room — SkillHiive",
        description: "Collaborative workspace room on SkillHiive.",
        path: "/rooms/:roomName",
        noIndex: true,
        noFollow: true,
      },
    },
    {
      pattern: /^\/p\/([^/]+)$/,
      meta: {
        title: "Profile — SkillHiive",
        description: "Focus activity, projects, and shipped work on SkillHiive.",
        path: "/p/:username",
        ogType: "profile",
      },
    },
    {
      pattern: /^\/projects\/([^/]+)$/,
      meta: {
        title: "Project — SkillHiive",
        description: "A project built with intention on SkillHiive.",
        path: "/projects/:id",
        ogType: "article",
      },
    },
  ];

  for (const route of dynamicRoutes) {
    const match = pathname.match(route.pattern);
    if (match) {
      const meta = { ...route.meta };
      if (dynamicParams) {
        if (meta.title.includes(":") && dynamicParams['id']) {
          meta.title = `${dynamicParams['id']} — SkillHiive`;
        }
        if (meta.description.includes(":") && dynamicParams['id']) {
          meta.description = `View ${dynamicParams['id']}'s profile on SkillHiive.`;
        }
      }
      return meta;
    }
  }

  return {
    title: "SkillHiive",
    description: siteConfig.description,
    path: pathname,
    noIndex: true,
  };
}

export function generateCanonicalUrl(pathname: string): string {
  return `${siteConfig.url}${pathname}`;
}

export function generateJsonLd(schemas: Record<string, unknown>[]): string {
  return JSON.stringify(schemas, null, 2);
}