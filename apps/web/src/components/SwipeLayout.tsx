import React from "react";

/**
 * Kept so existing pages don't change shape. Pages no longer animate on their own:
 * Layout fades every page in the same way (index.css .ui-page), so half the app
 * doesn't slide while the other half pops in.
 */
const SwipeLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ width: "100%", minHeight: "100vh", position: "relative" }}>{children}</div>
);

export default SwipeLayout;
