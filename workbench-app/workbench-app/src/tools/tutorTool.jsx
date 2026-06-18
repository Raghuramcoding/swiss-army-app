import { useState, useEffect, useCallback, useRef } from "react";
import {
  BookOpen, Code2, MessageCircle, ChevronRight, ChevronLeft,
  RotateCcw, Check, Loader2, Star, Trophy, Flame, X,
  Play, Send, ArrowLeft, Pencil, Plus
} from "lucide-react";
import { callAI } from "../aiClient";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const LANGUAGES = [
  { id: "python", label: "Python", emoji: "🐍", color: "#3B7EC8" },
  { id: "javascript", label: "JavaScript", emoji: "⚡", color: "#F0C000" },
  { id: "typescript", label: "TypeScript", emoji: "🔷", color: "#3178C6" },
  { id: "rust", label: "Rust", emoji: "🦀", color: "#CE4A10" },
  { id: "go", label: "Go", emoji: "🐹", color: "#00ADD8" },
  { id: "java", label: "Java", emoji: "☕", color: "#ED8B00" },
  { id: "cpp", label: "C++", emoji: "⚙️", color: "#9C4A9C" },
  { id: "swift", label: "Swift", emoji: "🍎", color: "#FA7343" },
  { id: "kotlin", label: "Kotlin", emoji: "🎯", color: "#7F52FF" },
  { id: "sql", label: "SQL", emoji: "🗄️", color: "#4479A1" },
  { id: "react", label: "React", emoji: "⚛️", color: "#61DAFB" },
  { id: "css", label: "CSS", emoji: "🎨", color: "#1572B6" },
];

const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const STORAGE_KEY = "workbench.tutor.progress";

// ─────────────────────────────────────────────
// Progress helpers (localStorage)
// ─────────────────────────────────────────────

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch { return {}; }
}

function saveProgress(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function getLangProgress(langId) {
  const all = loadProgress();
  return all[langId] || { completedLessons: [], currentLevel: 0, streak: 0, lastSeen: null };
}

function markLessonComplete(langId, lessonKey) {
  const all = loadProgress();
  const lp = getLangProgress(langId);
  if (!lp.completedLessons.includes(lessonKey)) lp.completedLessons.push(lessonKey);

  const today = new Date().toDateString();
  if (lp.lastSeen !== today) {
    lp.streak = lp.lastSeen === new Date(Date.now() - 86400000).toDateString() ? lp.streak + 1 : 1;
    lp.lastSeen = today;
  }
  all[langId] = lp;
  saveProgress(all);
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function MarkdownLite({ content }) {
  // Lightweight renderer: code blocks, inline code, bold, paragraphs
  const lines = content.split("\n");
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={i} className="my-3 rounded-lg bg-[#0D0F11] border border-white/10 p-3 overflow-x-auto">
          <code className="text-sm font-mono text-[#BCEAE7]">{codeLines.join("\n")}</code>
        </pre>
      );
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-base font-semibold text-white mt-4 mb-1">{line.slice(4)}</h3>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-lg font-semibold text-white mt-5 mb-1">{line.slice(3)}</h2>);
    } else if (line.startsWith("# ")) {
      elements.push(<h1 key={i} className="text-xl font-bold text-white mt-5 mb-2">{line.slice(2)}</h1>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <li key={i} className="ml-4 text-sm text-[#C7CBD3] list-disc">
          {renderInline(line.slice(2))}
        </li>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(
        <p key={i} className="text-sm text-[#C7CBD3] leading-relaxed">
          {renderInline(line)}
        </p>
      );
    }
    i++;
  }
  return <div className="space-y-0.5">{elements}</div>;
}

function renderInline(text) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i} className="font-mono text-xs bg-white/10 text-[#FFD9A0] px-1 rounded">{part.slice(1, -1)}</code>;
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
    return part;
  });
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1 py-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="w-1.5 h-1.5 rounded-full bg-amber animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}

function ProgressBar({ value, max, color = "#E8A33D" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

// ─────────────────────────────────────────────
// Mode: LEARN — structured lessons
// ─────────────────────────────────────────────

const LESSONS_PER_LEVEL = 5;

function getLessonKey(langId, level, lessonNum) {
  return `${langId}-${level}-${lessonNum}`;
}

function LearnMode({ lang, onBack }) {
  const [level, setLevel] = useState(0);
  const [lessonNum, setLessonNum] = useState(1);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);
  const [progress, setProgress] = useState(() => getLangProgress(lang.id));

  const lessonKey = getLessonKey(lang.id, level, lessonNum);
  const isDone = progress.completedLessons.includes(lessonKey);

  const fetchLesson = useCallback(async () => {
    setLoading(true);
    setError("");
    setContent("");
    setCompleted(false);
    try {
      const result = await callAI(
        `Write lesson ${lessonNum} of ${LESSONS_PER_LEVEL} for ${LEVELS[level]} ${lang.label}.
Topic focus: pick the most important, logically ordered topic for this lesson number at this level.
Include:
1. A clear explanation of the concept
2. A concrete code example
3. One or two key things to remember
Format with markdown. Keep it focused — one concept per lesson, ~200-300 words.`,
        {
          system: `You are a concise, friendly coding tutor. You teach ${lang.label} step by step. 
Use clear language, real code examples with syntax appropriate for ${lang.label}, and avoid padding.
Never say "In this lesson we will learn..." — just start teaching.`,
          tool: "tutor-learn",
        }
      );
      setContent(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [lang, level, lessonNum]);

  useEffect(() => { fetchLesson(); }, [fetchLesson]);

  function markDone() {
    markLessonComplete(lang.id, lessonKey);
    setProgress(getLangProgress(lang.id));
    setCompleted(true);
  }

  function next() {
    if (lessonNum < LESSONS_PER_LEVEL) {
      setLessonNum((n) => n + 1);
    } else if (level < LEVELS.length - 1) {
      setLevel((l) => l + 1);
      setLessonNum(1);
    }
    setCompleted(false);
  }

  const totalDone = progress.completedLessons.filter((k) => k.startsWith(lang.id)).length;
  const totalLessons = LESSONS_PER_LEVEL * LEVELS.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {LEVELS.map((l, i) => (
              <button
                key={l}
                onClick={() => { setLevel(i); setLessonNum(1); setCompleted(false); }}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  level === i ? "bg-amber text-ink" : "bg-white/5 text-[#8B92A0] hover:text-white"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <span className="text-xs text-[#5A6068] font-mono">Lesson {lessonNum}/{LESSONS_PER_LEVEL}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#5A6068]">
          <Trophy size={12} className="text-amber" />
          <span>{totalDone}/{totalLessons} complete</span>
        </div>
      </div>

      <ProgressBar value={totalDone} max={totalLessons} />

      {/* Lesson navigation dots */}
      <div className="flex gap-1.5">
        {Array.from({ length: LESSONS_PER_LEVEL }, (_, i) => {
          const key = getLessonKey(lang.id, level, i + 1);
          const done = progress.completedLessons.includes(key);
          const current = lessonNum === i + 1;
          return (
            <button
              key={i}
              onClick={() => { setLessonNum(i + 1); setCompleted(false); }}
              className={`w-6 h-6 rounded-full text-xs font-mono flex items-center justify-center transition-colors ${
                done ? "bg-teal text-ink" : current ? "bg-amber text-ink" : "bg-white/10 text-[#5A6068] hover:bg-white/20"
              }`}
            >
              {done ? <Check size={10} /> : i + 1}
            </button>
          );
        })}
      </div>

      {/* Lesson content */}
      <div className="rounded-lg border border-white/10 bg-[#15171A] p-5 min-h-[16rem]">
        {loading && <LoadingDots />}
        {error && <p className="text-sm text-[#E7A893]">{error}</p>}
        {!loading && !error && content && <MarkdownLite content={content} />}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {!loading && !error && !isDone && !completed && (
          <button
            onClick={markDone}
            className="inline-flex items-center gap-2 rounded-md bg-teal/20 text-teal border border-teal/30 px-4 py-2 text-sm hover:bg-teal/30 transition-colors"
          >
            <Check size={14} /> Mark as done
          </button>
        )}
        {(isDone || completed) && (
          <span className="inline-flex items-center gap-1.5 text-sm text-teal">
            <Check size={14} /> Lesson complete
          </span>
        )}
        {!loading && (
          <>
            <button onClick={fetchLesson} className="inline-flex items-center gap-1.5 text-xs text-[#5A6068] hover:text-white">
              <RotateCcw size={13} /> Regenerate
            </button>
            {(lessonNum < LESSONS_PER_LEVEL || level < LEVELS.length - 1) && (
              <button
                onClick={next}
                className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-2 text-sm text-[#C7CBD3] hover:bg-white/5"
              >
                Next lesson <ChevronRight size={14} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Mode: PRACTICE — exercises + code submission
// ─────────────────────────────────────────────

function PracticeMode({ lang }) {
  const [difficulty, setDifficulty] = useState("Beginner");
  const [exercise, setExercise] = useState("");
  const [code, setCode] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState("");
  const [score, setScore] = useState(null);

  async function getExercise() {
    setLoading(true);
    setError("");
    setExercise("");
    setFeedback("");
    setCode("");
    setScore(null);
    try {
      const result = await callAI(
        `Give me a ${difficulty} ${lang.label} coding exercise.
State the task clearly. Specify the expected input/output or behavior.
Include any function signature they should implement if relevant.
Keep it concise — one focused problem, not multiple parts.`,
        {
          system: `You are a ${lang.label} coding tutor creating a focused, achievable exercise. 
Use markdown. Don't give away the solution. End with a clear "Your task:" line.`,
          tool: "tutor-exercise",
        }
      );
      setExercise(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitCode() {
    if (!code.trim()) return;
    setReviewing(true);
    setFeedback("");
    setScore(null);
    try {
      const result = await callAI(
        `Exercise:
${exercise}

Student's solution:
\`\`\`
${code}
\`\`\`

Review their solution. Point out:
1. Whether it solves the problem correctly
2. Any bugs or edge cases missed
3. Code quality / style improvements
4. One thing they did well
End your review with a line like: Score: 8/10`,
        {
          system: `You are a constructive ${lang.label} code reviewer. Be encouraging but honest. 
Use clear, plain language. Format feedback with markdown.`,
          tool: "tutor-review",
        }
      );
      setFeedback(result);
      const match = result.match(/Score:\s*(\d+)\/10/i);
      if (match) setScore(parseInt(match[1], 10));
    } catch (e) {
      setError(e.message);
    } finally {
      setReviewing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-mono uppercase tracking-wider text-[#8B92A0]">Difficulty</span>
        {LEVELS.map((d) => (
          <button
            key={d}
            onClick={() => setDifficulty(d)}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
              difficulty === d ? "bg-amber text-ink" : "bg-white/5 text-[#8B92A0] hover:text-white"
            }`}
          >
            {d}
          </button>
        ))}
        <button
          onClick={getExercise}
          disabled={loading}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-amber px-3 py-1.5 text-sm font-semibold text-ink hover:bg-[#f0b257] disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          New exercise
        </button>
      </div>

      {error && <p className="text-sm text-[#E7A893]">{error}</p>}

      {exercise && (
        <>
          <div className="rounded-lg border border-white/10 bg-[#15171A] p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <BookOpen size={13} className="text-amber" />
              <span className="text-xs font-mono text-amber uppercase tracking-wider">Exercise</span>
            </div>
            <MarkdownLite content={exercise} />
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-mono uppercase tracking-wider text-[#8B92A0]">Your solution</span>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={`Write your ${lang.label} solution here…`}
              rows={10}
              spellCheck={false}
              className="w-full resize-none rounded-lg border border-white/10 bg-[#0D0F11] px-3 py-2.5 text-sm font-mono text-[#EDEEF0] placeholder:text-[#5A6068] focus:outline-none focus:ring-1 focus:ring-amber/60"
            />
          </div>

          <button
            onClick={submitCode}
            disabled={!code.trim() || reviewing}
            className="inline-flex items-center gap-2 rounded-md bg-amber px-4 py-2 text-sm font-semibold text-ink hover:bg-[#f0b257] disabled:opacity-50 transition-colors"
          >
            {reviewing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Submit for review
          </button>
        </>
      )}

      {reviewing && (
        <div className="rounded-lg border border-white/10 bg-[#15171A] p-4">
          <LoadingDots />
        </div>
      )}

      {feedback && !reviewing && (
        <div className="rounded-lg border border-white/10 bg-[#15171A] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Star size={13} className="text-amber" />
              <span className="text-xs font-mono text-amber uppercase tracking-wider">Feedback</span>
            </div>
            {score !== null && (
              <div className={`text-sm font-mono font-bold ${score >= 7 ? "text-teal" : score >= 5 ? "text-amber" : "text-[#E7A893]"}`}>
                {score}/10
              </div>
            )}
          </div>
          <MarkdownLite content={feedback} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Mode: ASK — freeform Q&A chat
// ─────────────────────────────────────────────

function AskMode({ lang }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const q = input.trim();
    if (!q || loading) return;
    const newMessages = [...messages, { role: "user", content: q }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError("");

    try {
      // Build a history-aware prompt
      const history = newMessages
        .map((m) => `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`)
        .join("\n\n");

      const result = await callAI(
        `${history}\n\nTutor:`,
        {
          system: `You are a ${lang.label} coding tutor answering student questions. 
Be concise, accurate, and use code examples where helpful.
Format code in markdown fences. Keep explanations practical and focused.`,
          tool: "tutor-qa",
        }
      );
      setMessages((m) => [...m, { role: "assistant", content: result }]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const suggestions = [
    `What's the most important thing to understand about ${lang.label}?`,
    `Show me a real-world example in ${lang.label}`,
    `What are common mistakes beginners make in ${lang.label}?`,
    `Explain how ${lang.label} handles errors`,
  ];

  return (
    <div className="flex flex-col gap-4">
      {messages.length === 0 && (
        <div className="space-y-2">
          <p className="text-xs font-mono uppercase tracking-wider text-[#5A6068]">Suggested questions</p>
          <div className="grid grid-cols-1 gap-1.5">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => { setInput(s); }}
                className="text-left text-sm text-[#8B92A0] hover:text-[#C7CBD3] border border-white/5 hover:border-white/10 rounded-md px-3 py-2 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {messages.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-[#15171A] p-4 space-y-5 max-h-[28rem] overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && (
                <div className="w-6 h-6 rounded-full bg-amber/20 flex-shrink-0 flex items-center justify-center mt-0.5">
                  <span className="text-xs">{lang.emoji}</span>
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-white/8 text-[#EDEEF0] ml-auto"
                    : "bg-[#0D0F11] text-[#C7CBD3]"
                }`}
              >
                {m.role === "assistant" ? <MarkdownLite content={m.content} /> : m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-amber/20 flex-shrink-0 flex items-center justify-center">
                <span className="text-xs">{lang.emoji}</span>
              </div>
              <div className="bg-[#0D0F11] rounded-lg px-3 py-2.5"><LoadingDots /></div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {error && <p className="text-sm text-[#E7A893]">{error}</p>}

      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          rows={2}
          placeholder={`Ask anything about ${lang.label}… (Enter to send, Shift+Enter for new line)`}
          className="flex-1 resize-none rounded-lg border border-white/10 bg-[#15171A] px-3 py-2.5 text-sm font-sans text-[#EDEEF0] placeholder:text-[#5A6068] focus:outline-none focus:ring-1 focus:ring-amber/60"
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          className="self-end rounded-lg bg-amber p-2.5 text-ink hover:bg-[#f0b257] disabled:opacity-40 transition-colors"
        >
          <Send size={16} />
        </button>
      </div>

      {messages.length > 0 && (
        <button
          onClick={() => setMessages([])}
          className="text-xs text-[#5A6068] hover:text-white self-start"
        >
          Clear conversation
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Language picker screen
// ─────────────────────────────────────────────

function LanguagePicker({ onSelect }) {
  const [custom, setCustom] = useState("");
  const progress = loadProgress();

  return (
    <div className="space-y-5">
      <p className="text-sm text-[#8B92A0]">Pick a language or topic to start learning. Progress is saved automatically.</p>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {LANGUAGES.map((lang) => {
          const lp = progress[lang.id];
          const done = lp?.completedLessons?.length || 0;
          const total = LESSONS_PER_LEVEL * LEVELS.length;
          return (
            <button
              key={lang.id}
              onClick={() => onSelect(lang)}
              className="group relative flex flex-col items-center gap-1.5 rounded-lg border border-white/10 bg-[#15171A] p-3 hover:border-white/20 hover:bg-white/5 transition-all"
            >
              <span className="text-2xl">{lang.emoji}</span>
              <span className="text-xs font-mono text-[#C7CBD3] group-hover:text-white">{lang.label}</span>
              {done > 0 && (
                <>
                  <ProgressBar value={done} max={total} color="#4FB7B3" />
                  <span className="text-[10px] text-teal">{done}/{total}</span>
                </>
              )}
              {lp?.streak > 1 && (
                <span className="absolute -top-1.5 -right-1.5 inline-flex items-center gap-0.5 rounded-full bg-[#1C1E22] border border-white/10 px-1 py-0.5 text-[10px] text-amber">
                  <Flame size={9} />{lp.streak}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-mono uppercase tracking-wider text-[#5A6068]">Or type any topic</p>
        <div className="flex gap-2">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && custom.trim()) {
                onSelect({ id: custom.toLowerCase().replace(/\s+/g, "-"), label: custom.trim(), emoji: "📚", color: "#8B92A0" });
              }
            }}
            placeholder="e.g. GraphQL, Docker, Bash scripting…"
            className="flex-1 rounded-md border border-white/10 bg-[#15171A] px-3 py-2 text-sm font-mono text-[#EDEEF0] placeholder:text-[#5A6068] focus:outline-none focus:ring-1 focus:ring-amber/60"
          />
          <button
            onClick={() => {
              if (custom.trim()) onSelect({ id: custom.toLowerCase().replace(/\s+/g, "-"), label: custom.trim(), emoji: "📚", color: "#8B92A0" });
            }}
            disabled={!custom.trim()}
            className="rounded-md bg-amber px-3 py-2 text-sm font-semibold text-ink hover:bg-[#f0b257] disabled:opacity-40 transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main tutor component
// ─────────────────────────────────────────────

const MODES = [
  { id: "learn", label: "Learn", icon: BookOpen, desc: "Structured lessons" },
  { id: "practice", label: "Practice", icon: Code2, desc: "Coding exercises" },
  { id: "ask", label: "Ask", icon: MessageCircle, desc: "Q&A with tutor" },
];

export function CodingTutorTool() {
  const [lang, setLang] = useState(null);
  const [mode, setMode] = useState("learn");
  const progress = lang ? getLangProgress(lang.id) : null;

  if (!lang) {
    return <LanguagePicker onSelect={setLang} />;
  }

  return (
    <div className="space-y-4">
      {/* Language header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setLang(null)}
            className="text-[#5A6068] hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <span className="text-xl">{lang.emoji}</span>
          <div>
            <h3 className="text-base font-semibold text-white">{lang.label}</h3>
            {progress?.streak > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-amber">
                <Flame size={11} /> {progress.streak}-day streak
              </span>
            )}
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex rounded-md border border-white/10 bg-[#15171A] p-0.5">
          {MODES.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-mono transition-colors ${
                  mode === m.id ? "bg-amber text-ink" : "text-[#8B92A0] hover:text-white"
                }`}
              >
                <Icon size={12} />
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode content */}
      {mode === "learn" && <LearnMode lang={lang} />}
      {mode === "practice" && <PracticeMode lang={lang} />}
      {mode === "ask" && <AskMode lang={lang} />}
    </div>
  );
}
