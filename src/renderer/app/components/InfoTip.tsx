import { useId, type ReactNode } from "react";

interface InfoTipProps {
  label: string;
  children: ReactNode;
}

export function InfoTip(props: InfoTipProps) {
  const { label, children } = props;
  const tooltipId = useId();

  return (
    <div className="info-tip">
      <button
        type="button"
        className="info-tip-trigger"
        aria-label={label}
        aria-describedby={tooltipId}
      >
        <span aria-hidden="true">i</span>
      </button>
      <div id={tooltipId} role="tooltip" className="info-tip-content">
        {children}
      </div>
    </div>
  );
}
