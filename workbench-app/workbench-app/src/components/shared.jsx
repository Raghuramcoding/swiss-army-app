import { useState } from "react";
import { Copy, Check, Loader2, AlertCircle } from "lucide-react";

export function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = (text) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return [copied, copy];
}

export function CopyButton({ text, label = "Copy" }) {
  const [copied, copy] = useCopy();
  if (!text) return null;
  return (
    <button
      onClick={() => copy(text)}
      className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-mono text-[#C7CBD3] hover:bg-white/10 hover:text-white transition-colors"
    >
      {copied ? <Check size={13} className="text-amber" /> : <Copy size={13} />}
      {copied ? "Copied" : label}
    </button>
  );
}

export function RunButton({ onClick, loading, children = "Run" }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-md bg-amber px-4 py-2 text-sm font-semibold text-ink hover:bg-[#f0b257] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {loading && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  );
}

export function ErrorNote({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 rounded-md border border-rust/40 bg-rust/10 px-3 py-2 text-sm text-[#E7A893]">
      <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function TextArea({ value, onChange, placeholder, rows = 8, mono = true }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      spellCheck={false}
      className={`w-full resize-none rounded-lg border border-white/10 bg-well px-3 py-2.5 text-sm text-[#EDEEF0] placeholder:text-[#5A6068] focus:outline-none focus:ring-1 focus:ring-amber/60 focus:border-amber/40 ${mono ? "font-mono" : "font-sans"}`}
    />
  );
}

export function OutputBlock({ value, mono = true, empty = "Output will appear here." }) {
  return (
    <div
      className={`w-full min-h-[8rem] rounded-lg border border-white/10 bg-well px-3 py-2.5 text-sm whitespace-pre-wrap break-words ${
        mono ? "font-mono" : "font-sans"
      } ${value ? "text-[#EDEEF0]" : "text-[#5A6068]"}`}
    >
      {value || empty}
    </div>
  );
}

export function Field({ label, children, action }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-wider text-[#8B92A0]">{label}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

export function AiDot({ size = 6 }) {
  return (
    <span
      className="inline-block rounded-full bg-teal"
      style={{ width: size, height: size }}
      title="Uses AI"
    />
  );
}

export function AiToolShell({ inputLabel, inputPlaceholder, outputLabel, system, transform, rows = 10, buttonLabel = "Run", callAI }) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setOutput("");
    try {
      const prompt = transform ? transform(input) : input;
      const result = await callAI(prompt, { system });
      setOutput(result);
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Field label={inputLabel}>
        <TextArea value={input} onChange={setInput} placeholder={inputPlaceholder} rows={rows} />
      </Field>
      <RunButton onClick={run} loading={loading}>{buttonLabel}</RunButton>
      <ErrorNote message={error} />
      <Field label={outputLabel} action={<CopyButton text={output} />}>
        <OutputBlock value={output} mono={false} empty={loading ? "Thinking…" : "Output will appear here."} />
      </Field>
    </div>
  );
}
