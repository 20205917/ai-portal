import type { ProviderDefinition } from "../../../shared/types";

interface SettingsViewProps {
  providers: ProviderDefinition[];
  engineLabels: Record<ProviderDefinition["engine"], string>;
  onSetProviderEngine: (providerId: string, engine: ProviderDefinition["engine"]) => Promise<void>;
}

export function SettingsView(props: SettingsViewProps) {
  const { providers, engineLabels, onSetProviderEngine } = props;

  return (
    <section className="settings-shell">
      <section className="settings-grid">
        <article className="panel">
          <h3>功能说明</h3>
          <div className="description-list">
            <p>首页负责添加、删除和管理左侧栏 AI 网页。</p>
            <p>左侧图标点击后会直接切换到对应 AI 页面。</p>
            <p>当某个站点内嵌兼容性不稳定时，可以切到独立回退窗。</p>
          </div>
        </article>

        <article className="panel">
          <h3>快捷键绑定</h3>
          <div className="shortcut-card">
            <strong>推荐快捷键</strong>
            <p>
              <code>Super + A</code>：拉起、聚焦或隐藏 AI 调度台
            </p>
            <p>
              在 Ubuntu 的“设置 - 键盘 - 自定义快捷键”中，把命令设为 <code>aidc toggle</code>。
            </p>
          </div>
        </article>

        <article className="panel settings-wide">
          <h3>服务模式</h3>
          <p>默认使用内嵌模式；如果某个站点兼容性不稳定，可以切到独立回退窗。</p>
          <div className="settings-list">
            {providers.map((provider) => {
              const canFallback = provider.fallbackMode === "isolated-external";
              const targetMode = provider.engine === "embedded" ? "isolated-external" : "embedded";

              return (
                <div className="provider-setting" key={provider.id}>
                  <div>
                    <strong>{provider.label}</strong>
                    <small>{engineLabels[provider.engine]}</small>
                  </div>
                  <div className="provider-setting-actions">
                    {canFallback ? (
                      <button
                        type="button"
                        onClick={() => void onSetProviderEngine(provider.id, targetMode)}
                      >
                        {provider.engine === "embedded" ? "切到独立窗口" : "恢复内嵌模式"}
                      </button>
                    ) : (
                      <button type="button" disabled>
                        不支持回退
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>
    </section>
  );
}
