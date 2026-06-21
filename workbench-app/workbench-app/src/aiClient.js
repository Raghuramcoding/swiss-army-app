const SETTINGS_KEY = "workbench.aiSettings";
const FETCH_TIMEOUT = 30000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export function getSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function clearSettings() {
  localStorage.removeItem(SETTINGS_KEY);
}

export const PROVIDERS = {
  anthropic: {
    label: "Anthropic (Claude)",
    needsKey: true,
    keyLabel: "API key",
    keyPlaceholder: "sk-ant-…",
    defaultModel: "claude-sonnet-4-6",
    modelHelp: "e.g. claude-sonnet-4-6, claude-opus-4-7, claude-haiku-4-5-20251001",
    docsUrl: "https://console.anthropic.com/settings/keys",
  },
  openrouter: {
    label: "OpenRouter",
    needsKey: true,
    keyLabel: "API key",
    keyPlaceholder: "sk-or-…",
    defaultModel: "anthropic/claude-sonnet-4.6",
    modelHelp: "e.g. anthropic/claude-sonnet-4.6, openai/gpt-4o, meta-llama/llama-3.1-70b-instruct",
    docsUrl: "https://openrouter.ai/keys",
  },
  ollama: {
    label: "Ollama (local)",
    needsKey: false,
    needsUrl: true,
    urlLabel: "Server URL",
    urlPlaceholder: "http://localhost:11434",
    defaultUrl: "http://localhost:11434",
    defaultModel: "llama3.1",
    modelHelp: "Any model you've pulled, e.g. llama3.1, mistral, qwen2.5-coder",
    docsUrl: "https://ollama.com",
  },
};

export class AIError extends Error {}

export async function callAI(prompt, { system, tool } = {}) {
  const settings = getSettings();
  if (!settings || !settings.provider) {
    throw new AIError("No AI provider is configured yet. Open Settings to add one.");
  }

  const { provider, apiKey, baseUrl, model } = settings;

  if (provider === "anthropic") return callAnthropic({ prompt, system, apiKey, model });
  if (provider === "openrouter") return callOpenRouter({ prompt, system, apiKey, model });
  if (provider === "ollama") return callOllama({ prompt, system, baseUrl, model });

  throw new AIError("Unknown provider configured.");
}

async function callAnthropic({ prompt, system, apiKey, model }) {
  if (!apiKey) throw new AIError("Add your Anthropic API key in Settings.");
  const body = {
    model: model || PROVIDERS.anthropic.defaultModel,
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  };
  if (system) body.system = system;

  let res;
  try {
    res = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AIError("Couldn't reach Anthropic. Check your connection.");
  }
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new AIError(errBody?.error?.message || `Anthropic returned an error (${res.status}). Check your API key.`);
  }
  const data = await res.json();
  const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).filter(Boolean).join("\n");
  if (!text) throw new AIError("No response came back. Try again.");
  return text;
}

async function callOpenRouter({ prompt, system, apiKey, model }) {
  if (!apiKey) throw new AIError("Add your OpenRouter API key in Settings.");
  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });

  let res;
  try {
    res = await fetchWithTimeout("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "",
        "X-Title": "Workbench",
      },
      body: JSON.stringify({
        model: model || PROVIDERS.openrouter.defaultModel,
        max_tokens: 1500,
        messages,
      }),
    });
  } catch {
    throw new AIError("Couldn't reach OpenRouter. Check your connection.");
  }
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new AIError(errBody?.error?.message || `OpenRouter returned an error (${res.status}). Check your API key and model name.`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new AIError("No response came back. Try again.");
  return text;
}

async function callOllama({ prompt, system, baseUrl, model }) {
  const url = (baseUrl || PROVIDERS.ollama.defaultUrl).replace(/\/+$/, "");
  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });

  let res;
  try {
    res = await fetchWithTimeout(`${url}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model || PROVIDERS.ollama.defaultModel,
        messages,
        stream: false,
      }),
    });
  } catch {
    throw new AIError(
      "Couldn't reach Ollama. Make sure it's running, and that it allows requests from this site (set OLLAMA_ORIGINS before starting it)."
    );
  }
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new AIError(errText || `Ollama returned an error (${res.status}). Check the model name is pulled locally.`);
  }
  const data = await res.json();
  const text = data?.message?.content;
  if (!text) throw new AIError("No response came back. Try again.");
  return text;
}
