import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Play, Pause, RotateCcw, Cpu, Layers, Workflow,
} from "lucide-react";

const C = {
  ink: '#1C1E22',
  well: '#15171A',
  amber: '#E8A33D',
  teal: '#4FB7B3',
  purple: '#7C6FD6',
  text: '#EDEEF0',
  muted: '#8B92A0',
  dim: '#5A6068',
  border: 'rgba(255,255,255,0.08)',
};

const GROUP_COLORS = [
  { fill: '#E8A33D20', stroke: '#E8A33D', glow: 'rgba(232,163,61,0.08)', label: 'Root', icon: 'root' },
  { fill: '#4FB7B320', stroke: '#4FB7B3', glow: 'rgba(79,183,179,0.08)', label: 'Frontend', icon: 'frontend' },
  { fill: '#7C6FD620', stroke: '#7C6FD6', glow: 'rgba(124,111,214,0.08)', label: 'Backend', icon: 'backend' },
];

const EDGE_STYLES = {
  contains: { color: 'rgba(255,255,255,0.06)', width: 1, dash: [] },
  imports: { color: 'rgba(79,183,179,0.25)', width: 1.5, dash: [] },
  http: { color: 'rgba(232,163,61,0.25)', width: 1.5, dash: [4, 4] },
};

const NODES = [
  { id: 'root', label: 'swiss-army-app', type: 'root', group: 0, phase: 0, index: 0, size: 6, desc: 'Monorepo root — contains frontend and backend packages.' },
  { id: 'app', label: 'workbench-app', type: 'dir', group: 1, parent: 'root', phase: 0, index: 1, size: 4, desc: 'React + Vite frontend. Tailwind CSS, Lucide icons, Stripe checkout.' },
  { id: 'backend', label: 'workbench-backend', type: 'dir', group: 2, parent: 'root', phase: 0, index: 2, size: 4, desc: 'Express.js backend. PostgreSQL, JWT auth, Stripe integration.' },
  { id: 'components', label: 'components/', type: 'dir', group: 1, parent: 'app', phase: 0, index: 3, size: 3, desc: 'Shared UI components (TextArea, Buttons, CopyButton, etc.).' },
  { id: 'tools', label: 'tools/', type: 'dir', group: 1, parent: 'app', phase: 0, index: 4, size: 3, desc: 'Tool modules — each tool is a self-contained JSX component.' },
  { id: 'db', label: 'db/', type: 'dir', group: 2, parent: 'backend', phase: 1, index: 0, size: 3, desc: 'Database layer — connection pool and migration runner.' },
  { id: 'middleware', label: 'middleware/', type: 'dir', group: 2, parent: 'backend', phase: 1, index: 1, size: 3, desc: 'Express middleware — JWT verification.' },
  { id: 'routes', label: 'routes/', type: 'dir', group: 2, parent: 'backend', phase: 1, index: 2, size: 3, desc: 'API route handlers — auth, AI proxy, billing, webhooks.' },
  { id: 'services', label: 'services/', type: 'dir', group: 2, parent: 'backend', phase: 1, index: 3, size: 3, desc: 'Business logic — token management, Stripe payments.' },
  { id: 'App', label: 'App.jsx', type: 'file', group: 1, parent: 'app', phase: 2, index: 0, size: 2.5, desc: 'Root component — sidebar, tool routing, auth-aware layout.' },
  { id: 'AuthContext', label: 'AuthContext.jsx', type: 'file', group: 1, parent: 'app', phase: 2, index: 1, size: 2, desc: 'React context for auth state, user session, and token refresh.' },
  { id: 'AuthScreen', label: 'AuthScreen.jsx', type: 'file', group: 1, parent: 'app', phase: 2, index: 2, size: 2, desc: 'Sign-in / sign-up screen with email/password form.' },
  { id: 'SettingsScreen', label: 'SettingsScreen.jsx', type: 'file', group: 1, parent: 'app', phase: 2, index: 3, size: 2, desc: 'AI provider settings — API key, model, endpoint config.' },
  { id: 'UpgradeScreen', label: 'UpgradeScreen.jsx', type: 'file', group: 1, parent: 'app', phase: 2, index: 4, size: 2, desc: 'Pro upgrade flow with Stripe checkout.' },
  { id: 'main', label: 'main.jsx', type: 'file', group: 1, parent: 'app', phase: 2, index: 5, size: 1.8, desc: 'Vite entry point — mounts React app to DOM.' },
  { id: 'indexCss', label: 'index.css', type: 'file', group: 1, parent: 'app', phase: 2, index: 6, size: 1.5, desc: 'Global styles — Tailwind, animations, scrollbar, pegboard pattern.' },
  { id: 'aiClient', label: 'aiClient.js', type: 'file', group: 1, parent: 'app', phase: 2, index: 7, size: 2.2, desc: 'AI client — calls OpenAI-compatible APIs with configurable provider.' },
  { id: 'backendClient', label: 'backendClient.js', type: 'file', group: 1, parent: 'app', phase: 2, index: 8, size: 2, desc: 'Backend API client — fetch wrapper for workbench-backend.' },
  { id: 'shared', label: 'shared.jsx', type: 'file', group: 1, parent: 'components', phase: 2, index: 9, size: 2.5, desc: 'Reusable UI primitives — TextArea, OutputBlock, CopyButton, RunButton, AiToolShell.' },
  { id: 'utilityTools', label: 'utilityTools.jsx', type: 'file', group: 1, parent: 'tools', phase: 2, index: 10, size: 2.2, desc: 'Offline tools — JSON formatter, Base64, diff, regex tester, color palette, markdown->HTML.' },
  { id: 'aiTools', label: 'aiTools.jsx', type: 'file', group: 1, parent: 'tools', phase: 2, index: 11, size: 2.5, desc: 'AI-powered tools — code explainer, converter, bug finder, prompt improver, summarizer, rewriter, translator, commit message generator, code formatter.' },
  { id: 'githubTool', label: 'githubTool.jsx', type: 'file', group: 1, parent: 'tools', phase: 2, index: 12, size: 2.2, desc: 'GitHub integration — browse repos, view/edit files, commit changes.' },
  { id: 'tutorTool', label: 'tutorTool.jsx', type: 'file', group: 1, parent: 'tools', phase: 3, index: 0, size: 2.5, desc: 'Coding tutor — structured lessons, practice exercises, Q&A chat. Tracks progress in localStorage.' },
  { id: 'server', label: 'server.js', type: 'file', group: 2, parent: 'backend', phase: 3, index: 1, size: 2.5, desc: 'Express server entry — mounts routes, CORS, JSON parsing, starts listener.' },
  { id: 'pool', label: 'pool.js', type: 'file', group: 2, parent: 'db', phase: 3, index: 2, size: 2, desc: 'PostgreSQL connection pool via pg module.' },
  { id: 'migrate', label: 'migrate.js', type: 'file', group: 2, parent: 'db', phase: 3, index: 3, size: 2, desc: 'Database migration runner — applies SQL files in order.' },
  { id: 'authMiddleware', label: 'auth.js', type: 'file', group: 2, parent: 'middleware', phase: 3, index: 4, size: 2, desc: 'JWT auth middleware — verifies Bearer tokens on protected routes.' },
  { id: 'aiRoute', label: 'ai.js', type: 'file', group: 2, parent: 'routes', phase: 3, index: 5, size: 2.2, desc: 'AI proxy route — forwards requests to OpenAI, manages rate limits.' },
  { id: 'authRoute', label: 'auth.js', type: 'file', group: 2, parent: 'routes', phase: 3, index: 6, size: 2, desc: 'Auth routes — signup, login, token refresh, logout.' },
  { id: 'billingRoute', label: 'billing.js', type: 'file', group: 2, parent: 'routes', phase: 3, index: 7, size: 2, desc: 'Billing routes — create Stripe checkout sessions, manage subscriptions.' },
  { id: 'webhooksRoute', label: 'webhooks.js', type: 'file', group: 2, parent: 'routes', phase: 3, index: 8, size: 2, desc: 'Stripe webhooks handler — processes checkout.completed, invoice.paid events.' },
  { id: 'authService', label: 'auth.js', type: 'file', group: 2, parent: 'services', phase: 3, index: 9, size: 2.2, desc: 'Auth service — JWT generation, password hashing via bcrypt.' },
  { id: 'stripeService', label: 'stripe.js', type: 'file', group: 2, parent: 'services', phase: 3, index: 10, size: 2.2, desc: 'Stripe service — creates checkout sessions, manages customer portal.' },
];

const CONTAINMENT_EDGES = NODES.filter(n => n.parent).map(n => ({
  source: n.parent, target: n.id, type: 'contains'
}));

const IMPORT_EDGES = [
  ['App', 'AuthContext'], ['App', 'SettingsScreen'], ['App', 'AuthScreen'],
  ['App', 'UpgradeScreen'], ['App', 'shared'], ['App', 'utilityTools'],
  ['App', 'aiTools'], ['App', 'githubTool'], ['App', 'tutorTool'],
  ['App', 'aiClient'],
  ['aiTools', 'shared'], ['aiTools', 'aiClient'],
  ['githubTool', 'shared'],
  ['utilityTools', 'shared'],
  ['tutorTool', 'shared'], ['tutorTool', 'aiClient'], ['tutorTool', 'backendClient'],
  ['SettingsScreen', 'aiClient'],
  ['UpgradeScreen', 'backendClient'],
  ['server', 'pool'], ['server', 'aiRoute'], ['server', 'authRoute'],
  ['server', 'billingRoute'], ['server', 'webhooksRoute'], ['server', 'authMiddleware'],
  ['aiRoute', 'authMiddleware'], ['aiRoute', 'pool'],
  ['authRoute', 'authService'],
  ['billingRoute', 'stripeService'], ['billingRoute', 'authMiddleware'],
  ['webhooksRoute', 'stripeService'],
  ['authMiddleware', 'authService'],
  ['pool', 'migrate'],
];

const HTTP_EDGES = [
  ['backendClient', 'server', 'REST API'],
  ['aiClient', 'aiRoute', 'AI Proxy'],
  ['UpgradeScreen', 'billingRoute', 'Billing'],
];

const EDGES = [
  ...CONTAINMENT_EDGES.map(e => ({ ...e, phase: 0 })),
  ...IMPORT_EDGES.map(([s, t]) => ({ source: s, target: t, type: 'imports', phase: 2 })),
  ...HTTP_EDGES.map(([s, t, l]) => ({ source: s, target: t, type: 'http', label: l, phase: 3 })),
];

const THOUGHTS = [
  { msg: "Initializing codebase indexer...", phase: 0 },
  { msg: "Scanning repository structure...", phase: 0 },
  { msg: "Discovered root: swiss-army-app", phase: 0 },
  { msg: "Found workbench-app/ — React + Vite frontend", phase: 0 },
  { msg: "Found workbench-backend/ — Express.js backend", phase: 0 },
  { msg: "Scanning source directories...", phase: 0 },
  { msg: "Found components/, tools/ directories", phase: 0 },
  { msg: "Found db/, middleware/, routes/, services/ directories", phase: 0 },
  { msg: "Parsing source files...", phase: 2 },
  { msg: "App.jsx — 300+ lines, main entry point with sidebar layout", phase: 2 },
  { msg: "AuthContext.jsx — React context for JWT auth flow", phase: 2 },
  { msg: "shared.jsx — 7 reusable UI components (TextArea, OutputBlock, etc.)", phase: 2 },
  { msg: "aiTools.jsx — 9 AI-powered tools via AiToolShell pattern", phase: 2 },
  { msg: "utilityTools.jsx — 6 offline tools (JSON, Base64, diff, regex, etc.)", phase: 2 },
  { msg: "githubTool.jsx — GitHub API integration with file browser & editor", phase: 2 },
  { msg: "aiClient.js — provider-agnostic AI client (OpenAI-compatible)", phase: 2 },
  { msg: "Resolving import dependencies...", phase: 2 },
  { msg: "App.jsx imports 10 modules — hub node with highest centrality", phase: 2 },
  { msg: "shared.jsx is the most depended-on module (used by all tools)", phase: 2 },
  { msg: "aiTools.jsx and githubTool.jsx both depend on shared.jsx", phase: 2 },
  { msg: "tutorTool.jsx — coding tutor with 3 modes (Learn, Practice, Ask)", phase: 3 },
  { msg: "tutorTool.jsx — uses localStorage for progress tracking", phase: 3 },
  { msg: "server.js — Express entry, mounts 4 route groups + middleware", phase: 3 },
  { msg: "pool.js + migrate.js — PostgreSQL connection & schema migration", phase: 3 },
  { msg: "authMiddleware.js — JWT Bearer token verification", phase: 3 },
  { msg: "billingRoute.js + stripeService.js — Stripe checkout & webhooks", phase: 3 },
  { msg: "Cross-service connections detected:", phase: 3 },
  { msg: "  backendClient.js → server.js (REST API)", phase: 3 },
  { msg: "  aiClient.js → ai route (AI Proxy)", phase: 3 },
  { msg: "  UpgradeScreen → billing route (Stripe Checkout)", phase: 3 },
  { msg: "Building knowledge graph...", phase: 4 },
  { msg: "Linking containment hierarchy...", phase: 4 },
  { msg: "Mapping all import relationships...", phase: 4 },
  { msg: "Analyzing data flow: UI → API → Database", phase: 4 },
  { msg: "No circular dependencies detected", phase: 4 },
  { msg: "Optimizing force-directed layout...", phase: 4 },
  { msg: "Stabilizing simulation...", phase: 4 },
  { msg: `✓ Indexing complete — ${NODES.length} nodes, ${EDGES.length} edges`, phase: 5 },
  { msg: "Click any node to inspect it", phase: 5 },
];

function simulateForce(nodes, edges, width, height, time) {
  const centerX = width / 2;
  const centerY = height / 2;
  const activeNodes = Array.from(nodes.values()).filter(n => n.revealed);
  const nodeArr = [...nodes.values()];

  for (const n of nodeArr) {
    if (!n.revealed) continue;
    n.fx = n.fx || 0;
    n.fy = n.fy || 0;
    n.fx = 0;
    n.fy = 0;
  }

  for (let i = 0; i < nodeArr.length; i++) {
    const a = nodeArr[i];
    if (!a.revealed) continue;
    for (let j = i + 1; j < nodeArr.length; j++) {
      const b = nodeArr[j];
      if (!b.revealed) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const force = 6000 / (dist * dist);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.fx -= fx;
      a.fy -= fy;
      b.fx += fx;
      b.fy += fy;
    }
  }

  for (const edge of edges) {
    if (!edge.revealed) continue;
    const a = nodes.get(edge.source);
    const b = nodes.get(edge.target);
    if (!a || !b || !a.revealed || !b.revealed) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const targetDist = (a.size + b.size) * 14 + 60;
    const force = (dist - targetDist) * 0.004;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    a.fx += fx;
    a.fy += fy;
    b.fx -= fx;
    b.fy -= fy;
  }

  for (const n of nodeArr) {
    if (!n.revealed) continue;
    const dx = centerX - n.x;
    const dy = centerY - n.y;
    n.fx += dx * 0.005 * (n.group === 0 ? 0.3 : 1);
    n.fy += dy * 0.005 * (n.group === 0 ? 0.3 : 1);

    n.vx = (n.vx || 0) + n.fx;
    n.vy = (n.vy || 0) + n.fy;

    const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
    if (speed > 6) {
      n.vx = (n.vx / speed) * 6;
      n.vy = (n.vy / speed) * 6;
    }

    n.vx *= 0.82;
    n.vy *= 0.82;

    n.x += n.vx;
    n.y += n.vy;

    const margin = 30;
    if (n.x < margin) n.x = margin;
    if (n.x > width - margin) n.x = width - margin;
    if (n.y < margin) n.y = margin;
    if (n.y > height - margin) n.y = height - margin;
  }
}

function drawBackground(ctx, w, h, time) {
  ctx.fillStyle = C.well;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let x = 0; x < w; x += 20) {
    for (let y = 0; y < h; y += 20) {
      ctx.beginPath();
      ctx.arc(x, y, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawEdges(ctx, nodes, edges, hoveredId, selectedId, time) {
  for (const edge of edges) {
    if (!edge.revealed) continue;
    const a = nodes.get(edge.source);
    const b = nodes.get(edge.target);
    if (!a || !b || !a.revealed || !b.revealed) continue;
    if (a.opacity < 0.01 || b.opacity < 0.01) continue;

    const style = EDGE_STYLES[edge.type] || EDGE_STYLES.contains;
    const isHighlighted = (hoveredId === edge.source || hoveredId === edge.target);
    const isSelected = (selectedId === edge.source || selectedId === edge.target) && selectedId;
    const alpha = isSelected ? 0.7 : isHighlighted ? 0.5 : 0.4;
    const width = isSelected ? style.width * 2.5 : isHighlighted ? style.width * 1.5 : style.width;

    ctx.save();
    ctx.globalAlpha = alpha * b.opacity;
    ctx.strokeStyle = edge.type === 'contains' ? 'rgba(255,255,255,0.08)' : style.color;
    ctx.lineWidth = width;

    if (style.dash.length > 0) {
      ctx.setLineDash(style.dash);
    }

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();

    if (edge.label && (isHighlighted || isSelected)) {
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      ctx.fillStyle = `rgba(237,238,240,${0.6 * b.opacity})`;
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(edge.label, mx, my - 4);
    }

    ctx.restore();
  }
}

function drawNodes(ctx, nodes, hoveredId, selectedId, time) {
  const nodeArr = Array.from(nodes.values()).filter(n => n.revealed);

  for (const n of nodeArr) {
    if (n.opacity < 0.01) continue;
    const radius = n.size * 5;
    const gc = GROUP_COLORS[n.group] || GROUP_COLORS[0];
    const isHovered = hoveredId === n.id;
    const isSelected = selectedId === n.id;

    const alpha = isSelected ? 1 : isHovered ? 0.9 : 0.7;
    const scale = isSelected ? 1.25 : isHovered ? 1.1 : 1;
    const r = radius * scale;

    if (isSelected || isHovered) {
      const gradient = ctx.createRadialGradient(n.x, n.y, r * 0.5, n.x, n.y, r * 3);
      gradient.addColorStop(0, gc.stroke + '30');
      gradient.addColorStop(1, gc.stroke + '00');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.globalAlpha = n.opacity * alpha;

    if (n.type === 'root') {
      ctx.shadowColor = gc.stroke;
      ctx.shadowBlur = 20;
    }

    ctx.fillStyle = G[n.group] || gc.stroke;
    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = gc.stroke;
    ctx.lineWidth = isSelected ? 2 : 0.5;
    ctx.globalAlpha = n.opacity * (isSelected ? 1 : 0.3);
    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    ctx.save();
    ctx.globalAlpha = n.opacity * (isSelected ? 1 : 0.8);
    ctx.fillStyle = C.text;
    ctx.font = `${isSelected ? 'bold ' : ''}10px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const labelY = n.y + r + 5;
    ctx.fillText(n.label, n.x, labelY);

    if (isSelected && n.desc) {
      ctx.fillStyle = C.muted;
      ctx.font = '9px system-ui, sans-serif';
      ctx.fillText(n.desc.substring(0, 50) + (n.desc.length > 50 ? '…' : ''), n.x, labelY + 14);
    }

    ctx.restore();
  }
}

const G = {
  0: 'rgba(232,163,61,0.25)',
  1: 'rgba(79,183,179,0.2)',
  2: 'rgba(124,111,214,0.2)',
};

export function GraphVisualizerTool() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(50);
  const [phase, setPhase] = useState(0);
  const [thoughts, setThoughts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [stats, setStats] = useState({ nodes: 0, edges: 0 });
  const [pulse, setPulse] = useState(0);

  const simRef = useRef({
    nodes: new Map(),
    edges: [],
    spawnIdx: 0,
    thoughtIdx: 0,
    lastSpawn: 0,
    phase: 0,
    mouseX: 0,
    mouseY: 0,
  });

  const reset = useCallback(() => {
    const sim = simRef.current;
    sim.nodes = new Map();
    sim.edges = [];
    sim.spawnIdx = 0;
    sim.thoughtIdx = 0;
    sim.phase = 0;

    setPhase(0);
    setThoughts([]);
    setSelectedId(null);
    setStats({ nodes: 0, edges: 0 });
    setRunning(true);
  }, []);

  const spawnInterval = useMemo(() => {
    return Math.max(30, 300 - speed * 2.7);
  }, [speed]);

  useEffect(() => {
    if (!running) return;
    const sim = simRef.current;
    const interval = setInterval(() => {
      if (sim.phase >= 5) {
        clearInterval(interval);
        return;
      }

      const addThought = (msg) => {
        setThoughts(prev => [...prev, { id: Date.now() + Math.random(), msg, time: new Date().toLocaleTimeString() }]);
      };

      const nextThought = () => {
        while (sim.thoughtIdx < THOUGHTS.length && THOUGHTS[sim.thoughtIdx].phase <= sim.phase) {
          addThought(THOUGHTS[sim.thoughtIdx].msg);
          sim.thoughtIdx++;
        }
      };

      const spawnNextNode = () => {
        while (sim.spawnIdx < NODES.length) {
          const def = NODES[sim.spawnIdx];
          if (def.phase > sim.phase) break;
          const node = {
            ...def,
            x: (containerRef.current?.clientWidth || 600) / 2 + (Math.random() - 0.5) * 200,
            y: (containerRef.current?.clientHeight || 400) / 2 + (Math.random() - 0.5) * 200,
            vx: 0, vy: 0, fx: 0, fy: 0,
            revealed: true,
            opacity: 0.01,
          };
          sim.nodes.set(def.id, node);
          sim.spawnIdx++;
          nextThought();
          return true;
        }

        const phaseEdges = EDGES.filter(e => e.phase <= sim.phase);
        for (const def of phaseEdges) {
          if (sim.edges.find(e => e.source === def.source && e.target === def.target)) continue;
          if (sim.nodes.has(def.source) && sim.nodes.has(def.target)) {
            sim.edges.push({ ...def, revealed: true, opacity: 0.01 });
            return true;
          }
        }

        return false;
      };

      let spawned = false;
      for (let i = 0; i < 3; i++) {
        if (spawnNextNode()) spawned = true;
      }

      if (!spawned && sim.phase < 5) {
        const nextPhaseNodes = NODES.filter(n => n.phase > sim.phase);
        if (nextPhaseNodes.length === 0) {
          sim.phase = 5;
          setPhase(5);
        } else {
          sim.phase++;
          setPhase(prev => prev + 1);
          nextThought();
        }
      }

      setStats({
        nodes: sim.nodes.size,
        edges: sim.edges.length,
      });
    }, 80);

    return () => clearInterval(interval);
  }, [running, spawnInterval]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    const sim = simRef.current;
    let frameId;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.scale(dpr, dpr);
      canvas.__w = rect.width;
      canvas.__h = rect.height;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const pulseInterval = setInterval(() => {
      setPulse(t => (t + 1) % 100);
    }, 100);

    const render = (time) => {
      const w = canvas.__w || 600;
      const h = canvas.__h || 400;

      for (const n of sim.nodes.values()) {
        if (n.revealed && n.opacity < 1) {
          n.opacity = Math.min(1, n.opacity + 0.04);
        }
      }
      for (const e of sim.edges) {
        if (e.revealed && e.opacity < 1) {
          e.opacity = Math.min(1, e.opacity + 0.02);
        }
      }

      simulateForce(sim.nodes, sim.edges, sim.edges.filter(e => e.revealed).length > 5 ? w : w, h, time);

      drawBackground(ctx, w, h, time);

      ctx.save();
      ctx.translate(0, 0);
      drawEdges(ctx, sim.nodes, sim.edges, hoveredId, selectedId, time);
      drawNodes(ctx, sim.nodes, hoveredId, selectedId, time);

      if (phase < 5 && sim.nodes.size > 0) {
        const pulseR = (Math.sin(time / 800) + 1) / 2;
        const pulseNode = Array.from(sim.nodes.values()).filter(n => n.revealed).slice(-1)[0];
        if (pulseNode) {
          ctx.save();
          ctx.globalAlpha = 0.15 * (1 - pulseR);
          ctx.strokeStyle = '#E8A33D';
          ctx.lineWidth = 1;
          const pr = pulseNode.size * 5 + 10 + pulseR * 20;
          ctx.beginPath();
          ctx.arc(pulseNode.x, pulseNode.y, pr, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      if (phase >= 5) {
        ctx.save();
        ctx.fillStyle = 'rgba(79,183,179,0.15)';
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`✓ ${NODES.length} nodes · ${EDGES.length} edges`, w / 2, h - 16);
        ctx.restore();
      }

      ctx.restore();
      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frameId);
      clearInterval(pulseInterval);
      ro.disconnect();
    };
  }, [hoveredId, selectedId, phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const sim = simRef.current;

      let found = null;
      for (const n of sim.nodes.values()) {
        if (!n.revealed) continue;
        const r = n.size * 5 * 1.25;
        const dx = mx - n.x;
        const dy = my - n.y;
        if (dx * dx + dy * dy < r * r) {
          found = n.id;
          break;
        }
      }
      setHoveredId(found);
      if (found) canvas.style.cursor = 'pointer';
      else canvas.style.cursor = 'default';
    };

    const onClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const sim = simRef.current;

      let found = null;
      for (const n of sim.nodes.values()) {
        if (!n.revealed) continue;
        const r = n.size * 5 * 1.25;
        const dx = mx - n.x;
        const dy = my - n.y;
        if (dx * dx + dy * dy < r * r) {
          found = n.id;
          break;
        }
      }
      setSelectedId(prev => prev === found ? null : found);
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onClick);
    return () => {
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('click', onClick);
    };
  }, []);

  const selectedNode = selectedId ? NODES.find(n => n.id === selectedId) : null;
  const selectedEdges = selectedId
    ? EDGES.filter(e => e.source === selectedId || e.target === selectedId)
    : [];

  const connectedNodes = useMemo(() => {
    if (!selectedId) return new Set();
    const set = new Set();
    for (const e of EDGES) {
      if (e.source === selectedId) set.add(e.target);
      if (e.target === selectedId) set.add(e.source);
    }
    return set;
  }, [selectedId]);

  const phaseNames = ['Scanning', 'Scanning', 'Parsing', 'Analyzing', 'Building', 'Complete'];
  const phaseColors = [C.dim, C.dim, C.teal, C.amber, C.purple, C.teal];

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setRunning(r => !r)}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-sm text-[#C7CBD3] hover:bg-white/5 transition-colors"
          title={running ? 'Pause simulation' : 'Resume simulation'}
        >
          {running ? <Pause size={14} /> : <Play size={14} />}
          {running ? 'Pause' : 'Resume'}
        </button>
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-sm text-[#C7CBD3] hover:bg-white/5 transition-colors"
          title="Reset indexer"
        >
          <RotateCcw size={14} /> Reset
        </button>

        <div className="flex items-center gap-2 ml-2">
          <Cpu size={13} className="text-[#5A6068]" />
          <span className="text-xs font-mono text-[#5A6068] min-w-[5rem]">
            {phaseNames[phase]}
          </span>
          <input
            type="range"
            min={1}
            max={100}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-20 h-1 accent-amber cursor-pointer"
            title="Indexing speed"
          />
          <span className="text-xs font-mono text-[#5A6068] w-8 text-right">{speed}%</span>
        </div>
      </div>

      {/* Main area: graph + sidebar */}
      <div className="flex gap-4" style={{ minHeight: '480px' }}>
        {/* Canvas */}
        <div
          ref={containerRef}
          className="flex-1 rounded-lg border border-white/10 overflow-hidden relative bg-well"
        >
          <canvas ref={canvasRef} className="block" />

          {/* Legend overlay */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
            {GROUP_COLORS.map((gc, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] font-mono text-[#5A6068]">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: gc.stroke }} />
                {gc.label}
              </div>
            ))}
            <div className="flex items-center gap-2 text-[10px] font-mono text-[#5A6068] mt-1">
              <span className="w-3 h-0.5" style={{ backgroundColor: 'rgba(79,183,179,0.4)' }} />
              imports
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-[#5A6068]">
              <span className="w-3 h-0.5 border-t border-dashed" style={{ borderColor: 'rgba(232,163,61,0.4)', height: 0 }} />
              http
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-3">
          {/* Stats */}
          <div className="rounded-lg border border-white/10 bg-well p-3">
            <div className="flex items-center gap-2 mb-2">
              <Layers size={13} className="text-amber" />
              <span className="text-xs font-mono uppercase tracking-wider text-[#8B92A0]">Index stats</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-lg font-semibold text-[#EDEEF0]">{stats.nodes}</span>
                <span className="text-xs text-[#5A6068] ml-1">nodes</span>
              </div>
              <div>
                <span className="text-lg font-semibold text-[#EDEEF0]">{stats.edges}</span>
                <span className="text-xs text-[#5A6068] ml-1">edges</span>
              </div>
            </div>
            <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(stats.nodes / NODES.length) * 100}%`,
                  backgroundColor: phaseColors[phase] || C.dim,
                }}
              />
            </div>
          </div>

          {/* Thought stream */}
          <div className="flex-1 rounded-lg border border-white/10 bg-well overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/10">
              <Workflow size={13} className="text-teal" />
              <span className="text-xs font-mono uppercase tracking-wider text-[#8B92A0]">Indexer log</span>
              <span className="text-[10px] font-mono text-[#5A6068] ml-auto">
                {thoughts.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5" style={{ maxHeight: '320px' }}>
              {thoughts.length === 0 && (
                <p className="text-xs text-[#5A6068] py-4 text-center">Waiting for indexer...</p>
              )}
              {thoughts.map((t) => (
                <div key={t.id} className="flex items-start gap-2 text-xs leading-relaxed animate-in">
                  <span className="text-[9px] font-mono text-[#5A6068] mt-0.5 flex-shrink-0">{t.time}</span>
                  <span className={t.msg.startsWith('✓') ? 'text-teal' : t.msg.startsWith('  ') ? 'text-[#5A6068]' : 'text-[#C7CBD3]'}>
                    {t.msg}
                  </span>
                </div>
              ))}
              <div ref={el => el?.scrollIntoView({ behavior: 'smooth' })} />
            </div>
          </div>

          {/* Selected node info */}
          {selectedNode && (
            <div className="rounded-lg border border-amber/20 bg-well p-3 animate-in">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: GROUP_COLORS[selectedNode.group]?.stroke }} />
                <span className="text-sm font-semibold text-white">{selectedNode.label}</span>
                <span className="text-[10px] font-mono text-[#5A6068] ml-auto">{selectedNode.type}</span>
              </div>
              <p className="text-xs text-[#8B92A0] mb-2">{selectedNode.desc}</p>
              <div className="flex items-center gap-2 text-[10px] font-mono text-[#5A6068]">
                <span>{selectedEdges.length} connection{selectedEdges.length !== 1 ? 's' : ''}</span>
                {selectedNode.group === 0 && <span className="text-amber">● root</span>}
                {selectedNode.group === 1 && <span className="text-teal">● frontend</span>}
                {selectedNode.group === 2 && <span className="text-[#7C6FD6]">● backend</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
