import { useState, useMemo } from "react";
import {
  Code2, FileJson, Diff, Binary, Palette, Regex, Sparkles, Languages,
  FileText, Bug, MessageSquareText, Wand2, ChevronRight, Search, X,
  FileCode2, GitCommitHorizontal, Globe2, Wrench, Github, User, LogOut,
  Settings as SettingsIcon, GraduationCap, Workflow,
} from "lucide-react";

import { AuthProvider, useAuth } from "./AuthContext";
import SettingsScreen from "./SettingsScreen";
import AuthScreen from "./AuthScreen";
import { AiDot } from "./components/shared";
import { getSettings } from "./aiClient";

import {
  JsonFormatterTool, Base64Tool, DiffTool, ColorTool, RegexTool, MarkdownHtmlTool,
} from "./tools/utilityTools";
import {
  CodeExplainerTool, CodeConverterTool, BugFinderTool, PromptImproverTool,
  SummarizerTool, RewriterTool, CommitMessageTool, TranslateTool, CodeFormatterTool,
} from "./tools/aiTools";
import { GitHubTool } from "./tools/githubTool";
import { CodingTutorTool } from "./tools/tutorTool";
import { GraphVisualizerTool } from "./tools/graphTool";

const TOOLS = [
  {
    group: "Visualization",
    items: [
      { id: "graph", name: "Codebase graph", icon: Workflow, ai: false, desc: "Real-time dependency graph of the codebase.", component: GraphVisualizerTool },
    ],
  },
  {
    group: "Learn to code",
    items: [
      { id: "tutor", name: "Coding tutor", icon: GraduationCap, ai: true, desc: "Lessons, exercises, and Q&A for any language.", component: CodingTutorTool },
    ],
  },
  {
    group: "Working with code",
    items: [
      { id: "explain", name: "Explain code", icon: MessageSquareText, ai: true, desc: "Understand what code does, in plain English.", component: CodeExplainerTool },
      { id: "convert", name: "Convert code", icon: Languages, ai: true, desc: "Translate code between languages.", component: CodeConverterTool },
      { id: "review", name: "Find bugs", icon: Bug, ai: true, desc: "Get a review of risks and edge cases.", component: BugFinderTool },
      { id: "format", name: "Format code", icon: Wrench, ai: false, desc: "Clean up indentation and spacing.", component: CodeFormatterTool },
      { id: "diff", name: "Compare text", icon: Diff, ai: false, desc: "See line-by-line differences.", component: DiffTool },
      { id: "json", name: "Format JSON", icon: FileJson, ai: false, desc: "Validate and pretty-print JSON.", component: JsonFormatterTool },
      { id: "regex", name: "Test a pattern", icon: Regex, ai: false, desc: "Try a regex against sample text.", component: RegexTool },
    ],
  },
  {
    group: "Source control",
    items: [
      { id: "github", name: "Browse a repo", icon: Github, ai: false, desc: "View and edit files in a GitHub repo.", component: GitHubTool },
      { id: "commit", name: "Write a commit message", icon: GitCommitHorizontal, ai: true, desc: "Turn a diff into a clean commit message.", component: CommitMessageTool },
    ],
  },
  {
    group: "Working with words",
    items: [
      { id: "summarize", name: "Summarize", icon: FileText, ai: true, desc: "Condense long text into the key points.", component: SummarizerTool },
      { id: "rewrite", name: "Rewrite tone", icon: Wand2, ai: true, desc: "Adjust tone while keeping the meaning.", component: RewriterTool },
      { id: "translate", name: "Translate", icon: Globe2, ai: true, desc: "Translate text into another language.", component: TranslateTool },
      { id: "prompt", name: "Improve a prompt", icon: Sparkles, ai: true, desc: "Sharpen a prompt before sending it.", component: PromptImproverTool },
    ],
  },
  {
    group: "Everyday conversions",
    items: [
      { id: "markdown", name: "Markdown to HTML", icon: FileCode2, ai: false, desc: "Convert Markdown into HTML.", component: MarkdownHtmlTool },
      { id: "base64", name: "Encode / decode", icon: Binary, ai: false, desc: "Base64 text conversion.", component: Base64Tool },
      { id: "color", name: "Color palette", icon: Palette, ai: false, desc: "Build a palette from one color.", component: ColorTool },
    ],
  },
];

const ALL_TOOLS = TOOLS.flatMap((g) => g.items);

function AccountMenu({ onOpenSettings, onOpenAuth }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/5 text-sm"
      >
        <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white/10">
          <User size={12} className="text-[#8B92A0]" />
        </div>
        <span className="text-[#C7CBD3] truncate max-w-[8rem]">{user ? user.email : "Guest"}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-48 rounded-md border border-white/10 bg-panel shadow-xl py-1 z-50">
          <button
            onClick={() => { setOpen(false); onOpenSettings(); }}
            className="w-full text-left px-3 py-2 text-sm text-[#C7CBD3] hover:bg-white/5 flex items-center gap-2"
          >
            <SettingsIcon size={14} /> AI provider settings
          </button>
          {user && (
            <button
              onClick={() => { setOpen(false); logout(); }}
              className="w-full text-left px-3 py-2 text-sm text-[#C7CBD3] hover:bg-white/5 flex items-center gap-2"
            >
              <LogOut size={14} /> Sign out
            </button>
          )}
          {!user && (
            <button
              onClick={() => { setOpen(false); onOpenAuth(); }}
              className="w-full text-left px-3 py-2 text-sm text-[#C7CBD3] hover:bg-white/5 flex items-center gap-2"
            >
              <User size={14} /> Sign in
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Dashboard() {
  const { user, loading } = useAuth();
  const [activeId, setActiveId] = useState(null);
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const needsAiSetup = !user && !getSettings();

  const active = ALL_TOOLS.find((t) => t.id === activeId);

  const filteredGroups = useMemo(() => {
    if (!query.trim()) return TOOLS;
    const q = query.toLowerCase();
    return TOOLS.map((g) => ({
      ...g,
      items: g.items.filter((t) => t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q)),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  function selectTool(id) {
    const tool = ALL_TOOLS.find((t) => t.id === id);
    if (tool?.ai && needsAiSetup) {
      setShowSettings(true);
      return;
    }
    setActiveId(id);
    setSidebarOpen(false);
  }

  if (loading) return null;

  return (
    <div className="h-screen w-full flex bg-ink text-[#EDEEF0] font-sans overflow-hidden relative">
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-ink/95 overflow-y-auto">
          <SettingsScreen
            initial={getSettings()}
            onSaved={() => setShowSettings(false)}
            onCancel={() => setShowSettings(false)}
          />
        </div>
      )}
      {showAuth && (
        <div className="fixed inset-0 z-50 bg-ink overflow-y-auto">
          <AuthScreen onDone={() => setShowAuth(false)} onSkip={() => setShowAuth(false)} />
        </div>
      )}

      <div className="md:hidden absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 bg-panel border-b border-white/10">
        <button onClick={() => setSidebarOpen(true)} className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-amber">
            <Code2 size={14} className="text-ink" strokeWidth={2.5} />
          </div>
          <span className="font-mono text-sm font-semibold">Workbench</span>
        </button>
        <AccountMenu onOpenSettings={() => setShowSettings(true)} onOpenAuth={() => setShowAuth(true)} />
      </div>

      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-black/60 z-30" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`pegboard w-72 flex-shrink-0 border-r border-white/10 bg-panel flex flex-col
          fixed md:static inset-y-0 left-0 z-40 transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="px-5 pt-6 pb-4 border-b border-white/10 bg-panel/95">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-amber">
                <Code2 size={16} className="text-ink" strokeWidth={2.5} />
              </div>
              <h1 className="font-mono text-base font-semibold tracking-tight">Workbench</h1>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden text-[#8B92A0] hover:text-white">
              <X size={18} />
            </button>
          </div>
          <p className="mt-2 text-xs text-[#8B92A0] leading-relaxed">
            A toolbox for code and AI tasks.
          </p>
          <div className="mt-3 hidden md:block">
            <AccountMenu onOpenSettings={() => setShowSettings(true)} onOpenAuth={() => setShowAuth(true)} />
          </div>
        </div>

        <div className="px-4 pt-4 bg-panel/95">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5A6068]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a tool…"
              className="w-full rounded-md border border-white/10 bg-well pl-8 pr-7 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber/50"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5A6068] hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {filteredGroups.length === 0 && <p className="px-2 text-sm text-[#5A6068]">No tools match "{query}".</p>}
          {filteredGroups.map((g) => (
            <div key={g.group}>
              <h2 className="px-2 mb-1.5 text-[11px] font-mono uppercase tracking-wider text-[#5A6068]">{g.group}</h2>
              <div className="space-y-0.5">
                {g.items.map((t) => {
                  const Icon = t.icon;
                  const isActive = activeId === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => selectTool(t.id)}
                      className={`group w-full flex items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-all duration-150 border-l-2 ${
                        isActive ? "peg-active bg-white/[0.07] border-l-amber" : "border-l-transparent hover:bg-white/[0.04] hover:border-l-white/15"
                      }`}
                    >
                      <Icon size={16} className={`mt-0.5 flex-shrink-0 transition-colors ${isActive ? "text-amber" : "text-[#8B92A0] group-hover:text-[#C7CBD3]"}`} />
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-1.5">
                          <span className={`text-sm font-medium truncate ${isActive ? "text-white" : "text-[#C7CBD3]"}`}>{t.name}</span>
                          {t.ai && <AiDot />}
                        </span>
                        <span className="block text-xs text-[#5A6068] truncate">{t.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-white/10 bg-panel/95 space-y-2">
          <div className="flex items-center gap-2 text-[11px] text-[#5A6068]">
            <AiDot size={6} />
            <span>marks tools powered by AI</span>
          </div>
          <a
            href="https://github.com/sponsors/Raghuramcoding"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11px] text-[#5A6068] hover:text-amber transition-colors"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path d="M8 0a8 8 0 110 16A8 8 0 018 0zM4.5 5.5a1 1 0 102 0 1 1 0 00-2 0zm5 0a1 1 0 102 0 1 1 0 00-2 0zm1.535 4.207a.75.75 0 10-1.07-1.05A3.233 3.233 0 018 9.25c-.72 0-1.383-.2-1.965-.593a.75.75 0 10-1.07 1.05A4.734 4.734 0 008 10.75c1.034 0 1.993-.33 2.785-.893z"/></svg>
            Sponsor
          </a>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto pt-12 md:pt-0">
        {!active ? (
          <div className="h-full flex items-center justify-center p-8">
            <div className="text-center max-w-sm">
              <div className="pegboard mx-auto mb-4 w-16 h-16 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center">
                <Code2 size={22} className="text-[#3A3E44]" />
              </div>
              <h2 className="text-lg font-semibold text-[#C7CBD3] mb-1.5">Pick a tool to get started</h2>
              <p className="text-sm text-[#5A6068]">Everything you need for code and AI tasks lives in one place.</p>
            </div>
          </div>
        ) : (
          <div key={active.id} className="tool-enter max-w-3xl mx-auto px-5 md:px-8 py-6 md:py-8">
            <div className="flex items-center gap-2.5 mb-1">
              <active.icon size={20} className="text-amber" />
              <h2 className="text-xl font-semibold">{active.name}</h2>
              {active.ai && (
                <span className="inline-flex items-center gap-1 rounded-full bg-teal/15 px-2 py-0.5 text-[11px] font-mono text-teal">
                  <AiDot size={5} /> AI
                </span>
              )}
            </div>
            <p className="text-sm text-[#8B92A0] mb-6">{active.desc}</p>
            <active.component />
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
}
