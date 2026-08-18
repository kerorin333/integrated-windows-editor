/* Archive Desk design: Japanese editorial utility, warm paper workspace, ink navy UI, vermilion proofreading accent. Keep the outline visible before the prose and make every structural change immediately meaningful. */
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  FileOutput,
  FolderOpen,
  GripVertical,
  History,
  LayoutList,
  Menu,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings2,
  Sparkles,
  Target,
  Timer,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Document, Packer, Paragraph, TextRun } from "docx";

declare global {
  interface Window {
    archiveDesk?: {
      openProject: () => Promise<string | null>;
      saveProject: (content: string) => Promise<boolean>;
      openFolder: () => Promise<{ content: string; folderPath: string; files?: Array<{ path: string; content: string }> } | null>;
      saveFolder: (content: string) => Promise<{ saved: boolean; folderPath: string } | false>;
      writeFolder: (folderPath: string, content: string) => Promise<boolean>;
      readFolder: (folderPath: string) => Promise<{ projectContent: string; files: Array<{ path: string; content: string }> } | null>;
      watchFolder: (folderPath: string) => Promise<boolean>;
      onMenuAction: (listener: (action: string) => void) => () => void;
      onExternalChange: (listener: (filename: string) => void) => () => void;
    };
  }
}

type ProjectSettings = {
  targetWords: number;
  deadline: string;
  dailyGoal: number;
  projectName: string;
  genre: string;
  submissionTarget: string;
  projectNote: string;
};

type WritingDay = { date: string; words: number };
type ProjectRecord = ProjectSettings & { id: string; nodes: OutlineNode[]; writingHistory: WritingDay[]; archived?: boolean };

function cloneNodes(nodes: OutlineNode[]) {
  return JSON.parse(JSON.stringify(nodes)) as OutlineNode[];
}

type OutlineNode = {
  id: string;
  title: string;
  type: "part" | "chapter" | "scene";
  summary: string;
  content: string;
  status: "draft" | "writing" | "done";
  target: number;
  characters?: string;
  location?: string;
  threads?: string;
  children?: OutlineNode[];
};

const defaultProjectSettings: ProjectSettings = {
  targetWords: 7400,
  deadline: new Date(Date.now() + 18 * 86400000).toISOString().slice(0, 10),
  dailyGoal: 400,
  projectName: "海鳴りの町",
  genre: "長編小説",
  submissionTarget: "小説新人賞",
  projectNote: "失われた記憶を探す旅の物語。",
};

const initialNodes: OutlineNode[] = [
  {
    id: "part-1",
    title: "第一部　海鳴りの町",
    type: "part",
    summary: "失われた記憶を探す旅の始まり。",
    content: "",
    status: "writing",
    target: 12000,
    children: [
      {
        id: "ch-1",
        title: "第一章　雨の駅",
        type: "chapter",
        summary: "主人公が故郷へ戻り、古い手紙を受け取る。",
        content: "駅を出ると、雨は海から吹いてきた。\n\n町は記憶の中よりも小さく、けれど音だけは大きかった。屋根を叩く雨音の向こうで、遠い汽笛が一度だけ鳴った。",
        status: "done",
        target: 3200,
        children: [
          {
            id: "scene-1",
            title: "01　駅前の喫茶店",
            type: "scene",
            summary: "古い店で手紙を受け取る。",
            content: "駅を出ると、雨は海から吹いてきた。\n\n喫茶店の窓は曇っていて、店内の時計だけが妙に鮮明だった。",
            status: "done",
            target: 1600,
          },
          {
            id: "scene-2",
            title: "02　青い封筒",
            type: "scene",
            summary: "差出人のない封筒に、町の秘密が隠されている。",
            content: "封筒は青かった。濡れているのに、紙の手触りだけが乾いていた。",
            status: "done",
            target: 1600,
          },
        ],
      },
      {
        id: "ch-2",
        title: "第二章　灯台の記録",
        type: "chapter",
        summary: "灯台守の日誌から、消えた名前を見つける。",
        content: "灯台へ続く道は、潮の匂いをまとっていた。\n\n記録には毎晩の風向きが書かれていたが、ある夜だけ、名前の代わりに三本の線が引かれていた。",
        status: "writing",
        target: 4200,
        children: [
          {
            id: "scene-3",
            title: "01　坂道の風",
            type: "scene",
            summary: "灯台へ向かう道で、幼いころの記憶が戻る。",
            content: "灯台へ続く道は、潮の匂いをまとっていた。",
            status: "writing",
            target: 2100,
          },
          {
            id: "scene-4",
            title: "02　三本の線",
            type: "scene",
            summary: "日誌に残された奇妙な記号を見つける。",
            content: "記録には毎晩の風向きが書かれていた。",
            status: "draft",
            target: 2100,
          },
        ],
      },
    ],
  },
  {
    id: "part-2",
    title: "第二部　水底の手紙",
    type: "part",
    summary: "町の過去と向き合い、選択を迫られる。",
    content: "",
    status: "draft",
    target: 14000,
    children: [],
  },
];

function blankNodes(projectName: string): OutlineNode[] {
  return [{ id: `part-${Date.now()}`, title: projectName, type: "part", summary: "ここから作品の構成を作成します。", content: "", status: "draft", target: 0, children: [] }];
}
function starterNodes(projectName: string): OutlineNode[] {
  const next = cloneNodes(initialNodes);
  next[0] = { ...next[0], title: `第一部　${projectName}`, summary: `${projectName}の物語を組み立てる。` };
  next[0].children = next[0].children?.map((chapter, index) => ({ ...chapter, title: `${index + 1 === 1 ? "第一" : "第二"}章　${projectName}${index === 0 ? "のはじまり" : "の余韻"}` }));
  return next;
}
function flatten(nodes: OutlineNode[]): OutlineNode[] {
  return nodes.flatMap((node) => [node, ...(node.children ? flatten(node.children) : [])]);
}

function updateNode(nodes: OutlineNode[], id: string, patch: Partial<OutlineNode>): OutlineNode[] {
  return nodes.map((node) => node.id === id ? { ...node, ...patch } : { ...node, children: node.children ? updateNode(node.children, id, patch) : node.children });
}

function moveNode(nodes: OutlineNode[], id: string, direction: -1 | 1): OutlineNode[] {
  const copy = structuredClone(nodes) as OutlineNode[];
  const walk = (items: OutlineNode[]): boolean => {
    const index = items.findIndex((item) => item.id === id);
    if (index >= 0) {
      const next = index + direction;
      if (next >= 0 && next < items.length) [items[index], items[next]] = [items[next], items[index]];
      return true;
    }
    return items.some((item) => item.children && walk(item.children));
  };
  walk(copy);
  return copy;
}

function reorderTree(nodes: OutlineNode[], draggedId: string, targetId: string): OutlineNode[] {
  const copy = structuredClone(nodes) as OutlineNode[];
  let dragged: OutlineNode | undefined;
  const remove = (items: OutlineNode[]): OutlineNode[] => items.filter((item) => { if (item.id === draggedId) { dragged = item; return false; } item.children = item.children ? remove(item.children) : item.children; return true; });
  const cleaned = remove(copy);
  if (!dragged) return nodes;
  const insert = (items: OutlineNode[]): boolean => {
    const index = items.findIndex((item) => item.id === targetId);
    if (index >= 0) { items.splice(index, 0, dragged as OutlineNode); return true; }
    return items.some((item) => item.children && insert(item.children));
  };
  return insert(cleaned) ? cleaned : nodes;
}

function renumberOutline(nodes: OutlineNode[]): OutlineNode[] {
  return nodes.map((node) => {
    const children = node.children ? renumberOutline(node.children) : node.children;
    return { ...node, children };
  }).map((node) => {
    if (!node.children?.length) return node;
    let sceneNumber = 0;
    const children = node.children.map((child) => {
      if (child.type !== "scene") return child;
      sceneNumber += 1;
      const title = child.title.replace(/^\s*\d{1,3}[.．、\s　]+/, "").trim() || "無題のシーン";
      return { ...child, title: `${String(sceneNumber).padStart(2, "0")}　${title}` };
    });
    return { ...node, children };
  });
}
function inlineMarkdown(text: string): ReactNode[] {
  const tokenPattern = /(｜[^《\n]+《[^》\n]+》|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g;
  return text.split(tokenPattern).filter(Boolean).map((segment, index) => {
    const ruby = segment.match(/^｜(.+)《(.+)》$/);
    if (ruby) return <ruby key={`${segment}-${index}`}>{ruby[1]}<rt>{ruby[2]}</rt></ruby>;
    if ((segment.startsWith("**") && segment.endsWith("**")) || (segment.startsWith("__") && segment.endsWith("__"))) return <strong key={`${segment}-${index}`}>{segment.slice(2, -2)}</strong>;
    if ((segment.startsWith("*") && segment.endsWith("*")) || (segment.startsWith("_") && segment.endsWith("_"))) return <em key={`${segment}-${index}`}>{segment.slice(1, -1)}</em>;
    return <span key={`${segment}-${index}`}>{segment}</span>;
  });
}
function markdownPreview(text: string): ReactNode[] {
  const lines = text.replace(/\r/g, "").split("\n");
  return lines.map((line, index) => {
    const key = `${index}-${line}`;
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const Tag = heading[1].length === 1 ? "h1" : heading[1].length === 2 ? "h2" : "h3";
      return <Tag key={key}>{inlineMarkdown(heading[2])}</Tag>;
    }
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (bullet) return <li key={key}>{inlineMarkdown(bullet[1])}</li>;
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (ordered) return <li key={key} className="ordered-preview-item">{inlineMarkdown(ordered[1])}</li>;
    if (/^>\s?/.test(line)) return <blockquote key={key}>{inlineMarkdown(line.replace(/^>\s?/, ""))}</blockquote>;
    if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) return <hr key={key} />;
    if (!line.trim()) return <div className="markdown-break" key={key} />;
    return <p key={key}>{inlineMarkdown(line)}</p>;
  });
}

function flattenWithDepth(nodes: OutlineNode[], depth = 0): Array<{ node: OutlineNode; depth: number }> {
  return nodes.flatMap((node) => [{ node, depth }, ...(node.children ? flattenWithDepth(node.children, depth + 1) : [])]);
}
function plainTextCount(value: string): number {
  return value
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s*#{1,6}\s*/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/gm, "")
    .replace(/｜([^《\n]+)《[^》]*》/g, "$1")
    .replace(/([^\s《》]+)《[^》]*》/g, "$1")
    .replace(/[\*_~`]/g, "")
    .replace(/\s/g, "").length;
}
function nodeCount(node: OutlineNode): number {
  return plainTextCount(node.content) + (node.children ?? []).reduce((sum, child) => sum + nodeCount(child), 0);
}

function OutlineRow({ node, depth, selectedId, selectedIds, onSelect, onMove, onDrop, treeMode }: { node: OutlineNode; depth: number; selectedId: string; selectedIds: string[]; onSelect: (id: string, multi: boolean) => void; onMove: (id: string, direction: -1 | 1) => void; onDrop: (draggedId: string, targetId: string) => void; treeMode: "expanded" | "collapsed" }) {
  const [open, setOpen] = useState(true);
  useEffect(() => setOpen(treeMode === "expanded"), [treeMode]);
  const count = nodeCount(node);
  const typeLabel = node.type === "part" ? "部" : node.type === "chapter" ? "章" : "節";
  const childLabel = node.children?.length ? `${node.children.length}項目` : `${count.toLocaleString()}字`;
  const statusLabel = node.status === "done" ? "完成" : node.status === "writing" ? "執筆中" : "構想中";
  return (
    <div className="outline-node-group">
      <div className={`outline-row ${selectedId === node.id ? "selected" : ""} ${selectedIds.includes(node.id) ? "multi-selected" : ""}`} style={{ paddingLeft: `${14 + depth * 18}px` }} draggable onDragStart={(event) => { event.dataTransfer.setData("text/plain", node.id); }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const draggedId = event.dataTransfer.getData("text/plain"); if (draggedId && draggedId !== node.id) onDrop(draggedId, node.id); }} onClick={(event) => onSelect(node.id, event.ctrlKey || event.metaKey)}>
        <button className="disclosure" onClick={(event) => { event.stopPropagation(); setOpen(!open); }} aria-label={open ? "折りたたむ" : "展開"}>
          {node.children?.length ? (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span className="dot" />}
        </button>
        <GripVertical className="grip" size={14} />
        <span className={`status-dot ${node.status}`} />
        <div className="outline-copy"><div className="outline-line"><span className="outline-kicker">{typeLabel}</span><span className="outline-title">{node.title}</span></div><div className="outline-support"><span>{node.summary}</span><span>{childLabel}　·　{statusLabel}</span></div></div>
        <div className="row-actions"><button onClick={(event) => { event.stopPropagation(); onMove(node.id, -1); }} aria-label="上へ移動"><ArrowUp size={12} /></button><button onClick={(event) => { event.stopPropagation(); onMove(node.id, 1); }} aria-label="下へ移動"><ArrowDown size={12} /></button></div>
      </div>
      {open && node.children?.map((child) => <OutlineRow key={child.id} node={child} depth={depth + 1} selectedId={selectedId} selectedIds={selectedIds} onSelect={onSelect} onMove={onMove} onDrop={onDrop} treeMode={treeMode} />)}
    </div>
  );
}

export default function Home() {
  const [nodes, setNodes] = useState(initialNodes);
  const [activeProjectId, setActiveProjectId] = useState(() => localStorage.getItem("archive-desk-active-project") || "harbor-town");
  const [projects, setProjects] = useState<ProjectRecord[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("archive-desk-project-list") || "null");
      if (Array.isArray(stored) && stored.length) return stored.map((project) => ({ ...project, archived: Boolean(project.archived) }));
    } catch {}
    return [
      { id: "harbor-town", ...defaultProjectSettings, nodes: cloneNodes(initialNodes), writingHistory: [] },
      { id: "night-letter", ...defaultProjectSettings, projectName: "夜をわたる手紙", genre: "短編小説", deadline: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), targetWords: 4000, nodes: [], writingHistory: [] },
    ];
  });
  const [projectSettings, setProjectSettings] = useState<ProjectSettings>(() => {
    try {
      return { ...defaultProjectSettings, ...JSON.parse(localStorage.getItem("archive-desk-settings") || "{}") };
    } catch {
      return defaultProjectSettings;
    }
  });
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showStorageGuide, setShowStorageGuide] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [writingHistory, setWritingHistory] = useState<WritingDay[]>(() => {
    try { return JSON.parse(localStorage.getItem(`archive-desk-writing-history-${localStorage.getItem("archive-desk-active-project") || "harbor-town"}`) || localStorage.getItem("archive-desk-writing-history") || "[]"); } catch { return []; }
  });
  const lastTotalRef = useRef(0);
  const [selectedId, setSelectedId] = useState("scene-3");
  const [selectedIds, setSelectedIds] = useState<string[]>(["scene-3"]);
  const [view, setView] = useState<"write" | "outline">("write");
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState(true);
  const [autoSavedAt, setAutoSavedAt] = useState("");
  const autoSaveReadyRef = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [writingMode, setWritingMode] = useState<"horizontal" | "vertical">("horizontal");
  const [preview, setPreview] = useState(false);
  const selected = flatten(nodes).find((node) => node.id === selectedId) ?? flatten(nodes)[0];
  const allNodes = flatten(nodes);
  const overviewNodes = flattenWithDepth(nodes);
  const projectCount = allNodes.filter((node) => node.type === "chapter" || node.type === "scene").length;
  const totalCount = allNodes.filter((node) => node.type !== "part").reduce((sum, node) => sum + plainTextCount(node.content), 0);
  const totalTarget = Math.max(1, projectSettings.targetWords);
  const progress = Math.min(100, Math.round((totalCount / totalTarget) * 100));
  const remainingDays = Math.max(0, Math.ceil((new Date(`${projectSettings.deadline}T23:59:59`).getTime() - Date.now()) / 86400000));
  const dailyGoal = Math.max(0, projectSettings.dailyGoal || Math.ceil((totalTarget - totalCount) / Math.max(1, remainingDays)));
  const requiredDaily = Math.max(0, Math.ceil((totalTarget - totalCount) / Math.max(1, remainingDays)));
  const recentWriting = writingHistory.slice(-7);
  const recentAverage = recentWriting.length ? Math.round(recentWriting.reduce((sum, day) => sum + day.words, 0) / recentWriting.length) : 0;
  const forecastStatus = recentAverage === 0 ? "記録待ち" : recentAverage >= requiredDaily ? "達成見込み" : "要ペースアップ";
  const forecastTone = forecastStatus === "達成見込み" ? "on-track" : forecastStatus === "要ペースアップ" ? "needs-push" : "waiting";
  const forecastDays = recentAverage > 0 ? Math.ceil(Math.max(0, totalTarget - totalCount) / recentAverage) : null;
  const deadlineNotice = remainingDays <= 0 ? "締切日を過ぎています" : remainingDays <= 3 ? `締切まで${remainingDays}日です` : remainingDays <= 7 ? `締切まで${remainingDays}日。今週の執筆計画を確認しましょう` : "";
  const deadlineNoticeTone = remainingDays <= 3 ? "urgent" : "soon";
  const [history, setHistory] = useState<OutlineNode[][]>([]);
  const [future, setFuture] = useState<OutlineNode[][]>([]);
  const [treeMode, setTreeMode] = useState<"expanded" | "collapsed">("expanded");
  const [showProjects, setShowProjects] = useState(true);
  const [showReleasePanel, setShowReleasePanel] = useState(false);
  const [openFolderPath, setOpenFolderPath] = useState<string | null>(null);
  const [externalChangeFile, setExternalChangeFile] = useState<string | null>(null);
  const [externalDiff, setExternalDiff] = useState<{ fileName: string; before: string; after: string } | null>(null);
  const [snapshots, setSnapshots] = useState<Array<{ id: string; label: string; savedAt: string; content: string }>>(() => {
    try { return JSON.parse(localStorage.getItem("archive-desk-snapshots") || "[]"); } catch { return []; }
  });

  function commitStructure(next: OutlineNode[]) {
    const numbered = renumberOutline(next);
    setHistory((current) => [...current.slice(-19), nodes]);
    setFuture([]);
    setNodes(numbered);
    setSaved(false);
  }

  function undoStructure() {
    const previous = history[history.length - 1];
    if (!previous) return;
    setFuture((current) => [nodes, ...current]);
    setHistory((current) => current.slice(0, -1));
    setNodes(previous);
    setSelectedId(flatten(previous)[0]?.id ?? selectedId);
    toast.success("構成を元に戻しました");
  }

  function redoStructure() {
    const next = future[0];
    if (!next) return;
    setHistory((current) => [...current, nodes]);
    setFuture((current) => current.slice(1));
    setNodes(next);
    setSelectedId(flatten(next)[0]?.id ?? selectedId);
    toast.success("構成をやり直しました");
  }

  const filteredNodes = useMemo(() => query ? allNodes.filter((node) => `${node.title} ${node.summary}`.toLowerCase().includes(query.toLowerCase())) : [], [allNodes, query]);

  function persistProjectList(nextProjects: ProjectRecord[]) {
    setProjects(nextProjects);
    localStorage.setItem("archive-desk-project-list", JSON.stringify(nextProjects));
  }

  function captureActiveProject() {
    return { id: activeProjectId, ...projectSettings, nodes: cloneNodes(nodes), writingHistory };
  }

  function switchProject(projectId: string) {
    if (projectId === activeProjectId) return;
    const captured = captureActiveProject();
    const baseProjects = projects.map((project) => project.id === activeProjectId ? captured : project);
    const target = baseProjects.find((project) => project.id === projectId);
    if (!target) return;
    const targetNodes = target.nodes.length ? cloneNodes(target.nodes) : blankNodes(target.projectName);
    const nextProjects = baseProjects.map((project) => project.id === projectId ? { ...project, nodes: targetNodes } : project);
    persistProjectList(nextProjects);
    setActiveProjectId(projectId);
    localStorage.setItem("archive-desk-active-project", projectId);
    setNodes(targetNodes);
    setProjectSettings({ targetWords: target.targetWords, deadline: target.deadline, dailyGoal: target.dailyGoal, projectName: target.projectName, genre: target.genre, submissionTarget: target.submissionTarget, projectNote: target.projectNote });
    setWritingHistory(target.writingHistory || []);
    setSelectedId(flatten(targetNodes)[0]?.id ?? "");
    setSelectedIds([]);
    setHistory([]);
    setFuture([]);
    setSaved(true);
    toast.success(`${target.projectName}へ切り替えました`);
  }

  function archiveProject(projectId: string) {
    const target = projects.find((project) => project.id === projectId);
    if (!target) return;
    const nextProjects = projects.map((project) => project.id === projectId ? { ...project, archived: true } : project);
    persistProjectList(nextProjects);
    if (projectId === activeProjectId) {
      const nextVisible = nextProjects.find((project) => !project.archived);
      if (nextVisible) switchProject(nextVisible.id);
    }
    toast.success(`${target.projectName}をアーカイブしました`);
  }
  function restoreProject(projectId: string) {
    const nextProjects = projects.map((project) => project.id === projectId ? { ...project, archived: false } : project);
    persistProjectList(nextProjects);
    const target = nextProjects.find((project) => project.id === projectId);
    if (target) toast.success(`${target.projectName}を作品棚に戻しました`);
  }
  function deleteProject(projectId: string) {
    const target = projects.find((project) => project.id === projectId);
    if (!target || !window.confirm(`「${target.projectName}」を作品棚から完全に削除しますか？\nこの操作は元に戻せません。`)) return;
    const nextProjects = projects.filter((project) => project.id !== projectId);
    persistProjectList(nextProjects);
    if (projectId === activeProjectId) {
      const nextProject = nextProjects.find((project) => !project.archived) ?? nextProjects[0];
      if (nextProject) switchProject(nextProject.id);
    }
    toast.success(`${target.projectName}を削除しました`);
  }
  function addProject() {
    const project: ProjectRecord = { id: `project-${Date.now()}`, ...defaultProjectSettings, projectName: "新しい作品", nodes: blankNodes("新しい作品"), writingHistory: [] };
    const nextProjects = [...projects.map((item) => item.id === activeProjectId ? captureActiveProject() : item), project];
    persistProjectList(nextProjects);
    setActiveProjectId(project.id);
    localStorage.setItem("archive-desk-active-project", project.id);
    setNodes(cloneNodes(project.nodes));
    setProjectSettings({ targetWords: project.targetWords, deadline: project.deadline, dailyGoal: project.dailyGoal, projectName: project.projectName, genre: project.genre, submissionTarget: project.submissionTarget, projectNote: project.projectNote });
    setWritingHistory([]);
    const firstSceneId = flatten(project.nodes).find((node) => node.type === "scene")?.id ?? project.nodes[0]?.id ?? "";
    setSelectedId(firstSceneId);
    setSelectedIds(firstSceneId ? [firstSceneId] : []);
    setHistory([]);
    setFuture([]);
    setSaved(true);
    setShowStorageGuide(true);
    toast.success("新しい作品を追加しました");
  }

  useEffect(() => {
    if (lastTotalRef.current === 0) {
      lastTotalRef.current = totalCount;
      return;
    }
    const delta = totalCount - lastTotalRef.current;
    lastTotalRef.current = totalCount;
    if (delta <= 0) return;
    const date = new Date().toISOString().slice(0, 10);
    setWritingHistory((current) => {
      const existing = current.find((day) => day.date === date);
      const next = existing
        ? current.map((day) => day.date === date ? { ...day, words: day.words + delta } : day)
        : [...current, { date, words: delta }];
      const trimmed = next.slice(-14);
      localStorage.setItem(`archive-desk-writing-history-${activeProjectId}`, JSON.stringify(trimmed));
      setProjects((current) => {
        const next = current.map((project) => project.id === activeProjectId ? { ...project, ...projectSettings, nodes: cloneNodes(nodes), writingHistory: trimmed } : project);
        localStorage.setItem("archive-desk-project-list", JSON.stringify(next));
        return next;
      });
      return trimmed;
    });
  }, [totalCount]);

  useEffect(() => {
    if (!autoSaveReadyRef.current) {
      autoSaveReadyRef.current = true;
      return;
    }
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      const content = JSON.stringify(buildProjectPayload(), null, 2);
      localStorage.setItem("archive-desk-autosave", content);
      localStorage.setItem("archive-desk-project", content);
      if (window.archiveDesk?.writeFolder && openFolderPath) {
        await window.archiveDesk.writeFolder(openFolderPath, content);
      }
      const now = new Date();
      setAutoSavedAt(now.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }));
      setSaved(true);
    }, 900);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [nodes, projectSettings, writingHistory, activeProjectId, openFolderPath]);

  useEffect(() => {
    if (!window.archiveDesk?.onMenuAction) return;
    return window.archiveDesk.onMenuAction((action) => {
      if (action === "new-project") newProject();
      if (action === "open-project") void openProject();
      if (action === "save-project") void saveProject();
      if (action === "save-folder") void saveCompatibleFolder();
      if (action === "open-folder") void openCompatibleFolder();
    });
  }, []);

  useEffect(() => {
    if (!window.archiveDesk?.onExternalChange) return;
    return window.archiveDesk.onExternalChange(async (filename) => {
      setSaved(false);
      setExternalChangeFile(filename);
      const incoming = openFolderPath && window.archiveDesk?.readFolder ? await window.archiveDesk.readFolder(openFolderPath) : null;
      const changed = incoming?.files.find((file) => file.path.endsWith(String(filename)));
      setExternalDiff({ fileName: String(filename), before: selected.content, after: changed?.content ?? "外部ファイルを読み取れませんでした。" });
      toast.warning("外部で原稿が変更されました", { description: `${filename}を確認してから再読込してください` });
    });
  }, []);

  function saveSnapshot(label = "手動スナップショット") {
    const project = { version: 1, name: "海鳴りの町", savedAt: new Date().toISOString(), settings: projectSettings, nodes };
    const snapshot = { id: `snapshot-${Date.now()}`, label, savedAt: project.savedAt, content: JSON.stringify(project) };
    const next = [snapshot, ...snapshots].slice(0, 8);
    setSnapshots(next);
    localStorage.setItem("archive-desk-snapshots", JSON.stringify(next));
    toast.success("スナップショットを保存しました");
  }

  function restoreSnapshot(snapshot: { content: string; label: string }) {
    applyProjectContent(snapshot.content);
    setShowReleasePanel(false);
    toast.success(`${snapshot.label}を復元しました`);
  }

  function editContent(value: string) {
    setNodes(updateNode(nodes, selected.id, { content: value, status: value.trim() ? "writing" : "draft" }));
    setSaved(false);
  }

  function addScene() {
    const id = `scene-${Date.now()}`;
    const node: OutlineNode = { id, title: "新しいシーン", type: "scene", summary: "概要を入力してください。", content: "", status: "draft", target: 1800 };
    const next = updateNode(nodes, selected.id, { children: [...(selected.children ?? []), node] });
    setNodes(next);
    setSelectedId(id);
    toast.success("新しいシーンをアウトラインに追加しました");
  }

  function downloadFile(filename: string, content: string, type = "text/plain;charset=utf-8") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function saveCompatibleFolder() {
    const content = JSON.stringify(buildProjectPayload(), null, 2);
    if (window.archiveDesk?.saveFolder) {
      const savedToFolder = await window.archiveDesk.saveFolder(content);
      if (!savedToFolder) return;
      setOpenFolderPath(savedToFolder.folderPath);
      await window.archiveDesk.watchFolder(savedToFolder.folderPath);
      localStorage.setItem("archive-desk-project", content);
      setSaved(true);
      toast.success("互換フォルダーへ保存しました", { description: "manuscript/以下をVS Code・Obsidianで開けます" });
      return;
    }
    toast.info("互換フォルダー保存はWindowsアプリで利用できます", { description: "ブラウザー版では通常のJSON保存を使用してください" });
  }

  async function openCompatibleFolder() {
    if (!window.archiveDesk?.openFolder) {
      toast.info("互換フォルダーを開く操作はWindowsアプリで利用できます");
      return;
    }
    const result = await window.archiveDesk.openFolder();
    if (result) {
      setOpenFolderPath(result.folderPath);
      await window.archiveDesk.watchFolder(result.folderPath);
      applyProjectContent(result.content, result.files || []);
    } else toast.error("プロジェクト情報が見つかりません", { description: ".archive-desk/project.jsonを含むフォルダーを選択してください" });
  }

  async function saveProject() {
    const content = JSON.stringify(buildProjectPayload(), null, 2);
    localStorage.setItem("archive-desk-project", content);
    if (window.archiveDesk?.saveProject) {
      const savedToDisk = await window.archiveDesk.saveProject(content);
      if (!savedToDisk) return;
    } else {
      downloadFile("海鳴りの町.archive.json", content, "application/json;charset=utf-8");
    }
    setSaved(true);
    toast.success("プロジェクトを保存しました", { description: "構成・本文・進捗情報を保存" });
  }

  function newProject() {
    setProjectSettings(defaultProjectSettings);
    localStorage.setItem("archive-desk-settings", JSON.stringify(defaultProjectSettings));
    setNodes(initialNodes);
    setSelectedId(initialNodes[0]?.id ?? "");
    setSelectedIds(initialNodes[0]?.id ? [initialNodes[0].id] : []);
    setOpenFolderPath(null);
    setHistory([]);
    setFuture([]);
    setSaved(false);
    toast.success("新規プロジェクトを作成しました", { description: "サンプル構成を編集して執筆を始められます" });
  }

  function saveProjectSettings(next: ProjectSettings) {
    const normalized: ProjectSettings = {
      targetWords: Math.max(1, Math.round(next.targetWords || 1)),
      deadline: next.deadline || defaultProjectSettings.deadline,
      dailyGoal: Math.max(0, Math.round(next.dailyGoal || 0)),
      projectName: next.projectName.trim() || defaultProjectSettings.projectName,
      genre: next.genre.trim() || defaultProjectSettings.genre,
      submissionTarget: next.submissionTarget.trim() || defaultProjectSettings.submissionTarget,
      projectNote: next.projectNote.trim(),
    };
    setProjectSettings(normalized);
    localStorage.setItem("archive-desk-settings", JSON.stringify(normalized));
    persistProjectList(projects.map((project) => project.id === activeProjectId ? { id: activeProjectId, ...normalized, nodes: cloneNodes(nodes), writingHistory } : project));
    setSaved(false);
    toast.success("執筆設定を更新しました", { description: "進捗カードと次回保存へ反映されます" });
  }

  function buildProjectPayload() {
    const currentProject = captureActiveProject();
    const savedProjects = projects.map((project) => project.id === activeProjectId ? currentProject : project);
    return { version: 2, name: projectSettings.projectName, savedAt: new Date().toISOString(), settings: projectSettings, nodes, writingHistory, projects: savedProjects, activeProjectId, selectedId };
  }
  function mergeMarkdownIntoNodes(baseNodes: OutlineNode[], files: Array<{ path: string; content: string }>) {
    const byId = new Map<string, string>();
    files.forEach((file) => {
      const match = file.content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
      const id = match?.[1].match(/^archive_desk_id:\s*(.+)$/m)?.[1]?.trim();
      if (id) byId.set(id, file.content.slice(match?.[0].length ?? 0).replace(/\n$/, ""));
    });
    const update = (items: OutlineNode[]): OutlineNode[] => items.map((node) => ({ ...node, content: byId.has(node.id) ? byId.get(node.id)! : node.content, children: node.children ? update(node.children) : node.children }));
    return files.length ? update(baseNodes) : baseNodes;
  }
  function applyProjectContent(content: string, externalFiles: Array<{ path: string; content: string }> = []) {
    try {
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed.nodes)) throw new Error("nodes missing");
      const nextSettings = { ...defaultProjectSettings, ...(parsed.settings ?? {}) };
      const nextNodes = mergeMarkdownIntoNodes(parsed.nodes, externalFiles);
      setProjectSettings(nextSettings);
      localStorage.setItem("archive-desk-settings", JSON.stringify(nextSettings));
      setNodes(nextNodes);
      if (Array.isArray(parsed.writingHistory)) {
        setWritingHistory(parsed.writingHistory);
        localStorage.setItem(`archive-desk-writing-history-${parsed.activeProjectId || activeProjectId}`, JSON.stringify(parsed.writingHistory));
      }
      if (Array.isArray(parsed.projects)) {
        setProjects(parsed.projects);
        localStorage.setItem("archive-desk-project-list", JSON.stringify(parsed.projects));
      }
      if (parsed.activeProjectId) {
        setActiveProjectId(parsed.activeProjectId);
        localStorage.setItem("archive-desk-active-project", parsed.activeProjectId);
      }
      const firstId = parsed.selectedId && flatten(nextNodes).some((node) => node.id === parsed.selectedId) ? parsed.selectedId : flatten(nextNodes)[0]?.id ?? "";
      setSelectedId(firstId);
      setSelectedIds(firstId ? [firstId] : []);
      setSaved(true);
      toast.success("プロジェクトを読み込みました");
    } catch {
      toast.error("読み込みに失敗しました", { description: "Archive DeskのプロジェクトJSONを選択してください" });
    }
  }

  async function openProject() {
    if (window.archiveDesk?.openProject) {
      const content = await window.archiveDesk.openProject();
      if (content) applyProjectContent(content);
      return;
    }
    fileInputRef.current?.click();
  }

  function loadProject(file: File) {
    const reader = new FileReader();
    reader.onload = () => applyProjectContent(String(reader.result));
    reader.readAsText(file);
  }

  async function exportDocx() {
    const paragraphs: Paragraph[] = [];
    allNodes.filter((node) => node.type !== "part" && node.content.trim()).forEach((node) => {
      paragraphs.push(new Paragraph({ children: [new TextRun({ text: node.title, bold: true })] }));
      node.content.split(/\n+/).filter(Boolean).forEach((line) => paragraphs.push(new Paragraph({ children: [new TextRun(line.replace(/｜([^《]+)《([^》]+)》/g, "$1（$2）"))] })));
    });
    const doc = new Document({ sections: [{ children: paragraphs }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "海鳴りの町_完成原稿.docx";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("DOCXを書き出しました");
  }

  function exportManuscript() {
    const selectedText = allNodes.filter((node) => node.type !== "part" && node.content.trim()).map((node) => node.content.trim()).join("\n\n");
    downloadFile("海鳴りの町_完成原稿.txt", selectedText);
    toast.success("完成原稿を書き出しました", { description: `${selectedText.length.toLocaleString()}文字を1本のテキストに結合` });
  }

  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup"><div className="brand-mark"><img src="/manus-storage/archive-desk-logo_58905483.png" alt="" /></div><div><p className="eyebrow">長編執筆 / 編集机</p><h1>統合Windowsエディタ</h1></div></div>
        <div className="work-context">{!showProjects && <button className="column-toggle top-column-toggle" onClick={() => setShowProjects(true)} aria-label="作品棚を展開"><PanelLeftOpen size={15} /></button>}<span className="context-dot" /><span>{projectSettings.projectName}</span><span className="slash">/</span><span>{projectSettings.genre}</span></div>
        <div className="top-actions"><span className="save-state"><span className={`save-dot ${saved ? "saved" : "unsaved"}`} />{saved ? "保存済み" : "未保存"}{autoSavedAt && <small>自動保存 {autoSavedAt}</small>}</span><button className="settings-launch" aria-label="作品設定・目標を開く" onClick={() => setShowSettingsPanel(true)}><Settings2 size={15} /><span>作品設定・目標</span></button><button className="icon-button" aria-label="版情報と履歴" onClick={() => setShowReleasePanel(true)}><History size={17} /></button></div>
      </header>

      <div className={`app-body ${showProjects ? "" : "projects-collapsed"}`}>
        <aside className="project-rail">
          <div className="rail-heading"><span>作品棚</span><div className="rail-actions"><button className="mini-button" aria-label="作品棚を折りたたむ" onClick={() => setShowProjects(false)}><PanelLeftClose size={14} /></button><button className="mini-button" aria-label="作品追加" onClick={addProject}><Plus size={14} /></button></div></div>
          {projects.filter((project) => !project.archived).map((project) => { const projectWords = project.id === activeProjectId ? totalCount : project.nodes.filter((node) => node.type !== "part").reduce((sum, node) => sum + plainTextCount(node.content), 0); const projectProgress = Math.min(100, Math.round((projectWords / Math.max(1, project.targetWords)) * 100)); return <div className="project-card-wrap" key={project.id}><button className={`project-card ${project.id === activeProjectId ? "active" : ""}`} onClick={() => switchProject(project.id)}><span className="project-glyph">{project.id === activeProjectId ? <BookOpen size={13} /> : <FolderOpen size={13} />}</span><div className="project-card-copy"><strong>{project.projectName}</strong><span>{project.genre}　·　締切 {Math.max(0, Math.ceil((new Date(`${project.deadline}T23:59:59`).getTime() - Date.now()) / 86400000))}日後</span></div><div className="project-card-side"><span className="project-menu"><MoreHorizontal size={14} /></span><div className="mini-progress"><span style={{ width: `${projectProgress}%` }} /></div><div className="project-meta"><span>{projectProgress}%</span><span>{projectWords.toLocaleString()}字</span></div></div></button><div className="project-card-actions"><button onClick={() => archiveProject(project.id)} aria-label={`${project.projectName}をアーカイブ`}>アーカイブ</button><button onClick={() => deleteProject(project.id)} aria-label={`${project.projectName}を削除`}><Trash2 size={11} /></button></div></div>; })}
          <div className="shelf-secondary-actions"><button className="new-project" onClick={addProject}><Plus size={15} /> 新しい作品</button><button className="show-archived" onClick={() => setShowArchived((value) => !value)}>{showArchived ? "アーカイブを隠す" : "アーカイブを表示"}</button></div>
          {showArchived && <div className="archived-list"><div className="archived-heading">アーカイブ済み</div>{projects.filter((project) => project.archived).map((project) => <div className="archived-row" key={project.id}><span>{project.projectName}</span><button onClick={() => restoreProject(project.id)}>復元</button><button onClick={() => deleteProject(project.id)} aria-label={`${project.projectName}を完全に削除`}><Trash2 size={11} /></button></div>)}</div>}
          <div className="rail-note"><span className="note-pin">✦</span><p>構成を動かす。<br />原稿も動く。</p></div>
        </aside>

        <section className="outline-pane">
          <div className="pane-header"><div><p className="eyebrow">作品構成</p><h2>構成アウトライン</h2></div><button className="icon-button subtle"><Menu size={17} /></button></div><div className="outline-overview"><div className="outline-overview-copy"><span>構成概要</span><strong>全{allNodes.filter((node) => node.type === "part").length}部・全{allNodes.filter((node) => node.type === "chapter").length}章・全{allNodes.filter((node) => node.type === "scene").length}シーン</strong></div><small>並べ替えた順番で書き出します</small></div>
          <div className="outline-toolbar"><button className={view === "write" ? "tab active" : "tab"} onClick={() => setView("write")}><BookOpen size={14} /> 執筆</button><button className={view === "outline" ? "tab active" : "tab"} onClick={() => setView("outline")}><LayoutList size={14} /> 俯瞰</button><span className="toolbar-spacer" /><button className="icon-button subtle" onClick={undoStructure} disabled={!history.length} aria-label="元に戻す"><ArrowUp size={14} /></button><button className="icon-button subtle" onClick={redoStructure} disabled={!future.length} aria-label="やり直す"><ArrowDown size={14} /></button><button className="tree-action" onClick={() => setTreeMode("expanded")}><ChevronDown size={12} /> 全展開</button><button className="tree-action" onClick={() => setTreeMode("collapsed")}><ChevronRight size={12} /> 全折りたたみ</button><button className="icon-button subtle"><Search size={15} /></button></div>
          {view === "outline" && <div className="overview-list">{overviewNodes.map(({ node, depth }) => <button className={`overview-card ${selectedId === node.id ? "selected" : ""}`} style={{ marginLeft: `${Math.min(depth, 3) * 12}px` }} key={node.id} onClick={() => { setSelectedId(node.id); setSelectedIds([node.id]); setView("write"); }}><div className="overview-card-head"><span className={`outline-kicker ${node.type}`}>{node.type === "part" ? "部" : node.type === "chapter" ? "章" : "シーン"}</span><strong>{node.title}</strong><span className={`status-dot ${node.status}`} /></div><p>{node.summary || "概要未入力"}</p><div className="overview-card-meta"><span>{nodeCount(node).toLocaleString()}字</span><span>目標 {node.target.toLocaleString()}字</span><span>{node.status === "done" ? "完成" : node.status === "writing" ? "執筆中" : "構想中"}</span></div></button>)}</div>}<div className={`outline-search ${view === "outline" ? "view-hidden" : ""}`}><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="章・シーンを検索" /></div>
          <div className={`outline-list ${view === "outline" ? "view-hidden" : ""}`}>
            {query ? filteredNodes.map((node) => <div key={node.id} className="search-result" onClick={() => { setSelectedId(node.id); setQuery(""); }}><span className={`status-dot ${node.status}`} /><span>{node.title}</span><small>{node.summary}</small></div>) : nodes.map((node) => <OutlineRow key={node.id} node={node} depth={0} selectedId={selectedId} selectedIds={selectedIds} treeMode={treeMode} onSelect={(id, multi) => { if (multi) { setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); } else { setSelectedIds([id]); setSelectedId(id); } }} onMove={(id, direction) => commitStructure(moveNode(nodes, id, direction))} onDrop={(draggedId, targetId) => { commitStructure(reorderTree(nodes, draggedId, targetId));     setSelectedId(draggedId); toast.success("アウトラインの順序と節番号を更新しました"); }} />)}
          </div>
          <button className={`add-scene ${view === "outline" ? "view-hidden" : ""}`} onClick={addScene}><Plus size={14} /> シーンを追加</button>
        </section>

        <section className="editor-pane">
          <div className="editor-toolbar"><div className="breadcrumb"><span>{selected.type === "scene" ? "SCENE" : selected.type.toUpperCase()}</span><ChevronRight size={13} /><strong>{selected.title}</strong></div><div className="editor-actions"><button className="toolbar-button" onClick={saveProject}><Save size={14} /> JSON保存</button><button className="toolbar-button" onClick={openProject}><FolderOpen size={14} /> JSONを開く</button><button className="toolbar-button compatible-button" onClick={saveCompatibleFolder}><Archive size={14} /> 互換保存</button><button className="toolbar-button" onClick={openCompatibleFolder}><FolderOpen size={14} /> 互換を開く</button><button className="toolbar-button" onClick={() => setWritingMode(writingMode === "horizontal" ? "vertical" : "horizontal")}>{writingMode === "horizontal" ? "縦書き" : "横書き"}</button><button className="toolbar-button" onClick={() => setPreview(!preview)}>{preview ? "編集" : "プレビュー"}</button><button className="toolbar-button" onClick={exportDocx}>DOCX</button><input ref={fileInputRef} type="file" accept=".json,.archive.json" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) loadProject(file); event.currentTarget.value = ""; }} /><button className="export-button" onClick={exportManuscript}><FileOutput size={14} /> 完成原稿を書き出す</button></div></div>
          {externalChangeFile && <div className="external-change-banner"><div><strong>外部変更を検知しました</strong><span>{externalChangeFile} が変更されています。現在の編集を保持するか、差分を確認して再読込してください。</span></div><div className="external-change-actions"><button onClick={() => { setExternalChangeFile(null); setExternalDiff(null); toast.info("現在の編集を保持しました"); }}>保持</button><button onClick={() => setExternalDiff(externalDiff)}>差分</button><button className="primary" onClick={async () => { setExternalChangeFile(null); setExternalDiff(null); await openCompatibleFolder(); }}>再読込</button></div></div>}
          <div className="paper-wrap"><div className="manuscript-header"><span>海鳴りの町　/　{selected.title}</span><span>{plainTextCount(selected.content).toLocaleString()}字</span></div><input className="scene-title-input" value={selected.title} onChange={(event) => { setNodes(updateNode(nodes, selected.id, { title: event.target.value })); setSaved(false); }} /><p className="scene-summary"><Sparkles size={13} /> {selected.summary}</p>{preview ? <div className="manuscript-preview" style={{ writingMode: writingMode === "vertical" ? "vertical-rl" : "horizontal-tb", textOrientation: "mixed" }}>{markdownPreview(selected.content)}</div> : <textarea className="manuscript-editor" style={{ writingMode: writingMode === "vertical" ? "vertical-rl" : "horizontal-tb", textOrientation: "mixed" }} value={selected.content} onChange={(event) => editContent(event.target.value)} placeholder="ここから物語を書き始める…" spellCheck={false} />}<div className="paper-footer"><span>{preview ? "プレビュー表示" : "自動保存オン"}</span><span>UTF-8　·　Markdown</span><span>行 {selected.content.split("\n").length}　列 1</span></div></div>
        </section>

        <aside className="insight-pane">
          <div className="insight-heading"><div><p className="eyebrow">編集控え</p><h2>作品の現在地</h2></div><WandSparkles size={17} className="ink-icon" /></div>
          {deadlineNotice && <button className={`deadline-notice ${deadlineNoticeTone}`} onClick={() => setShowSettingsPanel(true)}><Target size={14} /><span><strong>{deadlineNotice}</strong><small>{projectSettings.submissionTarget} / 設定を確認</small></span><ChevronRight size={14} /></button>}
          <section className="progress-card"><div className="card-label"><Target size={14} /> 応募締切 <span>{remainingDays}日後</span></div><div className="target-number">{totalCount.toLocaleString()} <small>/ {totalTarget.toLocaleString()}字</small></div><div className="large-progress"><span style={{ width: `${progress}%` }} /></div><div className="progress-caption"><strong>{progress}%</strong><span>目標まであと {(totalTarget - totalCount).toLocaleString()}字</span></div></section>
          <section className="daily-card"><div className="card-label"><Timer size={14} /> 今日の進み <span>{projectSettings.deadline}</span></div><div className="daily-main"><strong>{dailyGoal.toLocaleString()}</strong><span>字 / 日</span><div className="pace-badge"><Check size={12} /> 設定値</div></div><p>締切までに必要な1日あたりの目安です。</p></section><section className={`forecast-card ${forecastTone}`}><div className="card-label"><Target size={14} /> 締切達成見込み <span>{forecastStatus}</span></div><div className="forecast-main"><strong>{forecastDays ? `${forecastDays}日` : "—"}</strong><span>現在の平均ペース</span></div><p>{forecastStatus === "達成見込み" ? `直近${recentWriting.length}日間の平均${recentAverage.toLocaleString()}字/日なら、締切に間に合う見込みです。` : forecastStatus === "要ペースアップ" ? `直近平均は${recentAverage.toLocaleString()}字/日です。必要ペースの${requiredDaily.toLocaleString()}字/日を目安にしてください。` : "本文を編集すると日別の執筆履歴が記録されます。"}</p></section><section className="history-card"><div className="card-label"><LayoutList size={14} /> 日別執筆履歴 <span>直近7日</span></div><div className="history-chart" aria-label="直近7日間の日別執筆文字数">{recentWriting.length ? recentWriting.map((day) => { const max = Math.max(...recentWriting.map((item) => item.words), 1); return <div className="history-bar-wrap" key={day.date} title={`${day.date}：${day.words.toLocaleString()}字`}><span className="history-value">{day.words.toLocaleString()}</span><div className="history-bar" style={{ height: `${Math.max(8, Math.round((day.words / max) * 70))}px` }} /><small>{day.date.slice(5)}</small></div>; }) : <p className="history-empty">執筆すると日別の記録が表示されます。</p>}</div></section>
          <section className="metadata-card"><div className="card-label"><Settings2 size={14} /> 選択中のメモ</div><label>ステータス<select value={selected.status} onChange={(event) => setNodes(updateNode(nodes, selected.id, { status: event.target.value as OutlineNode["status"] }))}><option value="draft">構想中</option><option value="writing">執筆中</option><option value="done">完成</option></select></label><label>このシーンの目標<input type="number" value={selected.target} onChange={(event) => setNodes(updateNode(nodes, selected.id, { target: Number(event.target.value) }))} /> <span className="unit">字</span></label><label className="metadata-block">概要<textarea value={selected.summary} onChange={(event) => setNodes(updateNode(nodes, selected.id, { summary: event.target.value }))} /></label><label className="metadata-block">登場人物<input value={selected.characters ?? ""} placeholder="例：主人公、灯台守" onChange={(event) => setNodes(updateNode(nodes, selected.id, { characters: event.target.value }))} /></label><label className="metadata-block">場所<input value={selected.location ?? ""} placeholder="例：海沿いの坂道" onChange={(event) => setNodes(updateNode(nodes, selected.id, { location: event.target.value }))} /></label><label className="metadata-block">伏線・回収<input value={selected.threads ?? ""} placeholder="例：青い封筒" onChange={(event) => setNodes(updateNode(nodes, selected.id, { threads: event.target.value }))} /></label><div className="tag-row"><span className="tag">#灯台</span><span className="tag">#記憶</span><button className="tag-add"><Plus size={12} /></button></div></section>
          <div className="insight-footer"><span>原稿項目</span><strong>{projectCount}項目</strong><span>最終スナップショット</span><strong>今日 09:42</strong></div>
        </aside>
      </div>
      {showStorageGuide && <div className="release-overlay" role="dialog" aria-modal="true" aria-label="作品の保存先"><div className="release-panel storage-guide-panel"><div className="release-panel-head"><div><p className="eyebrow">新しい作品 / 保存方式</p><h2>作品の保存先を設定</h2></div><button className="icon-button" onClick={() => setShowStorageGuide(false)} aria-label="保存先案内を閉じる"><X size={18} /></button></div><p className="storage-guide-lead">このエディタは、本文を独自形式に閉じ込めず、プレーンテキストのMarkdownで保存します。構成・進捗・締切などの執筆情報は、別の管理データとして保持します。</p><div className="storage-guide-grid"><div><strong>互換フォルダー</strong><p>manuscript/に本文Markdown、.archive-desk/project.jsonに構成・進捗を保存します。VS Code、Obsidian、GitHubで扱えます。</p></div><div><strong>JSONファイル</strong><p>作品全体の状態を一つにまとめたバックアップです。互換フォルダー内にもproject.jsonとして含まれます。</p></div></div><p className="storage-guide-note">iCloudがない場合も、このPCの任意のフォルダーを保存先に指定できます。保存先を後で決める場合は、アプリ内のローカル自動保存が先に働きます。</p><div className="diff-footer"><span>保存先は後から「互換保存」で変更できます。</span><div className="storage-guide-actions"><button className="toolbar-button" onClick={() => setShowStorageGuide(false)}>後で設定</button><button className="release-restore" onClick={async () => { setShowStorageGuide(false); await saveCompatibleFolder(); }}>保存先を選ぶ</button></div></div></div></div>}
      {showSettingsPanel && <div className="release-overlay" role="dialog" aria-modal="true" aria-label="執筆設定"><div className="release-panel settings-panel"><div className="release-panel-head"><div><p className="eyebrow">作品設定 / 進捗</p><h2>執筆目標を設定</h2></div><button className="icon-button" onClick={() => setShowSettingsPanel(false)} aria-label="設定を閉じる"><X size={18} /></button></div><p className="settings-intro">作品全体の目標と締切を設定すると、右側の進捗カードと1日あたりの必要ペースが更新されます。</p><div className="settings-form"><label>作品名<span className="settings-field"><input type="text" value={projectSettings.projectName} onChange={(event) => setProjectSettings((current) => ({ ...current, projectName: event.target.value }))} /></span></label><label>ジャンル<span className="settings-field"><input type="text" value={projectSettings.genre} placeholder="例：長編ミステリー" onChange={(event) => setProjectSettings((current) => ({ ...current, genre: event.target.value }))} /></span></label><label>応募先<span className="settings-field"><input type="text" value={projectSettings.submissionTarget} placeholder="例：小説新人賞" onChange={(event) => setProjectSettings((current) => ({ ...current, submissionTarget: event.target.value }))} /></span></label><label>作品全体の目標文字数<span className="settings-field"><input type="number" min="1" step="100" value={projectSettings.targetWords} onChange={(event) => setProjectSettings((current) => ({ ...current, targetWords: Number(event.target.value) }))} /><em>字</em></span></label><label>締切日<span className="settings-field"><input type="date" value={projectSettings.deadline} onChange={(event) => setProjectSettings((current) => ({ ...current, deadline: event.target.value }))} /></span></label><label>1日あたりの執筆目標<span className="settings-field"><input type="number" min="0" step="50" value={projectSettings.dailyGoal} onChange={(event) => setProjectSettings((current) => ({ ...current, dailyGoal: Number(event.target.value) }))} /><em>字 / 日</em></span></label><label className="settings-block">作品メモ<textarea value={projectSettings.projectNote} placeholder="作品の方向性や応募要項のメモ" onChange={(event) => setProjectSettings((current) => ({ ...current, projectNote: event.target.value }))} /></label></div><div className="settings-summary"><span>現在の文字数<strong>{totalCount.toLocaleString()}字</strong></span><span>残り<strong>{Math.max(0, totalTarget - totalCount).toLocaleString()}字</strong></span><span>締切まで<strong>{remainingDays}日</strong></span></div><div className="diff-footer"><span>設定はプロジェクトJSONと互換フォルダー保存に含まれます。</span><button className="release-restore" onClick={() => { saveProjectSettings(projectSettings); setShowSettingsPanel(false); }}>設定を保存</button></div></div></div>}
      {externalDiff && <div className="release-overlay" role="dialog" aria-modal="true" aria-label="外部変更の差分"><div className="release-panel diff-panel"><div className="release-panel-head"><div><p className="eyebrow">外部変更 / 差分</p><h2>{externalDiff.fileName}</h2></div><button className="icon-button" onClick={() => setExternalDiff(null)} aria-label="差分を閉じる"><X size={18} /></button></div><div className="diff-grid"><section><span>現在の編集</span><pre>{externalDiff.before || "（空）"}</pre></section><section><span>外部ファイル</span><pre>{externalDiff.after || "（空）"}</pre></section></div><div className="diff-footer"><span>内容を確認後、「再読込」または「保持」を選択してください。</span><button className="release-restore" onClick={() => { setExternalDiff(null); setExternalChangeFile(null); openCompatibleFolder(); }}>外部内容を再読込</button></div></div></div>}
      {showReleasePanel && <div className="release-overlay" role="dialog" aria-modal="true" aria-label="版情報と変更履歴"><div className="release-panel"><div className="release-panel-head"><div><p className="eyebrow">版情報 / 履歴</p><h2>改定を安全に試す</h2></div><button className="icon-button" onClick={() => setShowReleasePanel(false)} aria-label="閉じる"><X size={18} /></button></div><div className="release-current"><span className="release-badge">CURRENT</span><div><strong>即利用版 0.3.0</strong><p>Markdown互換、長編アウトライン、縦書き、DOCX、Electron保存を含む安定版。</p></div><button className="release-restore" onClick={() => saveSnapshot()}><Save size={13} /> 現在を保存</button></div><div className="release-list"><div className="release-item"><div><strong>0.3.0　即利用版</strong><span>現在の安定版 · 今日保存</span></div><button className="release-restore" onClick={() => toast.info("現在の安定版を使用中です") }><Check size={13} /> 使用中</button></div><div className="release-item muted"><div><strong>0.1.0　初回試作</strong><span>基本エディタ・アウトライン・進捗管理</span></div><button className="release-restore" onClick={() => toast.info("初回試作へ戻す場合はプロジェクトフォルダーを複製してください")}><RotateCcw size={13} /> 手順</button></div>{snapshots.map((snapshot) => <div className="release-item" key={snapshot.id}><div><strong>{snapshot.label}</strong><span>{new Date(snapshot.savedAt).toLocaleString("ja-JP")}</span></div><button className="release-restore" onClick={() => restoreSnapshot(snapshot)}><RotateCcw size={13} /> 復元</button></div>)}</div><p className="release-note">改定前にプロジェクトフォルダーを複製し、アプリ内スナップショットとチェックポイントを残してください。</p></div></div>}
    </main>
  );
}
