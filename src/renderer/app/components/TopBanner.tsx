import type { ReactNode } from "react";

interface TopBannerProps {
  className?: string;
  actions?: ReactNode;
}

export function TopBanner(props: TopBannerProps) {
  const { className, actions } = props;
  const classes = className ? `settings-top-banner ${className}` : "settings-top-banner";

  return (
    <div className={classes}>
      <div className="settings-top-banner-visual" aria-hidden="true">
        <span className="settings-top-banner-track" />
        <span className="settings-top-banner-glow" />
        <span className="settings-top-banner-node settings-top-banner-node-a" />
        <span className="settings-top-banner-node settings-top-banner-node-b" />
        <span className="settings-top-banner-node settings-top-banner-node-c" />
      </div>
      {actions ? <div className="top-banner-actions">{actions}</div> : null}
    </div>
  );
}
