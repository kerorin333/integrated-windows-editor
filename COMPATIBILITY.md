# VS Code・Obsidian互換プロジェクト

統合Windowsエディタの原稿は、本文を標準的なMarkdownファイルとして保存します。専用アプリがなくても、プロジェクトフォルダーをVS Codeで開いたり、Obsidianの保管庫として指定したりできます。

## フォルダー構造

```text
海鳴りの町/
├─ README.md
├─ .archive-desk/
│  └─ project.json
└─ manuscript/
   ├─ 01_第一部　海鳴りの町/
   │  ├─ 01_第一章　雨の駅.md
   │  │  ├─ 01_01　駅前の喫茶店.md
   │  │  └─ 01_02　青い封筒.md
   │  └─ 02_第二章　灯台の記録.md
   │     ├─ 02_01　坂道の風.md
   │     └─ 02_02　三本の線.md
   └─ 02_第二部　水底の手紙.md
```

実際の保存時には各項目をMarkdownファイルとして出力し、章・節・シーンの順序はファイル名の連番で保持します。ファイル名はWindowsで使用できない文字を安全な文字へ置換します。

## Markdownファイル

各ファイルはYAML frontmatterと本文で構成します。本文部分は通常のMarkdownなので、VS CodeやObsidianでそのまま編集できます。frontmatterには、種別、状態、目標文字数、概要、登場人物、場所、伏線などを保存します。

```markdown
---
archive_desk_id: scene-3
type: scene
status: writing
target: 2100
summary: "灯台へ向かう道で、幼いころの記憶が戻る。"
characters: "主人公、灯台守"
location: "海沿いの坂道"
threads: "青い封筒"
---

灯台へ続く道は、潮の匂いをまとっていた。
```

`.archive-desk/project.json`は、アウトライン順序やプロジェクト全体の管理情報を保持する専用ファイルです。本文はこのJSONに依存せず、本文Markdownだけでも読み書きできる構成にします。

## 開き方

VS Codeでは「フォルダーを開く」からプロジェクトのルートフォルダーを選択します。Obsidianでは「保管庫としてフォルダーを開く」から同じルートフォルダーを選択します。どちらの場合も、本文は`manuscript/`以下から参照できます。

統合Windowsエディタで「互換フォルダー保存」を選択すると、指定フォルダーへこの構造を作成します。「フォルダーを開く」では、ルート直下の`.archive-desk/project.json`を読み込みます。

## 注意事項

ObsidianでMarkdown本文を直接変更した場合、統合Windowsエディタで再読み込みするまでは、アプリ内のメモリ上の構成情報へ自動反映されません。将来版では、ファイル監視による外部変更検知と、競合時のスナップショット保存を追加します。
