const { app, BrowserWindow, dialog, ipcMain, Menu } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const { execFile, spawn } = require("node:child_process");
const nativeFs = require("node:fs");

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: "#f6f4ef",
    title: "統合Windowsエディタ — Archive Desk",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  createApplicationMenu(win);
  win.loadFile(path.join(__dirname, "../dist/public/index.html"));
}

function createApplicationMenu(win) {
  const send = (action) => win.webContents.send("archive-desk:menu-action", action);
  const template = [
    {
      label: "ファイル",
      submenu: [
        { label: "新規プロジェクト", accelerator: "Ctrl+N", click: () => send("new-project") },
        { label: "プロジェクトを開く", accelerator: "Ctrl+O", click: () => send("open-project") },
        { type: "separator" },
        { label: "保存", accelerator: "Ctrl+S", click: () => send("save-project") },
        { label: "互換フォルダーへ保存", accelerator: "Ctrl+Shift+S", click: () => send("save-folder") },
        { label: "互換フォルダーを開く", click: () => send("open-folder") },
        { type: "separator" },
        { role: "quit", label: "終了" },
      ],
    },
    {
      label: "編集",
      submenu: [
        { role: "undo", label: "元に戻す" },
        { role: "redo", label: "やり直す" },
        { type: "separator" },
        { role: "cut", label: "切り取り" },
        { role: "copy", label: "コピー" },
        { role: "paste", label: "貼り付け" },
      ],
    },
    { role: "viewMenu", label: "表示" },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

let activeWatcher = null;

function runCommand(command, args, cwd) {
  return new Promise((resolve) => {
    execFile(command, args, { cwd, windowsHide: true, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      resolve({ ok: !error, stdout: String(stdout || ""), stderr: String(stderr || ""), error: error ? String(error.message || error) : "" });
    });
  });
}

function commandFailure(result, fallback) {
  return String(result.stderr || result.stdout || result.error || fallback).trim();
}

function ghExecutable() {
  if (process.platform === "win32") {
    const candidates = ["C:\\Program Files\\GitHub CLI\\gh.exe", "C:\\Program Files (x86)\\GitHub CLI\\gh.exe"];
    const installed = candidates.find((candidate) => nativeFs.existsSync(candidate));
    if (installed) return installed;
  }
  return "gh";
}

function runGh(args, cwd) {
  return runCommand(ghExecutable(), args, cwd);
}

function safeSegment(value, fallback) {
  const cleaned = String(value || fallback).replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").trim();
  return cleaned || fallback;
}

function nodeFileName(node, index) {
  return `${String(index + 1).padStart(2, "0")}_${safeSegment(node.title, "無題")}.md`;
}

async function writeNodeFiles(root, nodes, parentParts = []) {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    const folder = path.join(root, "manuscript", ...parentParts);
    await fs.mkdir(folder, { recursive: true });
    const frontmatter = [
      "---",
      `archive_desk_id: ${node.id}`,
      `type: ${node.type}`,
      `status: ${node.status}`,
      `target: ${node.target || 0}`,
      `summary: ${JSON.stringify(node.summary || "")}`,
      `characters: ${JSON.stringify(node.characters || "")}`,
      `location: ${JSON.stringify(node.location || "")}`,
      `threads: ${JSON.stringify(node.threads || "")}`,
      "---",
      "",
    ].join("\n");
    await fs.writeFile(path.join(folder, nodeFileName(node, index)), `${frontmatter}${node.content || ""}\n`, "utf8");
    if (node.children?.length) {
      await writeNodeFiles(root, node.children, [...parentParts, `${String(index + 1).padStart(2, "0")}_${safeSegment(node.title, "無題")}`]);
    }
  }
}

async function collectMarkdownFiles(root) {
  const files = [];
  async function walk(current, relative = "") {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === ".archive-desk") continue;
      const absolute = path.join(current, entry.name);
      const rel = path.join(relative, entry.name);
      if (entry.isDirectory()) await walk(absolute, rel);
      else if (entry.name.toLowerCase().endsWith(".md")) files.push({ path: rel.replaceAll(path.sep, "/"), content: await fs.readFile(absolute, "utf8") });
    }
  }
  await walk(path.join(root, "manuscript"), "manuscript");
  return files;
}

async function writeCompatibleFolder(folderPath, content) {
  const project = JSON.parse(content);
  await fs.mkdir(folderPath, { recursive: true });
  await fs.mkdir(path.join(folderPath, ".archive-desk"), { recursive: true });
  await fs.writeFile(path.join(folderPath, ".archive-desk", "project.json"), content, "utf8");
  await writeNodeFiles(folderPath, Array.isArray(project.nodes) ? project.nodes : []);
  const readme = `# ${project.name || "小説プロジェクト"}\n\nこのフォルダーはMarkdownを本文とする小説プロジェクトです。VS Codeでフォルダーを開くか、Obsidianでこのフォルダーを保管庫として開けます。\n\n本文は manuscript/ 以下に、アウトライン順のMarkdownファイルとして保存されています。編集情報は各MarkdownのYAML frontmatterと .archive-desk/project.json に保存されます。\n`;
  await fs.writeFile(path.join(folderPath, "README.md"), readme, "utf8");
}

ipcMain.handle("archive-desk:open-project", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "Archive Desk project", extensions: ["json"] }],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  return fs.readFile(result.filePaths[0], "utf8");
});

ipcMain.handle("archive-desk:save-project", async (_event, content) => {
  const result = await dialog.showSaveDialog({
    defaultPath: "海鳴りの町.archive.json",
    filters: [{ name: "Archive Desk project", extensions: ["json"] }],
  });
  if (result.canceled || !result.filePath) return false;
  await fs.writeFile(result.filePath, content, "utf8");
  return true;
});

ipcMain.handle("archive-desk:write-folder", async (_event, folderPath, content) => {
  if (!folderPath || typeof content !== "string") return false;
  try {
    await writeCompatibleFolder(folderPath, content);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle("archive-desk:open-folder", async () => {
  const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
  if (result.canceled || !result.filePaths[0]) return null;
  const projectPath = path.join(result.filePaths[0], ".archive-desk", "project.json");
  try {
    return { content: await fs.readFile(projectPath, "utf8"), files: await collectMarkdownFiles(result.filePaths[0]), folderPath: result.filePaths[0] };
  } catch {
    return null;
  }
});

ipcMain.handle("archive-desk:save-folder", async (_event, content) => {
  const result = await dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"] });
  if (result.canceled || !result.filePaths[0]) return false;
  await writeCompatibleFolder(result.filePaths[0], content);
  return { saved: true, folderPath: result.filePaths[0] };
});

ipcMain.handle("archive-desk:read-folder", async (_event, folderPath) => {
  try {
    return {
      projectContent: await fs.readFile(path.join(folderPath, ".archive-desk", "project.json"), "utf8"),
      files: await collectMarkdownFiles(folderPath),
    };
  } catch {
    return null;
  }
});

ipcMain.handle("archive-desk:github-login", async () => {
  try {
    const gh = ghExecutable();
    const child = process.platform === "win32"
      ? spawn("cmd.exe", ["/c", `"${gh}" auth login`], { detached: true, stdio: "ignore", windowsHide: false })
      : spawn(gh, ["auth", "login"], { detached: true, stdio: "ignore" });
    child.unref();
    return { started: true };
  } catch (error) {
    return { started: false, message: String(error?.message || error) };
  }
});

ipcMain.handle("archive-desk:github-status", async (_event, folderPath) => {
  if (!folderPath) return { connected: false, authenticated: false, message: "互換フォルダーを先に開いてください。" };
  const root = await runCommand("git", ["-C", folderPath, "rev-parse", "--show-toplevel"], folderPath);
  if (!root.ok) return { connected: false, authenticated: false, message: "この互換フォルダーはGitリポジトリではありません。" };
  const remote = await runCommand("git", ["-C", folderPath, "remote", "get-url", "origin"], folderPath);
  const branch = await runCommand("git", ["-C", folderPath, "branch", "--show-current"], folderPath);
  const auth = await runGh(["auth", "status", "--hostname", "github.com"], folderPath);
  return {
    connected: remote.ok,
    authenticated: auth.ok,
    folderPath,
    remote: remote.ok ? remote.stdout.trim() : "",
    branch: branch.stdout.trim() || "main",
    message: remote.ok ? (auth.ok ? "GitHubへ接続済みです。" : "GitHub認証が未完了です。初回接続を開始してください。") : "originリモートが設定されていません。",
  };
});

ipcMain.handle("archive-desk:github-sync", async (_event, folderPath, commitMessage) => {
  if (!folderPath) return { ok: false, code: "NO_FOLDER", message: "互換フォルダーを先に開いてください。" };
  const status = await runCommand("git", ["-C", folderPath, "status", "--porcelain"], folderPath);
  if (!status.ok) return { ok: false, code: "NOT_REPO", message: "Gitリポジトリとして開けません。" };
  if (!status.stdout.trim()) return { ok: true, unchanged: true, message: "同期する変更はありません。" };
  const add = await runCommand("git", ["-C", folderPath, "add", "-A"], folderPath);
  if (!add.ok) return { ok: false, code: "ADD_FAILED", message: commandFailure(add, "変更の準備に失敗しました。") };
  const commit = await runCommand("git", ["-C", folderPath, "commit", "-m", commitMessage || `${new Date().toISOString().slice(0, 10)} 執筆内容を同期`], folderPath);
  if (!commit.ok) return { ok: false, code: "COMMIT_FAILED", message: commandFailure(commit, "変更の記録に失敗しました。") };
  const push = await runCommand("git", ["-C", folderPath, "push"], folderPath);
  if (!push.ok) return { ok: false, code: "PUSH_FAILED", message: commandFailure(push, "GitHubへの送信に失敗しました。認証とリモート設定を確認してください。") };
  return { ok: true, unchanged: false, message: "GitHubへ同期しました。" };
});

ipcMain.handle("archive-desk:github-pull", async (_event, folderPath) => {
  if (!folderPath) return { ok: false, message: "互換フォルダーを先に開いてください。" };
  const pull = await runCommand("git", ["-C", folderPath, "pull", "--ff-only"], folderPath);
  return pull.ok ? { ok: true, message: pull.stdout.trim() || "GitHubから最新状態を取得しました。" } : { ok: false, message: commandFailure(pull, "取得できませんでした。先に差分を確認してください。") };
});

ipcMain.handle("archive-desk:watch-folder", async (_event, folderPath) => {
  if (activeWatcher) {
    await activeWatcher.close();
    activeWatcher = null;
  }
  if (!folderPath) return false;
  activeWatcher = require("node:fs").watch(folderPath, { recursive: true }, (_eventType, filename) => {
    if (filename && !String(filename).includes(".archive-desk")) {
      BrowserWindow.getAllWindows().forEach((window) => window.webContents.send("archive-desk:external-change", String(filename)));
    }
  });
  return true;
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
