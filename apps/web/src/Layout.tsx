import { lazy, Suspense, useEffect, useRef } from "react";
import { Routes, Route, useParams, Navigate, useLocation, useNavigationType, type Location } from "react-router";
import "./Layout.css";
import Nav from "./components/Nav";
import PageFallback from "./components/PageFallback";
import { AuthGate } from "./components/AuthGate";
import { ProfileProvider } from "./hooks/profileContext";
import ConfirmProvider from "./components/ConfirmProvider";
import ToastProvider from "./components/ToastProvider";
import { FocusSessionProvider } from "./components/focus/FocusSessionProvider";
import { RoomCallProvider } from "./components/rooms/RoomCallProvider";
import { useProfile } from "./hooks/useProfile";
import SEO from "./components/SEO";
import { useBackgroundLocation } from "./lib/postSheet";

// Each page is its own chunk, so opening one page doesn't download all the others.
const Landing = lazy(() => import("./pages/Landing"));
const Sign = lazy(() => import("./pages/Sign"));
const Register = lazy(() => import("./pages/Register"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Home = lazy(() => import("./pages/Home"));
const Focus = lazy(() => import("./pages/Focus"));
const Projects = lazy(() => import("./pages/Projects"));
const Feed = lazy(() => import("./pages/Feed"));
const Rooms = lazy(() => import("./pages/Rooms"));
const Room = lazy(() => import("./pages/Room"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const ProfileById = lazy(() => import("./pages/ProfileById"));
const Project = lazy(() => import("./pages/Project"));
const Post = lazy(() => import("./pages/Post"));
const Notifications = lazy(() => import("./pages/Notifications"));
const SettingsProfile = lazy(() => import("./pages/SettingsProfile"));
const SettingsTrackers = lazy(() => import("./pages/SettingsTrackers"));
const CueLink = lazy(() => import("./pages/CueLink"));
const Terms = lazy(() => import("./pages/Legal").then((m) => ({ default: m.Terms })));
const Privacy = lazy(() => import("./pages/Legal").then((m) => ({ default: m.Privacy })));
const NotFound = lazy(() => import("./pages/NotFound"));
const PostSheet = lazy(() => import("./components/post/PostSheet").then((m) => ({ default: m.PostSheet })));

/**
 * New pages open at the top; Back and Forward leave the browser to restore the position.
 * Opening or closing a post sheet isn't a new page: the page underneath stays where it was.
 */
function ScrollToTop({ pathname }: { pathname: string }) {
  const type = useNavigationType();
  // Read, not depended on: opening a sheet changes the type but not the page.
  const typeRef = useRef(type);
  useEffect(() => {
    typeRef.current = type;
  });
  useEffect(() => {
    if (typeRef.current !== "POP") window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppRoutes({ background }: { background: Location | null }) {
  const location = useLocation();

  return (
    <Suspense fallback={<PageFallback />}>
      {/* Every page fades in the same way (index.css .ui-page). */}
      {/* With a sheet open, the page underneath keeps rendering at its own location (same key, same
          routes), so it isn't remounted and keeps its scroll position. Routes always gets an explicit
          location: switching between passing one and not would change its tree and remount the page. */}
      <div key={(background ?? location).pathname} className="ui-page">
      <Routes location={background ?? location}>
        <Route
          path="/"
          element={
            <AuthGate require="guest">
              <SEO />
              <Landing />
            </AuthGate>
          }
        />
        <Route
          path="/login"
          element={
            <AuthGate require="guest">
              <SEO />
              <Sign />
            </AuthGate>
          }
        />
        <Route
          path="/register"
          element={
            <AuthGate require="guest">
              <SEO />
              <Register />
            </AuthGate>
          }
        />
        <Route
          path="/reset-password"
          element={
            <>
              <SEO customMeta={{ title: "Choose a new password — SkillHiive", noIndex: true }} />
              <ResetPassword />
            </>
          }
        />
        <Route
          path="/home"
          element={
            <AuthGate require="auth">
              <SEO />
              <Home />
            </AuthGate>
          }
        />
        <Route
          path="/focus"
          element={
            <AuthGate require="auth">
              <SEO customMeta={{ title: "Focus — SkillHiive", noIndex: true }} />
              <Focus />
            </AuthGate>
          }
        />
        <Route
          path="/projects"
          element={
            <AuthGate require="auth">
              <SEO customMeta={{ title: "Projects — SkillHiive", noIndex: true }} />
              <Projects />
            </AuthGate>
          }
        />
        <Route
          path="/feed"
          element={
            <AuthGate require="auth">
              <SEO />
              <Feed />
            </AuthGate>
          }
        />
        <Route
          path="/rooms"
          element={
            <AuthGate require="auth">
              <SEO />
              <Rooms />
            </AuthGate>
          }
        />
        <Route path="/review" element={<Navigate to="/home" replace />} />
        <Route path="/learn" element={<Navigate to="/home" replace />} />
        <Route
          path="/profile"
          element={
            <AuthGate require="auth">
              <SEO />
              <OwnProfile />
            </AuthGate>
          }
        />
        <Route
          path="/profile/:id"
          element={
            <AuthGate require="auth">
              <ProfileById />
            </AuthGate>
          }
        />
        <Route
          path="/p/:username"
          element={
            <>
              <SEO />
              <UserProfile />
            </>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <>
              <SEO />
              <Project />
            </>
          }
        />
        <Route
          path="/post/:postId"
          element={
            <AuthGate require="auth">
              <PostWithSEO />
            </AuthGate>
          }
        />
        <Route
          path="/notifications"
          element={
            <AuthGate require="auth">
              <SEO />
              <Notifications />
            </AuthGate>
          }
        />
        <Route
          path="/rooms/:roomName"
          element={
            <AuthGate require="auth">
              <SEO />
              <Room />
            </AuthGate>
          }
        />
        <Route
          path="/settings"
          element={<Navigate to="/settings/profile" replace />}
        />
        <Route
          path="/settings/profile"
          element={
            <AuthGate require="auth">
              <SEO />
              <SettingsProfile />
            </AuthGate>
          }
        />
        <Route
          path="/settings/trackers"
          element={
            <AuthGate require="auth">
              <SEO />
              <SettingsTrackers />
            </AuthGate>
          }
        />
        <Route path="/link" element={<><SEO /><CueLink /></>} />
        <Route path="/terms" element={<><SEO /><Terms /></>} />
        <Route path="/privacy" element={<><SEO /><Privacy /></>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </div>
      {/* A post opened from the feed: a sheet over the page above (components/post/PostSheet.tsx). */}
      {background && (
        <Suspense fallback={null}>
          <Routes>
            <Route
              path="/post/:postId"
              element={
                <AuthGate require="auth">
                  <PostSheetWithSEO />
                </AuthGate>
              }
            />
          </Routes>
        </Suspense>
      )}
    </Suspense>
  );
}

export default function App() {
  const location = useLocation();
  const background = useBackgroundLocation();
  return (
    <ProfileProvider>
      <ConfirmProvider>
        <ToastProvider>
          {/* The focus session outlives any one page: the nav's timer chip and /focus share it. */}
          <FocusSessionProvider>
            {/* A room outlives its page too: it floats over the rest of the app until you leave. */}
            <RoomCallProvider>
              <ScrollToTop pathname={(background ?? location).pathname} />
              <Nav />
              <AppRoutes background={background} />
            </RoomCallProvider>
          </FocusSessionProvider>
        </ToastProvider>
      </ConfirmProvider>
    </ProfileProvider>
  );
}

/** /profile → your own public profile. */
function OwnProfile() {
  const { profile, loading } = useProfile();

  if (loading) return <PageFallback />;

  if (profile?.username) {
    return <Navigate to={`/p/${encodeURIComponent(profile.username)}`} replace />;
  }

  // No username yet — send them to pick one first.
  return <Navigate to="/settings/profile" replace />;
}

function PostWithSEO() {
  const params = useParams<{ postId: string }>();
  return (
    <>
      <SEO dynamicParams={{ id: params.postId ?? "" }} />
      <Post />
    </>
  );
}

function PostSheetWithSEO() {
  const params = useParams<{ postId: string }>();
  return (
    <>
      <SEO dynamicParams={{ id: params.postId ?? "" }} />
      <PostSheet />
    </>
  );
}
