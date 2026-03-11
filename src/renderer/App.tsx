import { FormEvent, useMemo, useState } from "react";

import type { NewProviderInput, ProviderDefinition, RuntimeSnapshot } from "../shared/types";
import { HomeView } from "./app/components/HomeView";
import { SettingsView } from "./app/components/SettingsView";
import { Sidebar } from "./app/components/Sidebar";
import { WorkspaceView } from "./app/components/WorkspaceView";
import { useBootstrapState } from "./app/hooks/useBootstrapState";
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

function LoadingView() {
  return (
    <div className="loading-shell">
      <div className="loading-card">
        <span className="eyebrow">AIDC</span>
        <h1>正在启动 AI 调度台</h1>
        <p>正在恢复专用窗口与上次使用的服务，请稍候。</p>
      </div>
    </div>
  );
}

function FatalView(props: { title: string; message: string }) {
  return (
    <div className="loading-shell">
      <div className="loading-card">
        <span className="eyebrow">AIDC</span>
        <h1>{props.title}</h1>
        <p>{props.message}</p>
        <button type="button" className="primary-action" onClick={() => window.location.reload()}>
          重新加载
        </button>
      </div>
    </div>
  );
}

export function App() {
  const [view, setView] = useState<View>("workspace");
  const [form, setForm] = useState<NewProviderInput>(emptyForm);
  const [formError, setFormError] = useState("");
  const [formBusy, setFormBusy] = useState(false);
  const {
    loading,
    bootstrap,
    providers,
    activeProviderId,
    runtime,
    bootstrapError,
    setActiveProviderId
  } = useBootstrapState();

  const activeProvider = providers.find((provider) => provider.id === activeProviderId) ?? providers[0] ?? null;
  const visibleProviders = useMemo(() => providers.filter((provider) => provider.enabled), [providers]);
  const activeEmbeddedProvider =
    view === "workspace" && activeProvider?.engine === "embedded" ? activeProvider : null;
  const {
    webviewState,
    webviewError,
    bindWebviewNode,
    retryEmbeddedPage
  } = useWebviewLifecycle(activeEmbeddedProvider);

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
      <div className="app-shell">
        <Sidebar
          view={view}
          runtime={runtime}
          runtimeLabel={runtimeLabels[runtime.state]}
          visibleProviders={visibleProviders}
          activeProviderId={activeProviderId}
          onOpenProvider={openProvider}
          onSetView={setView}
        />

        <main className="workspace">
          {view === "home" ? (
            <HomeView
              providers={providers}
              visibleProviders={visibleProviders}
              form={form}
              formBusy={formBusy}
              formError={formError}
              setForm={setForm}
              onOpenProvider={openProvider}
              onToggleProviderVisibility={toggleProviderVisibility}
              onRemoveProvider={removeProvider}
              onCreateProvider={handleCreateProvider}
            />
          ) : null}

          {view === "settings" ? (
            <SettingsView
              providers={providers}
              engineLabels={engineLabels}
              onSetProviderEngine={(providerId, engine) => window.aidc.setProviderEngine(providerId, engine)}
            />
          ) : null}

          {view === "workspace" ? (
            <WorkspaceView
              activeProvider={activeProvider}
              activeEmbeddedProvider={activeEmbeddedProvider}
              webviewState={webviewState}
              webviewError={webviewError}
              bindWebviewNode={bindWebviewNode}
              onRetryEmbeddedPage={retryEmbeddedPage}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}
