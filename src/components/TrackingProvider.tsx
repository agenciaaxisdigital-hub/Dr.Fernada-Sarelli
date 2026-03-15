import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView, initUniversalClickTracker } from "@/lib/tracking";

let clickTrackerInitialized = false;

export default function TrackingProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  useEffect(() => {
    // Initialize universal click tracker once
    if (!clickTrackerInitialized) {
      initUniversalClickTracker();
      clickTrackerInitialized = true;
    }
  }, []);

  useEffect(() => {
    // Don't track admin pages
    if (location.pathname.startsWith("/admin")) return;
    trackPageView(location.pathname);
  }, [location.pathname]);

  return <>{children}</>;
}
