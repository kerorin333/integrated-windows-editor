# 統合Windowsエディタ（Archive Desk）

長編小説の構成管理、本文執筆、進捗確認、完成原稿の書き出しを一つにまとめたWindows向けデスクトップエディタです。作品を部・章・節・シーンの階層で整理しながら、長編小説を段階的に執筆できます。

本文は標準的なMarkdownファイルとして保存するため、Visual Studio CodeやObsidianなどのMarkdown対応アプリでも開いて編集できます。アプリ固有の構成・進捗・作品設定は、本文とは分離した`project.json`で管理します。

## 主な機能

| 分野 | 機能 |
|---|---|
| 構成管理 | 部・章・節・シーンの階層アウトライン、並べ替え、上下移動、ドラッグ＆ドロップ |
| 本文編集 | Markdown本文編集、縦書き表示、ルビ記法、シーン単位の執筆 |
| プレビュー | 見出し、強調、引用、箇条書き、リンク、ルビなどのMarkdown表示 |
| 進捗管理 | 純本文字数、目標文字数、締切、日別執筆履歴、達成見込みの自動判定 |
| 作品管理 | 複数作品の追加・切り替え、アーカイブ、復元、完全削除 |
| 保存 | Markdown互換フォルダー、`project.json`、ローカル自動保存 |
| 書き出し | 複数の章・節・シーンを表示順で結合したテキスト、DOCX書き出し |
| Windows連携 | Electronによる独立デスクトップアプリ、外部Markdown変更の検知と差分確認 |

## 保存形式

本文は、部・章・節・シーン単位のMarkdownファイルとして保存されます。Markdown本文はアプリ専用形式ではないため、VS CodeやObsidianで編集した後、Windowsアプリに戻って読み込むことができます。

```text
作品フォルダー/
├─ project.json              # 作品設定、進捗、履歴、最後の選択項目
└─ manuscript/               # 標準Markdown本文
   ├─ 01-第一部/
   ├─ 01-第一章/
   └─ 01-01-シーン.md
```

`project.json`は、本文に含めにくい目標文字数、締切、日別執筆履歴、複数作品の情報、最後に選択していた項目などを管理するために使用します。本文Markdownと管理情報を分離することで、プレーンテキストの可搬性とアプリの進捗管理を両立します。

## 文字数計算

文字数はMarkdownの見出し記号、強調記号、引用記号、箇条書き記号、ルビの制御記号などを除外し、画面上で本文として表示される文字を中心に計算します。作品全体の進捗、作品棚、構成カード、日別執筆履歴には同じ計算方式を適用します。

## Windows版の利用

完成済みのWindowsポータブル版は、GitHubの[Releasesページ](https://github.com/kerorin333/integrated-windows-editor/releases)からダウンロードできます。

現在の配布版は次のとおりです。

- バージョン: `v0.3.0`
- ファイル: `統合Windowsエディタ-0.3.0-x64.exe`

ポータブル版は、ダウンロードした実行ファイルを起動して使用します。原稿の保存先には、iCloudなどの同期フォルダーだけでなく、このPC上の任意のフォルダーも指定できます。

## 開発環境

- Windows 10 / 11
- Node.js
- pnpm
- Electron
- React 19
- Vite
- TypeScript
- Tailwind CSS
- `docx`パッケージ

## 開発版の起動

```powershell
pnpm.cmd install
pnpm.cmd dev
```

## Windows配布版のビルド

Windows用のステージングビルドは、electron-builderの探索上の問題を回避するため、専用スクリプトを使用します。

```powershell
pnpm.cmd install
pnpm.cmd desktop:win:staged
```

生成物は`release`フォルダーに出力されます。詳細な条件やトラブルシューティングは、[WINDOWS_BUILD.md](./WINDOWS_BUILD.md)を参照してください。

## GitHubでの更新

ソースコードを変更した後は、プロジェクトフォルダーで次の3行を実行します。

```powershell
git add -A
git commit -m "変更内容を記述"
git push
```

別のPCで開発を始める場合は、リポジトリを取得して依存関係をインストールします。

```powershell
git clone https://github.com/kerorin333/integrated-windows-editor.git
cd integrated-windows-editor
pnpm.cmd install
```

アプリのソースコードと、執筆中の原稿フォルダーは分けて管理することを推奨します。原稿をGitHubで管理する場合は、個人情報や未公開原稿が公開されないよう、リポジトリの公開範囲と`.gitignore`を確認してください。

## ドキュメント

- [ユーザーマニュアル](./ユーザーマニュアル.md)
- [Windowsビルド手順](./WINDOWS_BUILD.md)
- [互換性について](./COMPATIBILITY.md)
- [GitHub運用ガイド](./GITHUB運用ガイド.md)
- [変更履歴](./CHANGELOG.md)
- [リリース情報](./RELEASE.md)

## 注意事項

本アプリは個人開発による試作・開発中のソフトウェアです。重要な原稿は、互換フォルダー、`project.json`、GitHubなど複数の場所へバックアップしてください。外部アプリで本文を編集した場合は、Windowsアプリへ戻る前に保存を完了し、外部変更の差分確認画面で内容を確認してください。

## ライセンス

現時点では個人開発・非商用の開発リポジトリとして公開しています。利用条件やライセンスを明確化する場合は、別途`LICENSE`ファイルを追加してください。
