import { useState } from "react";
import { Eye, EyeOff, AlertCircle, Check, Loader2, ExternalLink, Code2 } from "lucide-react";
import { PROVIDERS, saveSettings, callAI } from "./aiClient";

function ProviderCard({ id, info, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(id)}
      className={`text-left rounded-lg border px-4 py-3 transition-colors ${
        selected
          ? "border-amber bg-amber/10"
          : "border-white/10 bg-well hover:border-white/20"
      }`}
    >
      <span className={`block text-sm font-semibold ${selected ? "text-amber" : "text-[#EDEEF0]"}`}>{info.label}</span>
      <span className="block text-xs text-[#8B92A0] mt-0.5">
        {id === "anthropic" && "Claude models via your own API key."}
        {id === "openrouter" && "Access many models through one key."}
        {id === "ollama" && "Run models locally — nothing leaves your machine."}
      </span>
    </button>
  );
}

export default function SettingsScreen({ onSaved, initial, onCancel }) {
  const [provider, setProvider] = useState(initial?.provider || "anthropic");
  const [apiKey, setApiKey] = useState(initial?.apiKey || "");
  const [baseUrl, setBaseUrl] = useState(initial?.baseUrl || PROVIDERS.ollama.defaultUrl);
  const [model, setModel] = useState(initial?.model || PROVIDERS[initial?.provider || "anthropic"].defaultModel);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { ok, message }
  const [saved, setSaved] = useState(false);

  const info = PROVIDERS[provider];

  function selectProvider(id) {
    setProvider(id);
    setModel(PROVIDERS[id].defaultModel);
    setTestResult(null);
  }

  function buildSettings() {
    return {
      provider,
      apiKey: info.needsKey ? apiKey.trim() : undefined,
      baseUrl: info.needsUrl ? (baseUrl.trim() || PROVIDERS.ollama.defaultUrl) : undefined,
      model: model.trim() || info.defaultModel,
    };
  }

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    const settings = buildSettings();
    saveSettings(settings); // temporarily, so callAI can read it
    try {
      await callAI("Reply with just the word OK.", { system: "Reply with exactly one word." });
      setTestResult({ ok: true, message: "Connected — everything works." });
    } catch (e) {
      setTestResult({ ok: false, message: e.message });
    } finally {
      setTesting(false);
    }
  }

  function save() {
    const settings = buildSettings();
    saveSettings(settings);
    setSaved(true);
    onSaved(settings);
  }

  const canSave = info.needsKey ? apiKey.trim().length > 0 : true;

  return (
    <div className="min-h-screen w-full bg-ink text-[#EDEEF0] font-sans flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 mb-6">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-amber">
            <Code2 size={18} className="text-ink" strokeWidth={2.5} />
          </div>
          <h1 className="font-mono text-lg font-semibold tracking-tight">Workbench</h1>
        </div>

        <h2 className="text-xl font-semibold mb-1.5">
          {initial ? "AI provider settings" : "Connect an AI provider"}
        </h2>
        <p className="text-sm text-[#8B92A0] mb-6 leading-relaxed">
          {initial
            ? "Update which provider and model Workbench's AI-powered tools use."
            : "Workbench's AI tools need a model to call. Pick a provider below — you can change this anytime from Settings."}
        </p>

        <div className="grid grid-cols-1 gap-2.5 mb-5">
          {Object.entries(PROVIDERS).map(([id, info]) => (
            <ProviderCard key={id} id={id} info={info} selected={provider === id} onSelect={selectProvider} />
          ))}
        </div>

        <div className="space-y-4 rounded-lg border border-white/10 bg-panel p-4">
          {info.needsKey && (
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-[#8B92A0]">{info.keyLabel}</label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={info.keyPlaceholder}
                  className="w-full rounded-md border border-white/10 bg-well px-3 py-2 pr-9 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-amber/60"
                />
                <button type="button" onClick={() => setShowKey((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5A6068] hover:text-white">
                  {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p className="text-xs text-[#5A6068]">
                Stored only in this browser. Calls go straight from your browser to {info.label} — never through any server of ours.{" "}
                 <a href={info.docsUrl} target="_blank" rel="noopener noreferrer" className="text-teal hover:underline inline-flex items-center gap-0.5">
                  Get a key <ExternalLink size={11} />
                </a>
              </p>
            </div>
          )}

          {info.needsUrl && (
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-[#8B92A0]">{info.urlLabel}</label>
              <input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={info.urlPlaceholder}
                className="w-full rounded-md border border-white/10 bg-well px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-amber/60"
              />
              <p className="text-xs text-[#5A6068] leading-relaxed">
                Ollama must be running and allow requests from this site. Start it with{" "}
                <code className="text-teal">OLLAMA_ORIGINS=* ollama serve</code> (or set it to this site's exact address) if you see a connection error.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-[#8B92A0]">Model</label>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={info.defaultModel}
              className="w-full rounded-md border border-white/10 bg-well px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-amber/60"
            />
            <p className="text-xs text-[#5A6068]">{info.modelHelp}</p>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={testConnection}
              disabled={testing || !canSave}
              className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-well px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-50 transition-colors"
            >
              {testing && <Loader2 size={14} className="animate-spin" />}
              Test connection
            </button>
            {testResult && (
              <span className={`inline-flex items-center gap-1.5 text-sm ${testResult.ok ? "text-teal" : "text-[#E7A893]"}`}>
                {testResult.ok ? <Check size={14} /> : <AlertCircle size={14} />}
                {testResult.message}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={save}
            disabled={!canSave}
            className="inline-flex items-center gap-2 rounded-md bg-amber px-5 py-2.5 text-sm font-semibold text-ink hover:bg-[#f0b257] disabled:opacity-50 transition-colors"
          >
            Save and continue
          </button>
          {onCancel && (
            <button onClick={onCancel} className="text-sm text-[#8B92A0] hover:text-white">
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
