import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  identifyAnalyticsUser,
  resetAnalyticsUser,
  trackPageView,
} from "../lib/analytics";

interface AnalyticsTrackerProps {
  userId?: string;
}

const AnalyticsTracker = ({ userId }: AnalyticsTrackerProps) => {
  const location = useLocation();
  const previousUserId = useRef<string | undefined>(undefined);

  useEffect(() => {
    trackPageView(location.pathname, location.search);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (userId) {
      identifyAnalyticsUser(userId);
      previousUserId.current = userId;
      return;
    }

    if (previousUserId.current) {
      resetAnalyticsUser();
      previousUserId.current = undefined;
    }
  }, [userId]);

  return null;
};

export default AnalyticsTracker;
