# 統合Windowsエディタ：Windows版ビルド手順

このプロジェクトは、React製の執筆UIをElectronのデスクトップシェルで包む構成です。本文編集画面はブラウザー版と共有し、Electron側ではローカルプロジェクトファイルの読み書きに必要な安全なIPCブリッジを提供します。

## 開発実行

WindowsでNode.jsとpnpmをインストールした後、プロジェクトのルートで次を実行します。

```bash
pnpm install
pnpm desktop:dev
```

`desktop:dev`はフロントエンドをビルドした後、Electronウィンドウを起動します。

## 配布用ビルド

Windows用のインストーラーとポータブル版を生成するには、Windows上のPowerShellで次を実行します。

```powershell
pnpm install
pnpm desktop:win
```

インストーラーだけを作る場合は`pnpm exec electron-builder --win nsis`、ポータブル版だけを作る場合は`pnpm desktop:portable`を実行します。生成物は`release/`に作成されます。インストーラーはユーザー単位でインストールでき、ポータブル版は展開してそのまま起動できます。

LinuxやmacOS上での`--dir`検証はパッケージ構造の確認用であり、Windows向けの最終インストーラーはWindows実機またはWindows CIで生成してください。

## pnpmのnode_modules探索で停止する場合

`electron-builder`が`using manual traversal of node_modules to build dependency tree`のまま長時間進まない場合は、プロジェクトの依存関係を配布用の軽量ステージへ切り出す専用スクリプトを使用します。プロジェクトルートで次を実行してください。

```powershell
pnpm.cmd desktop:win:staged
```

この方式では、ビルド済みの`dist/public`、`electron/`、実行用の最小`package.json`だけを`release/electron-app`へコピーしてからelectron-builderを実行します。`--projectDir release/electron-app`だけを指定し、設定ファイルはステージングフォルダー内から自動検出させます。アプリの開発依存関係を再探索しないため、通常の`desktop:win`より停止しにくくなります。生成物は`release/`直下に出力されます。

## ローカルファイルアクセス

レンダラーにはNode.js APIを直接公開せず、`electron/preload.cjs`を通した明示的なIPCだけを利用します。現時点ではArchive DeskプロジェクトJSONの開く・保存を用意しています。今後はMarkdown原稿フォルダーの選択、スナップショット保存、競合ファイルの退避を同じ方式で追加します。

## 注意事項

この作業環境ではWindows実行ファイルそのものを起動して確認できないため、Windows上での最終ビルド、IME、縦書きのスクロール、ファイルダイアログ、DOCX出力の確認が必要です。配布前にはWindows 10とWindows 11の両方でインストーラーとポータブル版を検証してください。

## 即利用版と逐次改定

日常の執筆には、検証済みの安定版インストーラーまたはポータブル版を使用します。新しい改定を試す前に、プロジェクトフォルダーを複製して作業用コピーを作成してください。原稿はMarkdownなので、アプリの改定中でもVS CodeやObsidianから読み書きできます。

改定後は次の順序で確認します。

```powershell
pnpm check
pnpm build
pnpm desktop:win
```

Windows実機で起動、既存プロジェクトの「互換を開く」、本文編集、保存、再起動後の再読込、DOCX出力を確認します。問題がなければ、その版を次の安定版として保管します。問題があれば、直前の安定版フォルダーへ戻し、作業版の変更を破棄せずに原因を調査します。

変更内容は`CHANGELOG.md`、現在の使い方と未確認事項は`RELEASE.md`へ記録します。チェックポイントを作成した後は、管理画面のバージョン履歴から過去の状態へ戻せます。
