import type { ProviderDefinition, RuntimeSnapshot } from "../../../shared/types";
import { glyphFor, providerIconStyle } from "../provider-visual";
import type { View } from "../types";
import { HomeIcon, SettingsIcon } from "./DockIcons";

interface SidebarProps {
  view: View;
  runtime: RuntimeSnapshot;
  runtimeLabel: string;
  visibleProviders: ProviderDefinition[];
  activeProviderId: string;
  autoHideEnabled: boolean;
  collapsed: boolean;
  onSidebarExpand: () => void;
  onSidebarCollapse: () => void;
  onOpenProvider: (providerId: string) => Promise<void>;
  onSetView: (view: View) => void;
}

export function Sidebar(props: SidebarProps) {
  const {
    view,
    runtime,
    runtimeLabel,
    visibleProviders,
    activeProviderId,
    autoHideEnabled,
    collapsed,
    onSidebarExpand,
    onSidebarCollapse,
    onOpenProvider,
    onSetView
  } = props;

  return (
    <aside
      className={`sidebar ${autoHideEnabled ? "is-auto-hide" : ""} ${collapsed ? "is-collapsed" : ""}`}
      onMouseEnter={onSidebarExpand}
      onMouseLeave={onSidebarCollapse}
      onFocusCapture={onSidebarExpand}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onSidebarCollapse();
        }
      }}
    >
      <div className="sidebar-content dock-top">
        <button
          type="button"
          className={`dock-home ${view === "home" ? "is-selected" : ""}`}
          title="首页"
          aria-label="首页"
          onClick={() => onSetView("home")}
        >
          <HomeIcon />
        </button>

        <nav className="provider-list">
          {visibleProviders.map((provider) => {
            const selected = provider.id === activeProviderId && view === "workspace";

            return (
              <button
                type="button"
                key={provider.id}
                className={`provider-button ${selected ? "is-selected" : ""}`}
                title={provider.label}
                aria-label={provider.label}
                onClick={() => void onOpenProvider(provider.id)}
              >
                <span className="provider-icon" style={providerIconStyle(provider)}>
                  {provider.iconDataUrl ? (
                    <img className="provider-icon-image" src={provider.iconDataUrl} alt="" />
                  ) : (
                    glyphFor(provider)
                  )}
                </span>
                <span className="provider-indicator" aria-hidden="true" />
              </button>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-content sidebar-footer">
        <div
          className={`runtime-chip runtime-${runtime.state}`}
          title={`窗口状态：${runtimeLabel}`}
          aria-label={`窗口状态：${runtimeLabel}`}
        />
        <button
          type="button"
          className={`settings-button ${view === "settings" ? "is-selected" : ""}`}
          title="设置"
          aria-label="设置"
          onClick={() => onSetView("settings")}
        >
          <SettingsIcon />
        </button>
      </div>
    </aside>
  );
}
