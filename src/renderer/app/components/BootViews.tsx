export function LoadingView() {
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

export function FatalView(props: { title: string; message: string }) {
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
