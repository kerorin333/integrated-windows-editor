import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stage = path.join(root, "release", "electron-app");

await rm(stage, { recursive: true, force: true });
await mkdir(path.join(stage, "dist", "public"), { recursive: true });
await mkdir(path.join(stage, "electron"), { recursive: true });
await cp(path.join(root, "dist", "public"), path.join(stage, "dist", "public"), { recursive: true });
await cp(path.join(root, "electron"), path.join(stage, "electron"), { recursive: true });

await writeFile(path.join(stage, "package.json"), JSON.stringify({
  name: "integrated-windows-editor-runtime",
  productName: "統合Windowsエディタ",
  version: "0.3.0",
  main: "electron/main.cjs",
}, null, 2));

await writeFile(path.join(stage, "electron-builder.yml"), `appId: com.archive-desk.integrated-windows-editor
productName: 統合Windowsエディタ
copyright: Copyright © 2026 Archive Desk
electronVersion: 43.4.0
directories:
  output: ../
files:
  - dist/**
  - electron/**
  - package.json
asar: true
win:
  target:
    - nsis
    - portable
  artifactName: "統合Windowsエディタ-\${version}-\${arch}.\${ext}"
`);

console.log(`Staged Electron runtime at ${stage}`);
console.log("Run electron-builder with --projectDir release/electron-app");
