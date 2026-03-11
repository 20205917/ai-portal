export type View = "home" | "workspace" | "settings";
export type WebviewLoadState = "idle" | "loading" | "ready" | "error";

export type WebviewHost = HTMLElement & {
  reload: () => void;
  isLoading?: () => boolean;
  getURL?: () => string;
  executeJavaScript?: <T = unknown>(code: string, userGesture?: boolean) => Promise<T>;
  addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
  removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
};
