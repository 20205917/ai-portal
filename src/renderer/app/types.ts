export type View = "home" | "workspace" | "settings";
export type WebviewLoadState = "idle" | "loading" | "ready" | "error";

export type WebviewHost = HTMLElement & {
  reload: () => void;
  addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
  removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
};
