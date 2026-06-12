export type AiInterfaceMode = "chat_completions" | "custom_json";

export type AiInterfaceConfig = {
  endpoint: string;
  apiKey: string;
  mode: AiInterfaceMode;
};

export function getAiInterfaceConfig(): AiInterfaceConfig | null {
  const endpoint = process.env.AI_API_ENDPOINT?.trim();
  const apiKey = process.env.AI_API_KEY?.trim();
  const mode = process.env.AI_API_MODE?.trim();

  if (!endpoint || !apiKey) return null;

  return {
    endpoint,
    apiKey,
    mode: mode === "custom_json" ? "custom_json" : "chat_completions",
  };
}

export function hasAiInterfaceConfig() {
  return Boolean(getAiInterfaceConfig());
}
