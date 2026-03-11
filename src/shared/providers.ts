import type { ProviderDefinition } from "./types";

export const defaultProviders: ProviderDefinition[] = [
  {
    id: "chatgpt",
    label: "ChatGPT",
    url: "https://chatgpt.com",
    engine: "embedded",
    icon: "◎",
    enabled: true,
    persistSession: true,
    fallbackMode: "isolated-external",
    source: "builtin",
    removable: false
  },
  {
    id: "doubao",
    label: "豆包",
    url: "https://www.doubao.com",
    engine: "embedded",
    icon: "豆",
    enabled: true,
    persistSession: true,
    fallbackMode: "isolated-external",
    source: "builtin",
    removable: false
  }
];
