import { useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { Field, TextArea, OutputBlock, ErrorNote, CopyButton, RunButton, AiToolShell } from "../components/shared";
import { callAI } from "../aiClient";

export function CodeExplainerTool() {
  return (
    <AiToolShell
      callAI={callAI}
      inputLabel="Paste code"
      inputPlaceholder={"def add(a, b):\n    return a + b"}
      outputLabel="Plain-English explanation"
      buttonLabel="Explain"
      system="You explain code clearly to a non-technical reader. Avoid jargon where possible; when a technical term is necessary, briefly define it. Be concise but complete. Use short paragraphs, not headers."
      transform={(code) => `Explain what this code does, step by step, in plain English:\n\n${code}`}
    />
  );
}

export function CodeConverterTool() {
  const [from, setFrom] = useState("Python");
  const [to, setTo] = useState("JavaScript");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const languages = ["Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust", "Ruby", "PHP", "Swift", "Kotlin"];

  async function run() {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setOutput("");
    try {
      const result = await callAI(
        `Convert this ${from} code to ${to}. Return only the converted code with no explanation, no markdown fences, no commentary:\n\n${input}`,
        { system: "You are a precise code translator. Output only valid code in the target language. Never include markdown fences or commentary." }
      );
      setOutput(result.replace(/^```[\w]*\n?/, "").replace(/```$/, "").trim());
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const Select = ({ value, onChange }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-white/10 bg-well px-3 py-2 text-sm font-mono text-[#EDEEF0] focus:outline-none focus:ring-1 focus:ring-amber/60"
    >
      {languages.map((l) => <option key={l} value={l}>{l}</option>)}
    </select>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-sm">
        <Select value={from} onChange={setFrom} />
        <ChevronRight size={16} className="text-[#8B92A0]" />
        <Select value={to} onChange={setTo} />
      </div>
      <Field label={`${from} code`}>
        <TextArea value={input} onChange={setInput} placeholder="Paste code to convert…" rows={10} />
      </Field>
      <RunButton onClick={run} loading={loading}>Convert</RunButton>
      <ErrorNote message={error} />
      <Field label={`${to} code`} action={<CopyButton text={output} />}>
        <OutputBlock value={output} />
      </Field>
    </div>
  );
}

export function BugFinderTool() {
  return (
    <AiToolShell
      callAI={callAI}
      inputLabel="Paste code"
      inputPlaceholder="Paste a function or snippet you suspect has a bug…"
      outputLabel="Review"
      buttonLabel="Review code"
      system="You are a careful code reviewer. Point out actual bugs, edge cases, and risks. If something looks fine, say so plainly rather than inventing issues. Be concise, use plain language, and avoid headers — short paragraphs or a simple list is fine."
      transform={(code) => `Review this code for bugs, edge cases, and potential issues:\n\n${code}`}
    />
  );
}

export function PromptImproverTool() {
  return (
    <AiToolShell
      callAI={callAI}
      inputLabel="Your draft prompt"
      inputPlaceholder="Write me a blog post about coffee"
      outputLabel="Improved prompt"
      buttonLabel="Improve"
      system="You improve prompts for AI assistants. Make the prompt clearer, more specific, and more likely to get a good result. Return only the improved prompt text, with no preamble, no explanation, and no quotation marks around it."
      transform={(p) => `Improve this prompt:\n\n${p}`}
      rows={5}
    />
  );
}

export function SummarizerTool() {
  return (
    <AiToolShell
      callAI={callAI}
      inputLabel="Paste text"
      inputPlaceholder="Paste an article, email, or document…"
      outputLabel="Summary"
      buttonLabel="Summarize"
      system="You write clear, faithful summaries in plain language. Capture the key points and any concrete numbers or decisions. Default to 3-5 short sentences unless the source is very long, in which case a few short bullet points are fine. No headers."
      transform={(t) => `Summarize this:\n\n${t}`}
      rows={12}
    />
  );
}

export function RewriterTool() {
  const tones = ["Professional", "Friendly", "Concise", "Confident", "Casual"];
  const [tone, setTone] = useState("Professional");
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
      const result = await callAI(
        `Rewrite this text in a ${tone.toLowerCase()} tone. Keep the same meaning. Return only the rewritten text:\n\n${input}`,
        { system: "You rewrite text to match a requested tone while preserving meaning. Output only the rewritten text, no preamble." }
      );
      setOutput(result.trim());
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Field label="Tone">
        <div className="flex flex-wrap gap-2">
          {tones.map((t) => (
            <button
              key={t}
              onClick={() => setTone(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-mono transition-colors border ${
                tone === t
                  ? "bg-amber text-ink border-amber"
                  : "border-white/10 text-[#8B92A0] hover:text-white hover:border-white/20"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Original text">
        <TextArea value={input} onChange={setInput} placeholder="Paste text to rewrite…" rows={8} mono={false} />
      </Field>
      <RunButton onClick={run} loading={loading}>Rewrite</RunButton>
      <ErrorNote message={error} />
      <Field label="Rewritten" action={<CopyButton text={output} />}>
        <OutputBlock value={output} mono={false} />
      </Field>
    </div>
  );
}

export function CommitMessageTool() {
  return (
    <AiToolShell
      callAI={callAI}
      inputLabel="Paste your diff or describe the change"
      inputPlaceholder={"diff --git a/src/auth.js b/src/auth.js\n...\n\nor just describe what changed in plain words"}
      outputLabel="Commit message"
      buttonLabel="Generate"
      system="You write git commit messages following the Conventional Commits style (e.g. feat:, fix:, refactor:, docs:, chore:). Produce a short title line (under 72 characters) and, if useful, a brief body explaining why. Return only the commit message, no preamble, no markdown fences."
      transform={(t) => `Write a commit message for this change:\n\n${t}`}
      rows={10}
    />
  );
}

export function TranslateTool() {
  const languages = ["Spanish", "French", "German", "Italian", "Portuguese", "Japanese", "Korean", "Mandarin Chinese", "Hindi", "Arabic", "Russian", "Dutch"];
  const [target, setTarget] = useState("Spanish");
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
      const result = await callAI(
        `Translate this text into ${target}. Return only the translation, no preamble:\n\n${input}`,
        { system: "You are a precise, natural-sounding translator. Preserve tone and meaning. Output only the translated text." }
      );
      setOutput(result.trim());
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Field label="Translate into">
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="rounded-md border border-white/10 bg-well px-3 py-2 text-sm font-mono text-[#EDEEF0] focus:outline-none focus:ring-1 focus:ring-amber/60"
        >
          {languages.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </Field>
      <Field label="Text to translate">
        <TextArea value={input} onChange={setInput} placeholder="Type or paste text…" rows={8} mono={false} />
      </Field>
      <RunButton onClick={run} loading={loading}>Translate</RunButton>
      <ErrorNote message={error} />
      <Field label={`${target} translation`} action={<CopyButton text={output} />}>
        <OutputBlock value={output} mono={false} />
      </Field>
    </div>
  );
}

export function CodeFormatterTool() {
  const [lang, setLang] = useState("JavaScript");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function formatJs(code) {
    const lines = code
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((l) => l.trim())
      .filter((l, i, arr) => !(l === "" && arr[i - 1] === ""));
    let depth = 0;
    const out = [];
    for (let line of lines) {
      if (line === "") { out.push(""); continue; }
      const opensFirst = /^[}\])]/.test(line);
      if (opensFirst) depth = Math.max(0, depth - 1);
      out.push("  ".repeat(depth) + line);
      const opens = (line.match(/[{[(]/g) || []).length;
      const closes = (line.match(/[}\])]/g) || []).length;
      depth = Math.max(0, depth + opens - closes);
    }
    return out.join("\n");
  }

  async function run() {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setOutput("");
    try {
      if (lang === "JavaScript") {
        setOutput(formatJs(input));
      } else {
        const result = await callAI(
          `Reformat this Python code with consistent, idiomatic indentation and spacing (PEP 8 style). Return only the code, no markdown fences, no commentary:\n\n${input}`,
          { system: "You are a precise code formatter. Output only the formatted code. Never include markdown fences or commentary, and never change logic." }
        );
        setOutput(result.replace(/^```[\w]*\n?/, "").replace(/```$/, "").trim());
      }
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Field label="Language">
        <div className="inline-flex rounded-md border border-white/10 bg-well p-1">
          {["JavaScript", "Python"].map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`rounded px-3 py-1.5 text-sm font-mono transition-colors ${
                lang === l ? "bg-amber text-ink" : "text-[#8B92A0] hover:text-white"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Unformatted code">
        <TextArea value={input} onChange={setInput} placeholder="Paste messy code…" rows={10} />
      </Field>
      <RunButton onClick={run} loading={loading}>Format</RunButton>
      {lang === "Python" && (
        <p className="text-xs text-[#5A6068]">Python formatting uses AI — there's no in-browser Python formatter available.</p>
      )}
      <ErrorNote message={error} />
      <Field label="Formatted code" action={<CopyButton text={output} />}>
        <OutputBlock value={output} />
      </Field>
    </div>
  );
}
