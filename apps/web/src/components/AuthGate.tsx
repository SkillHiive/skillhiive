import { Navigate, useLocation } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { loginUrlFor, safeNext } from "../lib/returnTo";
import PageFallback from "./PageFallback";

interface AuthGateProps {
  children: React.ReactNode;
  require?: "auth" | "guest";
  redirectTo?: string;
}

export function AuthGate({ children, require = "auth", redirectTo }: AuthGateProps) {
  const session = useAuth();
  const location = useLocation();

  if (session === undefined) return <PageFallback />;

  if (require === "auth" && !session) {
    return <Navigate to={redirectTo ?? loginUrlFor(location.pathname + location.search)} replace />;
  }

  if (require === "guest" && session) {
    return <Navigate to={redirectTo ?? safeNext(location.search) ?? "/home"} replace />;
  }

  return <>{children}</>;
}