import { useCallback, useEffect, useRef, useState } from "react";

interface SidebarAutoHideState {
  collapsed: boolean;
  onSidebarExpand: () => void;
  onSidebarCollapse: () => void;
}

export function useSidebarAutoHide(enabled: boolean, delayMs = 360): SidebarAutoHideState {
  const [expanded, setExpanded] = useState(true);
  const collapseTimerRef = useRef<number | null>(null);

  const clearCollapseTimer = useCallback(() => {
    if (collapseTimerRef.current) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearCollapseTimer();
    if (enabled) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
  }, [clearCollapseTimer, enabled]);

  useEffect(() => () => {
    clearCollapseTimer();
  }, [clearCollapseTimer]);

  const onSidebarExpand = useCallback(() => {
    if (!enabled) {
      return;
    }
    clearCollapseTimer();
    setExpanded(true);
  }, [clearCollapseTimer, enabled]);

  const onSidebarCollapse = useCallback(() => {
    if (!enabled) {
      return;
    }
    clearCollapseTimer();
    collapseTimerRef.current = window.setTimeout(() => {
      collapseTimerRef.current = null;
      setExpanded(false);
    }, delayMs);
  }, [clearCollapseTimer, delayMs, enabled]);

  return {
    collapsed: enabled && !expanded,
    onSidebarExpand,
    onSidebarCollapse
  };
}
