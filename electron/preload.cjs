// Archive Desk preload: expose only explicit file operations; keep Node APIs out of the renderer.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("archiveDesk", {
  openProject: () => ipcRenderer.invoke("archive-desk:open-project"),
  saveProject: (content) => ipcRenderer.invoke("archive-desk:save-project", content),
  openFolder: () => ipcRenderer.invoke("archive-desk:open-folder"),
  saveFolder: (content) => ipcRenderer.invoke("archive-desk:save-folder", content),
  writeFolder: (folderPath, content) => ipcRenderer.invoke("archive-desk:write-folder", folderPath, content),
  readFolder: (folderPath) => ipcRenderer.invoke("archive-desk:read-folder", folderPath),
  watchFolder: (folderPath) => ipcRenderer.invoke("archive-desk:watch-folder", folderPath),
  githubLogin: () => ipcRenderer.invoke("archive-desk:github-login"),
  githubStatus: (folderPath) => ipcRenderer.invoke("archive-desk:github-status", folderPath),
  githubSync: (folderPath, commitMessage) => ipcRenderer.invoke("archive-desk:github-sync", folderPath, commitMessage),
  githubPull: (folderPath) => ipcRenderer.invoke("archive-desk:github-pull", folderPath),
  onMenuAction: (listener) => {
    const handler = (_event, action) => listener(action);
    ipcRenderer.on("archive-desk:menu-action", handler);
    return () => ipcRenderer.removeListener("archive-desk:menu-action", handler);
  },
  onExternalChange: (listener) => {
    const handler = (_event, filename) => listener(filename);
    ipcRenderer.on("archive-desk:external-change", handler);
    return () => ipcRenderer.removeListener("archive-desk:external-change", handler);
  },
});
