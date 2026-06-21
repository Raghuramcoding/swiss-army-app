import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Play, Pause, RotateCcw, Cpu, Layers, Workflow, Github, Loader2, Search,
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
  { fill: '#E8A33D20', stroke: '#E8A33D', glow: 'rgba(232,163,61,0.08)', label: 'Root' },
  { fill: '#4FB7B320', stroke: '#4FB7B3', glow: 'rgba(79,183,179,0.08)', label: 'Source' },
  { fill: '#7C6FD620', stroke: '#7C6FD6', glow: 'rgba(124,111,214,0.08)', label: 'Config' },
  { fill: '#E8A33D20', stroke: '#E8A33D', glow: 'rgba(232,163,61,0.08)', label: 'Docs' },
  { fill: '#4FB7B320', stroke: '#4FB7B3', glow: 'rgba(79,183,179,0.08)', label: 'Assets' },
];

const EDGE_STYLES = {
  contains: { color: 'rgba(255,255,255,0.06)', width: 1, dash: [] },
};

const DEMO_NODES = [
  { id: 'root', label: 'swiss-army-app', type: 'root', group: 0, phase: 0, index: 0, size: 6, desc: 'Monorepo root' },
  { id: 'app', label: 'workbench-app', type: 'dir', group: 1, parent: 'root', phase: 0, index: 1, size: 4, desc: 'React + Vite frontend' },
  { id: 'backend', label: 'workbench-backend', type: 'dir', group: 2, parent: 'root', phase: 0, index: 2, size: 4, desc: 'Express.js backend' },
  { id: 'components', label: 'components/', type: 'dir', group: 1, parent: 'app', phase: 0, index: 3, size: 3, desc: 'Shared UI components' },
  { id: 'tools', label: 'tools/', type: 'dir', group: 1, parent: 'app', phase: 0, index: 4, size: 3, desc: 'Tool modules' },
  { id: 'db', label: 'db/', type: 'dir', group: 2, parent: 'backend', phase: 1, index: 0, size: 3, desc: 'Database layer' },
  { id: 'routes', label: 'routes/', type: 'dir', group: 2, parent: 'backend', phase: 1, index: 1, size: 3, desc: 'API route handlers' },
  { id: 'services', label: 'services/', type: 'dir', group: 2, parent: 'backend', phase: 1, index: 2, size: 3, desc: 'Business logic' },
  { id: 'App', label: 'App.jsx', type: 'file', group: 1, parent: 'app', phase: 2, index: 0, size: 2.5, desc: 'Root component with sidebar layout' },
  { id: 'server', label: 'server.js', type: 'file', group: 2, parent: 'backend', phase: 2, index: 1, size: 2.5, desc: 'Express server entry' },
  { id: 'shared', label: 'shared.jsx', type: 'file', group: 1, parent: 'components', phase: 2, index: 2, size: 2.5, desc: 'Reusable UI primitives' },
  { id: 'aiClient', label: 'aiClient.js', type: 'file', group: 1, parent: 'app', phase: 2, index: 3, size: 2.2, desc: 'AI provider client' },
  { id: 'utilityTools', label: 'utilityTools.jsx', type: 'file', group: 1, parent: 'tools', phase: 2, index: 4, size: 2.2, desc: 'Offline utility tools' },
  { id: 'aiTools', label: 'aiTools.jsx', type: 'file', group: 1, parent: 'tools', phase: 2, index: 5, size: 2.5, desc: 'AI-powered tools' },
  { id: 'authRoute', label: 'auth.js', type: 'file', group: 2, parent: 'routes', phase: 3, index: 0, size: 2, desc: 'Auth routes' },
  { id: 'pool', label: 'pool.js', type: 'file', group: 2, parent: 'db', phase: 3, index: 1, size: 2, desc: 'PostgreSQL connection pool' },
  { id: 'authService', label: 'auth.js', type: 'file', group: 2, parent: 'services', phase: 3, index: 2, size: 2, desc: 'JWT auth service' },
];

const DEMO_THOUGHTS = [
  { msg: "Initializing codebase indexer...", phase: 0 },
  { msg: "Scanning repository structure...", phase: 0 },
  { msg: "Discovered root: swiss-army-app", phase: 0 },
  { msg: "Found workbench-app/ — React + Vite frontend", phase: 0 },
  { msg: "Found workbench-backend/ — Express.js backend", phase: 0 },
  { msg: "Parsing source files...", phase: 2 },
  { msg: "App.jsx — main entry point with sidebar layout", phase: 2 },
  { msg: "shared.jsx — 7 reusable UI components", phase: 2 },
  { msg: "aiTools.jsx — 9 AI-powered tools", phase: 2 },
  { msg: "utilityTools.jsx — 6 offline tools", phase: 2 },
  { msg: "Resolving dependencies...", phase: 2 },
  { msg: "Building knowledge graph...", phase: 4 },
  { msg: "No circular dependencies detected", phase: 4 },
  { msg: "Stabilizing simulation...", phase: 4 },
  { msg: `✓ Indexing complete`, phase: 5 },
  { msg: "Click any node to inspect it", phase: 5 },
];

async function fetchGithubTree(owner, repo) {
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
  if (!repoRes.ok) throw new Error(repoRes.status === 404 ? "Repository not found." : `GitHub API error: ${repoRes.status}`);
  const repoData = await repoRes.json();
  const branch = repoData.default_branch;

  const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
  if (!treeRes.ok) throw new Error("Failed to fetch repository tree.");
  const treeData = await treeRes.json();

  if (treeData.truncated) {
    console.warn(`GitHub tree truncated (${treeData.tree.length} items). Only showing partial structure.`);
  }
  return { repo: repoData, items: treeData.tree };
}

function buildGraphFromTree(items, repoName, repoDesc) {
  const nodes = [];
  const edges = [];
  const thoughts = [];
  const pathToId = new Map();

  pathToId.set("", "root");
  nodes.push({
    id: "root", label: repoName, type: "root", group: 0, phase: 0, size: 5 + Math.min(items.length * 0.02, 3),
    desc: repoDesc || `${repoName} — ${items.length} items`,
  });

  const topLevel = new Set();
  for (const item of items) {
    const dir = item.path.split("/")[0];
    topLevel.add(dir);
  }
  const topDirList = [...topLevel];
  const topDirGroup = new Map();
  topDirList.forEach((d, i) => topDirGroup.set(d, (i % 4) + 1));

  const filtered = items.filter(item => {
    const depth = item.path.split("/").length;
    return depth <= 5 && !item.path.startsWith(".") && !item.path.includes("node_modules");
  }).slice(0, 350);

  const sorted = [...filtered].sort((a, b) => a.path.split("/").length - b.path.split("/").length);

  for (const item of sorted) {
    const parts = item.path.split("/");
    const parentPath = parts.slice(0, -1).join("/");
    const name = parts[parts.length - 1];
    const id = `n_` + item.path.replace(/[^a-zA-Z0-9_]/g, "_");
    const parent = pathToId.get(parentPath) || "root";
    const depth = parts.length;
    const topDir = parts[0] || "";
    const group = item.type === "tree" ? (topDirGroup.get(topDir) || 1) : (topDirGroup.get(topDir) || 1);

    if (item.type === "tree") pathToId.set(item.path, id);

    nodes.push({
      id, label: item.type === "tree" ? name + "/" : name,
      type: item.type === "tree" ? "dir" : "file",
      group, parent,
      phase: depth <= 1 ? 0 : depth <= 3 ? 1 : 2,
      size: item.type === "tree" ? Math.max(1.5, 3 - depth * 0.3) : Math.max(1, 2.5 - depth * 0.25),
      desc: `${repoName}/${item.path}`,
    });

    edges.push({ source: parent, target: id, type: "contains", phase: 0 });
  }

  thoughts.push({ msg: `Fetching ${repoName} tree from GitHub...`, phase: 0 });
  thoughts.push({ msg: `Found ${items.length} items in repository`, phase: 0 });
  thoughts.push({ msg: `Building hierarchy for ${nodes.length} nodes...`, phase: 0 });

  const dirs = nodes.filter(n => n.type !== "file" && n.id !== "root");
  for (const d of dirs.slice(0, 10)) thoughts.push({ msg: `  ${d.label} — ${d.desc}`, phase: 1 });

  const files = nodes.filter(n => n.type === "file");
  for (const f of files.slice(0, 15)) thoughts.push({ msg: `  ${f.label}`, phase: 2 });

  thoughts.push({ msg: "Linking containment hierarchy...", phase: 4 });
  thoughts.push({ msg: "Computing force-directed layout...", phase: 4 });
  thoughts.push({ msg: `✓ Indexing complete — ${nodes.length} nodes, ${edges.length} edges`, phase: 5 });
  thoughts.push({ msg: "Click any node to inspect it", phase: 5 });

  return { nodes, edges, thoughts };
}

function simulateForce(nodes, edges, width, height) {
  const centerX = width / 2;
  const centerY = height / 2;
  const nodeArr = [...nodes.values()];

  for (const n of nodeArr) {
    if (!n.revealed) continue;
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

const G = {
  0: 'rgba(232,163,61,0.25)',
  1: 'rgba(79,183,179,0.2)',
  2: 'rgba(124,111,214,0.2)',
  3: 'rgba(232,163,61,0.15)',
  4: 'rgba(79,183,179,0.15)',
};

function drawBackground(ctx, w, h) {
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

function drawEdges(ctx, nodes, edges, hoveredId, selectedId) {
  for (const edge of edges) {
    if (!edge.revealed) continue;
    const a = nodes.get(edge.source);
    const b = nodes.get(edge.target);
    if (!a || !b || !a.revealed || !b.revealed) continue;
    if (a.opacity < 0.01 || b.opacity < 0.01) continue;

    const style = EDGE_STYLES[edge.type] || EDGE_STYLES.contains;
    const isHighlighted = hoveredId === edge.source || hoveredId === edge.target;
    const isSelected = selectedId && (selectedId === edge.source || selectedId === edge.target);
    const alpha = isSelected ? 0.7 : isHighlighted ? 0.5 : 0.4;
    const width = isSelected ? style.width * 2.5 : isHighlighted ? style.width * 1.5 : style.width;

    ctx.save();
    ctx.globalAlpha = alpha * b.opacity;
    ctx.strokeStyle = style.color;
    ctx.lineWidth = width;
    if (style.dash.length > 0) ctx.setLineDash(style.dash);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }
}

function drawNodes(ctx, nodes, hoveredId, selectedId) {
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
  const [loading, setLoading] = useState(false);
  const [repoInput, setRepoInput] = useState("");
  const [error, setError] = useState(null);
  const [currentRepo, setCurrentRepo] = useState(null);
  const [resetKey, setResetKey] = useState(0);

  const hoveredRef = useRef(null);
  const selectedRef = useRef(null);
  const nodesRef = useRef([]);
  const edgesRef = useRef([]);
  const thoughtsRef = useRef([]);

  const simRef = useRef({
    nodes: new Map(),
    edges: [],
    spawnIdx: 0,
    thoughtIdx: 0,
    phase: 0,
  });

  const resetSim = useCallback(() => {
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
    setResetKey(k => k + 1);
  }, []);

  const initDemo = useCallback(() => {
    nodesRef.current = DEMO_NODES;
    edgesRef.current = DEMO_NODES.filter(n => n.parent).map(n => ({ source: n.parent, target: n.id, type: "contains", phase: 0 }));
    thoughtsRef.current = DEMO_THOUGHTS;
    setCurrentRepo(null);
    setError(null);
    resetSim();
  }, [resetSim]);

  const loadRepo = useCallback(async (input) => {
    const cleaned = input.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "");
    const parts = cleaned.split("/");
    if (parts.length < 2) { setError("Enter owner/repo (e.g. facebook/react)"); return; }
    const [owner, repo] = parts;
    setLoading(true);
    setError(null);
    try {
      const { repo: repoData, items } = await fetchGithubTree(owner, repo);
      const { nodes, edges, thoughts } = buildGraphFromTree(items, repoData.full_name, repoData.description);
      nodesRef.current = nodes;
      edgesRef.current = edges;
      thoughtsRef.current = thoughts;
      setCurrentRepo(repoData.full_name);
      resetSim();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [resetSim]);

  useEffect(() => { initDemo(); }, [initDemo]);

  const spawnInterval = useMemo(() => Math.max(30, 300 - speed * 2.7), [speed]);

  useEffect(() => {
    if (!running) return;
    const sim = simRef.current;
    const interval = setInterval(() => {
      if (sim.phase >= 5) { clearInterval(interval); return; }

      const addThought = (msg) => {
        setThoughts(prev => [...prev, { id: Date.now() + Math.random(), msg, time: new Date().toLocaleTimeString() }]);
      };

      const nextThought = () => {
        while (sim.thoughtIdx < thoughtsRef.current.length && thoughtsRef.current[sim.thoughtIdx].phase <= sim.phase) {
          addThought(thoughtsRef.current[sim.thoughtIdx].msg);
          sim.thoughtIdx++;
        }
      };

      const spawnNextNode = () => {
        while (sim.spawnIdx < nodesRef.current.length) {
          const def = nodesRef.current[sim.spawnIdx];
          if (def.phase > sim.phase) break;
          const node = {
            ...def,
            x: (containerRef.current?.clientWidth || 600) / 2 + (Math.random() - 0.5) * 200,
            y: (containerRef.current?.clientHeight || 400) / 2 + (Math.random() - 0.5) * 200,
            vx: 0, vy: 0, fx: 0, fy: 0,
            revealed: true, opacity: 0.01,
          };
          sim.nodes.set(def.id, node);
          sim.spawnIdx++;
          nextThought();
          return true;
        }

        for (const def of edgesRef.current) {
          if (def.phase > sim.phase) continue;
          if (sim.edges.find(e => e.source === def.source && e.target === def.target)) continue;
          if (sim.nodes.has(def.source) && sim.nodes.has(def.target)) {
            sim.edges.push({ ...def, revealed: true, opacity: 0.01 });
            return true;
          }
        }
        return false;
      };

      let spawned = false;
      for (let i = 0; i < 3; i++) { if (spawnNextNode()) spawned = true; }

      if (!spawned && sim.phase < 5) {
        const remaining = nodesRef.current.filter(n => n.phase > sim.phase);
        if (remaining.length === 0) { sim.phase = 5; setPhase(5); }
        else { sim.phase++; setPhase(p => p + 1); nextThought(); }
      }

      setStats({ nodes: sim.nodes.size, edges: sim.edges.length });
    }, 80);

    return () => clearInterval(interval);
  }, [running, spawnInterval, resetKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    const sim = simRef.current;
    let frameId;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
      canvas.__w = rect.width;
      canvas.__h = rect.height;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const render = (time) => {
      const w = canvas.__w || 600;
      const h = canvas.__h || 400;

      for (const n of sim.nodes.values()) {
        if (n.revealed && n.opacity < 1) n.opacity = Math.min(1, n.opacity + 0.04);
      }
      for (const e of sim.edges) {
        if (e.revealed && e.opacity < 1) e.opacity = Math.min(1, e.opacity + 0.02);
      }

      const curHovered = hoveredRef.current;
      const curSelected = selectedRef.current;

      simulateForce(sim.nodes, sim.edges, w, h);
      drawBackground(ctx, w, h);
      ctx.save();
      drawEdges(ctx, sim.nodes, sim.edges, curHovered, curSelected);
      drawNodes(ctx, sim.nodes, curHovered, curSelected);

      if (phase < 5 && sim.nodes.size > 0) {
        const pulseR = (Math.sin(time / 800) + 1) / 2;
        const last = Array.from(sim.nodes.values()).filter(n => n.revealed).slice(-1)[0];
        if (last) {
          ctx.save();
          ctx.globalAlpha = 0.15 * (1 - pulseR);
          ctx.strokeStyle = "#E8A33D";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(last.x, last.y, last.size * 5 + 10 + pulseR * 20, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      if (phase >= 5) {
        ctx.save();
        ctx.fillStyle = "rgba(79,183,179,0.15)";
        ctx.font = "bold 12px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(`✓ ${nodesRef.current.length} nodes · ${edgesRef.current.length} edges`, w / 2, h - 16);
        ctx.restore();
      }

      ctx.restore();
      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(frameId); ro.disconnect(); };
  }, [phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sim = simRef.current;

    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      let found = null;
      for (const n of sim.nodes.values()) {
        if (!n.revealed) continue;
        const r = n.size * 5 * 1.25;
        const dx = mx - n.x, dy = my - n.y;
        if (dx * dx + dy * dy < r * r) { found = n.id; break; }
      }
      hoveredRef.current = found;
      setHoveredId(found);
      canvas.style.cursor = found ? "pointer" : "default";
    };

    const onClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      let found = null;
      for (const n of sim.nodes.values()) {
        if (!n.revealed) continue;
        const r = n.size * 5 * 1.25;
        const dx = mx - n.x, dy = my - n.y;
        if (dx * dx + dy * dy < r * r) { found = n.id; break; }
      }
      selectedRef.current = found && selectedRef.current !== found ? found : null;
      setSelectedId(prev => prev === found ? null : found);
    };

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("click", onClick);
    return () => {
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("click", onClick);
    };
  }, []);

  const selectedNode = selectedId ? nodesRef.current.find(n => n.id === selectedId) : null;
  const selectedEdges = selectedId ? edgesRef.current.filter(e => e.source === selectedId || e.target === selectedId) : [];

  const phaseNames = ["Fetching", "Scanning", "Parsing", "Analyzing", "Linking", "Complete"];
  const phaseColors = [C.dim, C.dim, C.teal, C.amber, C.purple, C.teal];
  const totalNodes = nodesRef.current.length;
  const totalEdges = edgesRef.current.length;

  return (
    <div className="flex flex-col gap-3">
      {/* Repo input bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Github size={14} className="text-[#8B92A0] flex-shrink-0" />
          <input
            value={repoInput}
            onChange={e => setRepoInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !loading) loadRepo(repoInput); }}
            placeholder="owner/repo (e.g. facebook/react)"
            disabled={loading}
            className="flex-1 min-w-[180px] rounded-md border border-white/10 bg-well px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber/50 disabled:opacity-50"
          />
          <button
            onClick={() => loadRepo(repoInput)}
            disabled={loading || !repoInput.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber px-3 py-1.5 text-sm font-semibold text-ink hover:bg-[#f0b257] transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            {loading ? "Loading..." : "Index"}
          </button>
          {currentRepo && (
            <button
              onClick={initDemo}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-sm text-[#C7CBD3] hover:bg-white/5 transition-colors"
            >
              <RotateCcw size={14} /> Demo
            </button>
          )}
        </div>
        {error && <p className="text-xs text-rust w-full">{error}</p>}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setRunning(r => !r)}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-sm text-[#C7CBD3] hover:bg-white/5 transition-colors"
        >
          {running ? <Pause size={14} /> : <Play size={14} />}
          {running ? "Pause" : "Resume"}
        </button>
        <button
          onClick={currentRepo ? () => loadRepo(repoInput) : resetSim}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-sm text-[#C7CBD3] hover:bg-white/5 transition-colors"
        >
          <RotateCcw size={14} /> Reset
        </button>
        {currentRepo && (
          <span className="text-xs text-teal font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-teal" />
            {currentRepo}
          </span>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <Cpu size={13} className="text-[#5A6068]" />
          <span className="text-xs font-mono text-[#5A6068] min-w-[5rem]">{phaseNames[phase]}</span>
          <input
            type="range" min={1} max={100} value={speed}
            onChange={e => setSpeed(Number(e.target.value))}
            className="w-20 h-1 accent-amber cursor-pointer"
          />
          <span className="text-xs font-mono text-[#5A6068] w-8 text-right">{speed}%</span>
        </div>
      </div>

      {/* Main area */}
      <div className="flex gap-4" style={{ minHeight: "480px" }}>
        <div ref={containerRef} className="flex-1 rounded-lg border border-white/10 overflow-hidden relative bg-well">
          <canvas ref={canvasRef} className="block" />
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
            {GROUP_COLORS.slice(0, 3).map((gc, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] font-mono text-[#5A6068]">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: gc.stroke }} />
                {gc.label}
              </div>
            ))}
          </div>
        </div>

        <div className="w-72 flex-shrink-0 flex flex-col gap-3">
          <div className="rounded-lg border border-white/10 bg-well p-3">
            <div className="flex items-center gap-2 mb-2">
              <Layers size={13} className="text-amber" />
              <span className="text-xs font-mono uppercase tracking-wider text-[#8B92A0]">Stats</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-lg font-semibold text-[#EDEEF0]">{stats.nodes}</span>
                <span className="text-xs text-[#5A6068] ml-1">/ {totalNodes}</span>
              </div>
              <div>
                <span className="text-lg font-semibold text-[#EDEEF0]">{stats.edges}</span>
                <span className="text-xs text-[#5A6068] ml-1">/ {totalEdges}</span>
              </div>
            </div>
            <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${totalNodes ? (stats.nodes / totalNodes) * 100 : 0}%`, backgroundColor: phaseColors[phase] || C.dim }}
              />
            </div>
          </div>

          <div className="flex-1 rounded-lg border border-white/10 bg-well overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/10">
              <Workflow size={13} className="text-teal" />
              <span className="text-xs font-mono uppercase tracking-wider text-[#8B92A0]">Log</span>
              <span className="text-[10px] font-mono text-[#5A6068] ml-auto">{thoughts.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5" style={{ maxHeight: "320px" }}>
              {thoughts.length === 0 && <p className="text-xs text-[#5A6068] py-4 text-center">Waiting...</p>}
              {thoughts.map(t => (
                <div key={t.id} className="flex items-start gap-2 text-xs leading-relaxed">
                  <span className="text-[9px] font-mono text-[#5A6068] mt-0.5 flex-shrink-0">{t.time}</span>
                  <span className={t.msg.startsWith("✓") ? "text-teal" : t.msg.startsWith("  ") ? "text-[#5A6068]" : "text-[#C7CBD3]"}>
                    {t.msg}
                  </span>
                </div>
              ))}
              <div ref={el => el?.scrollIntoView({ behavior: "smooth" })} />
            </div>
          </div>

          {selectedNode && (
            <div className="rounded-lg border border-amber/20 bg-well p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: GROUP_COLORS[selectedNode.group]?.stroke }} />
                <span className="text-sm font-semibold text-white">{selectedNode.label}</span>
                <span className="text-[10px] font-mono text-[#5A6068] ml-auto">{selectedNode.type}</span>
              </div>
              <p className="text-xs text-[#8B92A0] mb-2">{selectedNode.desc}</p>
              <div className="flex items-center gap-2 text-[10px] font-mono text-[#5A6068]">
                <span>{selectedEdges.length} connection{selectedEdges.length !== 1 ? "s" : ""}</span>
                <span className="text-[#4FB7B3]">● group {selectedNode.group}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
