import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { NewProviderInput, ProviderDefinition, RuntimeSnapshot, UiSettingsPatch } from "../shared/types";
import { FatalView, LoadingView } from "./app/components/BootViews";
import { HomeView } from "./app/components/HomeView";
import { SettingsView } from "./app/components/SettingsView";
import { Sidebar } from "./app/components/Sidebar";
import { WorkspaceView } from "./app/components/WorkspaceView";
import { useEmbeddedAutoFallback } from "./app/hooks/useEmbeddedAutoFallback";
import { useBootstrapState } from "./app/hooks/useBootstrapState";
import { useSidebarAutoHide } from "./app/hooks/useSidebarAutoHide";
import { useWebviewLifecycle } from "./app/hooks/useWebviewLifecycle";
import type { View } from "./app/types";

const runtimeLabels: Record<RuntimeSnapshot["state"], string> = {
  stopped: "未启动",
  hidden: "已隐藏",
  "visible-unfocused": "后台可见",
  "visible-focused": "前台显示"
};

const engineLabels: Record<ProviderDefinition["engine"], string> = {
  embedded: "内嵌模式",
  "isolated-external": "独立回退窗"
};

const emptyForm: NewProviderInput = {
  label: "",
  url: "",
  icon: ""
};

export function App() {
  const [view, setView] = useState<View>("workspace");
  const [form, setForm] = useState<NewProviderInput>(emptyForm);
  const [formError, setFormError] = useState("");
  const [formBusy, setFormBusy] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const startupViewAppliedRef = useRef(false);
  const {
    loading,
    bootstrap,
    providers,
    activeProviderId,
    runtime,
    uiSettings,
    shortcutStatus,
    bootstrapError,
    setActiveProviderId
  } = useBootstrapState();

  const activeProvider = providers.find((provider) => provider.id === activeProviderId) ?? providers[0] ?? null;
  const visibleProviders = useMemo(() => providers.filter((provider) => provider.enabled), [providers]);
  const embeddedProviders = useMemo(
    () => visibleProviders.filter((provider) => provider.engine === "embedded"),
    [visibleProviders]
  );
  const sidebarAutoHideActive = uiSettings.sidebarAutoHide && view === "workspace";
  const activeEmbeddedProvider =
    view === "workspace" && activeProvider?.engine === "embedded" ? activeProvider : null;
  const {
    webviewState,
    webviewError,
    bindWebviewNode,
    retryEmbeddedPage
  } = useWebviewLifecycle(activeEmbeddedProvider);
  const {
    collapsed: sidebarCollapsed,
    onSidebarExpand,
    onSidebarCollapse
  } = useSidebarAutoHide(sidebarAutoHideActive);

  useEffect(() => {
    if (!bootstrap || startupViewAppliedRef.current) {
      return;
    }
    startupViewAppliedRef.current = true;
    setView(bootstrap.settings?.ui?.startupView ?? "workspace");
  }, [bootstrap]);
  useEmbeddedAutoFallback(uiSettings.autoFallbackOnEmbedError, webviewState, activeEmbeddedProvider);

  async function updateUiSettings(patch: UiSettingsPatch): Promise<void> {
    setSettingsError("");
    try {
      await window.aidc.updateUiSettings(patch);
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "更新设置失败。");
    }
  }

  async function openProvider(providerId: string) {
    setView("workspace");
    setActiveProviderId(providerId);
    setFormError("");
    await window.aidc.selectProvider(providerId);
  }

  async function toggleProviderVisibility(provider: ProviderDefinition) {
    try {
      await window.aidc.setProviderEnabled(provider.id, !provider.enabled);
      if (provider.id === activeProviderId && provider.enabled) {
        setView("home");
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "更新左侧栏失败。");
    }
  }

  async function removeProvider(provider: ProviderDefinition) {
    try {
      await window.aidc.removeProvider(provider.id);
      if (provider.id === activeProviderId) {
        setView("home");
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "删除失败。");
    }
  }

  async function handleCreateProvider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!form.label?.trim() || !form.url?.trim()) {
      setFormError("请填写名称和网址。");
      return;
    }

    try {
      setFormBusy(true);
      await window.aidc.createProvider(form);
      setForm(emptyForm);
      setView("home");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "添加失败。");
    } finally {
      setFormBusy(false);
    }
  }

  if (bootstrapError) {
    return <FatalView title="初始化失败" message={bootstrapError} />;
  }

  if (loading) {
    return <LoadingView />;
  }

  if (!bootstrap || !activeProvider) {
    return <FatalView title="无法加载可用的 AI 服务" message="当前配置中没有可用服务，请重试或检查配置文件。" />;
  }

  return (
    <div className="app-frame">
      <div className="window-drag-region" aria-hidden="true" />
      <div
        className={`app-shell ${sidebarAutoHideActive ? "is-sidebar-autohide" : ""} ${sidebarCollapsed ? "is-sidebar-collapsed" : ""}`}
      >
        <Sidebar
          view={view}
          runtime={runtime}
          runtimeLabel={runtimeLabels[runtime.state]}
          visibleProviders={visibleProviders}
          activeProviderId={activeProviderId}
          autoHideEnabled={sidebarAutoHideActive}
          collapsed={sidebarCollapsed}
          onSidebarExpand={onSidebarExpand}
          onSidebarCollapse={onSidebarCollapse}
          onOpenProvider={openProvider}
          onSetView={setView}
        />

        <main className="workspace">
          {view === "home" ? (
            <HomeView
              providers={providers}
              visibleProviders={visibleProviders}
              activeProvider={activeProvider}
              runtime={runtime}
              uiSettings={uiSettings}
              form={form}
              formBusy={formBusy}
              formError={formError}
              setForm={setForm}
              onOpenProvider={openProvider}
              onOpenSettings={() => setView("settings")}
              onToggleProviderVisibility={toggleProviderVisibility}
              onRemoveProvider={removeProvider}
              onCreateProvider={handleCreateProvider}
            />
          ) : null}

          {view === "settings" ? (
            <SettingsView
              providers={providers}
              uiSettings={uiSettings}
              shortcutStatus={shortcutStatus}
              settingsError={settingsError}
              engineLabels={engineLabels}
              onUpdateUiSettings={updateUiSettings}
              onSetProviderEngine={(providerId, engine) => window.aidc.setProviderEngine(providerId, engine)}
            />
          ) : null}

          <WorkspaceView
            visible={view === "workspace"}
            activeProvider={activeProvider}
            activeEmbeddedProvider={activeEmbeddedProvider}
            embeddedProviders={embeddedProviders}
            keepAliveLimit={uiSettings.keepAliveLimit}
            loadingOverlayMode={uiSettings.loadingOverlayMode}
            webviewState={webviewState}
            webviewError={webviewError}
            bindWebviewNode={bindWebviewNode}
            onRetryEmbeddedPage={retryEmbeddedPage}
          />
        </main>
      </div>
    </div>
  );
}
