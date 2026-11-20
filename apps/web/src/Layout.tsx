import { lazy, Suspense } from "react";
import { Routes, Route, useNavigate, useParams, Navigate } from "react-router";
import "./Layout.css";
import Nav from "./components/Nav";
import PageFallback from "./components/PageFallback";
import { AuthGate } from "./components/AuthGate";
import { ProfileProvider } from "./hooks/profileContext";
import ConfirmProvider from "./components/ConfirmProvider";
import { useProfile } from "./hooks/useProfile";
import { supabase } from "./lib/supabase";
import SEO from "./components/SEO";

// Each page is its own chunk, so opening one page doesn't download all the others.
const Landing = lazy(() => import("./pages/Landing"));
const Sign = lazy(() => import("./pages/Sign"));
const Register = lazy(() => import("./pages/Register"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Home = lazy(() => import("./pages/Home"));
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

function AppRoutes() {
  const navigate = useNavigate();

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
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
              <Room supabase={supabase} onLeave={() => navigate("/rooms")} />
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
    </Suspense>
  );
}

export default function App() {
  return (
    <ProfileProvider>
      <ConfirmProvider>
        <Nav />
        <AppRoutes />
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
