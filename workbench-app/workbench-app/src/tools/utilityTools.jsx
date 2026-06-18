import { useState, useMemo } from "react";
import { Field, TextArea, OutputBlock, ErrorNote, CopyButton } from "../components/shared";

export function JsonFormatterTool() {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const output = useMemo(() => {
    if (!input.trim()) return "";
    try {
      const parsed = JSON.parse(input);
      setError("");
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      setError("That's not valid JSON: " + e.message);
      return "";
    }
  }, [input]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Paste JSON">
        <TextArea value={input} onChange={setInput} placeholder='{"hello": "world"}' rows={14} />
      </Field>
      <Field label="Formatted" action={<CopyButton text={output} />}>
        <ErrorNote message={error} />
        {!error && <OutputBlock value={output} />}
      </Field>
    </div>
  );
}

export function Base64Tool() {
  const [mode, setMode] = useState("encode");
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const output = useMemo(() => {
    if (!input) return "";
    try {
      setError("");
      if (mode === "encode") return btoa(unescape(encodeURIComponent(input)));
      return decodeURIComponent(escape(atob(input.trim())));
    } catch {
      setError("Couldn't decode that — check it's valid Base64.");
      return "";
    }
  }, [input, mode]);

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-md border border-white/10 bg-well p-1">
        {["encode", "decode"].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded px-3 py-1.5 text-sm font-mono capitalize transition-colors ${
              mode === m ? "bg-amber text-ink" : "text-[#8B92A0] hover:text-white"
            }`}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={mode === "encode" ? "Plain text" : "Base64"}>
          <TextArea value={input} onChange={setInput} placeholder={mode === "encode" ? "Hello, world!" : "SGVsbG8="} rows={10} />
        </Field>
        <Field label={mode === "encode" ? "Base64" : "Plain text"} action={<CopyButton text={output} />}>
          <ErrorNote message={error} />
          {!error && <OutputBlock value={output} />}
        </Field>
      </div>
    </div>
  );
}

export function DiffTool() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  const diff = useMemo(() => {
    const linesA = a.split("\n");
    const linesB = b.split("\n");
    const max = Math.max(linesA.length, linesB.length);
    const rows = [];
    for (let i = 0; i < max; i++) {
      const la = linesA[i];
      const lb = linesB[i];
      if (la === lb) rows.push({ type: "same", text: la ?? "" });
      else {
        if (la !== undefined) rows.push({ type: "removed", text: la });
        if (lb !== undefined) rows.push({ type: "added", text: lb });
      }
    }
    return rows;
  }, [a, b]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Original">
          <TextArea value={a} onChange={setA} placeholder="Paste the original text…" rows={8} />
        </Field>
        <Field label="Changed">
          <TextArea value={b} onChange={setB} placeholder="Paste the new version…" rows={8} />
        </Field>
      </div>
      <Field label="Line-by-line diff">
        <div className="rounded-lg border border-white/10 bg-well overflow-hidden">
          {diff.length === 0 || (a === "" && b === "") ? (
            <div className="px-3 py-2.5 text-sm text-[#5A6068]">The comparison will appear here.</div>
          ) : (
            diff.map((row, i) => (
              <div
                key={i}
                className={`px-3 py-1 font-mono text-sm whitespace-pre-wrap break-words border-l-2 ${
                  row.type === "added"
                    ? "bg-teal/10 border-l-teal text-[#BCEAE7]"
                    : row.type === "removed"
                    ? "bg-rust/10 border-l-rust text-[#E7A893]"
                    : "border-l-transparent text-[#8B92A0]"
                }`}
              >
                {row.type === "added" ? "+ " : row.type === "removed" ? "− " : "  "}
                {row.text || " "}
              </div>
            ))
          )}
        </div>
      </Field>
    </div>
  );
}

export function ColorTool() {
  const [hex, setHex] = useState("#E8A33D");

  function hexToHsl(hex) {
    let r = 0, g = 0, b = 0;
    const clean = hex.replace("#", "");
    if (clean.length === 6) {
      r = parseInt(clean.slice(0, 2), 16) / 255;
      g = parseInt(clean.slice(2, 4), 16) / 255;
      b = parseInt(clean.slice(4, 6), 16) / 255;
    }
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = (x) => Math.round(255 * x).toString(16).padStart(2, "0");
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
  }

  const valid = /^#[0-9A-Fa-f]{6}$/.test(hex);
  const { h, s, l } = valid ? hexToHsl(hex) : { h: 0, s: 0, l: 0 };

  const palette = useMemo(() => {
    if (!valid) return [];
    const steps = [-40, -20, -10, 0, 10, 20, 40];
    return steps.map((d) => hslToHex(h, s, Math.max(4, Math.min(96, l + d))));
  }, [hex, valid]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={valid ? hex : "#000000"}
          onChange={(e) => setHex(e.target.value)}
          className="h-11 w-11 rounded-md border border-white/10 bg-transparent cursor-pointer"
        />
        <input
          value={hex}
          onChange={(e) => setHex(e.target.value)}
          placeholder="#E8A33D"
          className="rounded-md border border-white/10 bg-well px-3 py-2 text-sm font-mono text-[#EDEEF0] focus:outline-none focus:ring-1 focus:ring-amber/60 w-32"
        />
        {valid && <span className="text-xs font-mono text-[#8B92A0]">hsl({h}, {s}%, {l}%)</span>}
      </div>
      {!valid && <ErrorNote message="Enter a 6-digit hex color, like #E8A33D." />}
      {valid && (
        <Field label="Tonal palette (light → dark)">
          <div className="grid grid-cols-7 gap-2">
            {palette.map((c, i) => (
              <button
                key={i}
                onClick={() => navigator.clipboard?.writeText(c)}
                className="group flex flex-col items-center gap-1.5"
                title={`Copy ${c}`}
              >
                <div
                  className="h-14 w-full rounded-md border border-white/10 group-hover:scale-105 transition-transform"
                  style={{ backgroundColor: c }}
                />
                <span className="text-[10px] font-mono text-[#8B92A0]">{c}</span>
              </button>
            ))}
          </div>
        </Field>
      )}
    </div>
  );
}

export function RegexTool() {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState("g");
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const { matches, highlighted } = useMemo(() => {
    if (!pattern || !text) return { matches: [], highlighted: null };
    try {
      const found = [...text.matchAll(new RegExp(pattern, flags.includes("g") ? flags : flags + "g"))];
      setError("");
      let last = 0;
      const parts = [];
      found.forEach((m, i) => {
        parts.push(text.slice(last, m.index));
        parts.push({ match: m[0], key: i });
        last = m.index + m[0].length;
      });
      parts.push(text.slice(last));
      return { matches: found, highlighted: parts };
    } catch (e) {
      setError("Invalid pattern: " + e.message);
      return { matches: [], highlighted: null };
    }
  }, [pattern, flags, text]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <Field label="Pattern">
            <input
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="\d+"
              className="w-full rounded-md border border-white/10 bg-well px-3 py-2 text-sm font-mono text-[#EDEEF0] focus:outline-none focus:ring-1 focus:ring-amber/60"
            />
          </Field>
        </div>
        <div className="w-24">
          <Field label="Flags">
            <input
              value={flags}
              onChange={(e) => setFlags(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-well px-3 py-2 text-sm font-mono text-[#EDEEF0] focus:outline-none focus:ring-1 focus:ring-amber/60"
            />
          </Field>
        </div>
      </div>
      <Field label="Test text">
        <TextArea value={text} onChange={setText} placeholder="Paste text to test against…" rows={6} />
      </Field>
      <ErrorNote message={error} />
      {!error && (
        <Field label={`Matches (${matches.length})`}>
          <div className="rounded-lg border border-white/10 bg-well px-3 py-2.5 text-sm font-mono whitespace-pre-wrap break-words min-h-[3rem] text-[#EDEEF0]">
            {highlighted
              ? highlighted.map((p, i) =>
                  typeof p === "string" ? (
                    <span key={i}>{p}</span>
                  ) : (
                    <span key={p.key} className="rounded-sm bg-amber/30 text-[#FFD9A0]">
                      {p.match}
                    </span>
                  )
                )
              : <span className="text-[#5A6068]">Matches will be highlighted here.</span>}
          </div>
        </Field>
      )}
    </div>
  );
}

export function MarkdownHtmlTool() {
  const [md, setMd] = useState("");

  const html = useMemo(() => {
    if (!md.trim()) return "";
    let text = md;
    text = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    text = text.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`);
    text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
    text = text.replace(/^###### (.*)$/gm, "<h6>$1</h6>");
    text = text.replace(/^##### (.*)$/gm, "<h5>$1</h5>");
    text = text.replace(/^#### (.*)$/gm, "<h4>$1</h4>");
    text = text.replace(/^### (.*)$/gm, "<h3>$1</h3>");
    text = text.replace(/^## (.*)$/gm, "<h2>$1</h2>");
    text = text.replace(/^# (.*)$/gm, "<h1>$1</h1>");
    text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/\*(.*?)\*/g, "<em>$1</em>");
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    text = text.replace(/(^|\n)((?:[-*] .*(?:\n|$))+)/g, (_, lead, block) => {
      const items = block.trim().split("\n").map((l) => `<li>${l.replace(/^[-*] /, "")}</li>`).join("");
      return `${lead}<ul>${items}</ul>`;
    });
    text = text
      .split("\n\n")
      .map((block) => (/^\s*<(h\d|ul|pre|li)/.test(block.trim()) ? block : `<p>${block.trim()}</p>`))
      .join("\n");
    return text.trim();
  }, [md]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Markdown">
        <TextArea value={md} onChange={setMd} placeholder={"# Title\n\nSome **bold** and *italic* text.\n\n- one\n- two"} rows={14} />
      </Field>
      <Field label="HTML" action={<CopyButton text={html} />}>
        <OutputBlock value={html} />
      </Field>
    </div>
  );
}
