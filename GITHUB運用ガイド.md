# GitHub運用ガイド

## 目的

このプロジェクトは、現在のチェックポイント **053084dd** を基準に管理します。Windowsでビルドするパソコンと、別のパソコンで開発・改修する環境を分ける場合は、GitHubを共通の保管場所として利用できます。

原稿を管理するリポジトリと、統合Windowsエディタのアプリソースを管理するリポジトリは、原則として分けることを推奨します。アプリのソースには、ビルドに必要なコードと設定だけを置き、実際の小説本文は非公開の原稿リポジトリで管理します。

> 小説原稿を扱う場合、GitHubリポジトリは必ず「Private」に設定してください。Publicリポジトリへ置いた原稿は、第三者から閲覧できる状態になります。

## A. アプリソースをGitHubで管理する

現在のプロジェクトをGitHubへ登録する場合は、GitHub上で非公開リポジトリを作成し、リポジトリURLを控えます。その後、プロジェクトフォルダーで次を実行します。

```powershell
cd "C:\Users\PC\Desktop\統合Windowsエディタアプリ\integrated-windows-editor"
git init
git branch -M main
git add .
git commit -m "現段階版053084ddを登録"
git remote add origin https://github.com/ユーザー名/リポジトリ名.git
git push -u origin main
```

GitHub CLIを使える環境では、次のように非公開リポジトリの作成と送信を一度に行えます。

```powershell
gh auth login
gh repo create integrated-windows-editor --private --source=. --remote=origin --push
```

`node_modules`、`dist`、`release`、環境変数ファイルは既存の`.gitignore`で除外しています。GitHubへ送信する前に、次のコマンドで確認してください。

```powershell
git status
git diff --stat
git ls-files | Select-String "\.env|node_modules|release"
```

`.env`やアクセストークン、個人情報が表示された場合は、送信を中止して対象ファイルを除外してください。

## B. 別のパソコンへ取得する

別PCでは、Gitがインストールされていることを確認してから、作業フォルダーでcloneします。

```powershell
cd "$env:USERPROFILE\Desktop"
git clone https://github.com/ユーザー名/integrated-windows-editor.git
cd .\integrated-windows-editor
pnpm.cmd install
pnpm.cmd check
```

GitHubログインを求められた場合は、ブラウザー認証またはGit Credential Managerを利用してください。Personal Access Tokenをソースコードや`.env`へ直接書き込まないでください。

## C. 最新版を取得してWindowsビルドする

別PCで改修を取り込む場合は、まずローカル変更を確認してから取得します。

```powershell
git status
git pull --ff-only origin main
pnpm.cmd install
pnpm.cmd desktop:win:staged
```

ビルド後は次で実行ファイルを確認します。

```powershell
Get-ChildItem .\release -Filter *.exe
```

`release`フォルダーはGitHubへ送信しない設計です。生成された`.exe`は、必要に応じてGitHub Releases、共有ストレージ、または別の配布手段で渡します。

## D. 変更を別PCへ戻す

改修後は、変更内容を確認してからコミットします。

```powershell
git status
git diff
git add client electron scripts *.md
git commit -m "作品別進捗と締切通知を更新"
git push origin main
```

次のPCでは、作業を始める前に必ず取得します。

```powershell
git pull --ff-only origin main
```

## E. 原稿フォルダーをGitHubで管理する

統合Windowsエディタの「互換フォルダーへ保存」で作成した作品フォルダーも、GitHubで管理できます。原稿フォルダーのルートで次を実行します。

```powershell
cd "D:\小説\海鳴りの町"
git init
git branch -M main
git add README.md manuscript .archive-desk\project.json
git commit -m "原稿の初回保存"
git remote add origin https://github.com/ユーザー名/海鳴りの町.git
git push -u origin main
```

原稿の改稿時は、内容が分かるコミットメッセージを付けます。

```powershell
git add manuscript .archive-desk\project.json
git commit -m "第二章の構成と本文を改稿"
git push origin main
```

GitHub上では、Markdown本文の変更履歴と差分を確認できます。作品の節目ごとにコミットを作成すると、「初稿」「第一稿」「応募前改稿」などの状態を後から追跡しやすくなります。

## F. 競合が起きた場合

同じファイルを別PCとVS Code・Obsidianで同時に編集してから`git pull`すると、競合が発生する場合があります。競合表示が出た場合は、内容を確認せずに上書きしないでください。

```powershell
git status
git diff --merge
```

統合Windowsエディタ側の外部変更通知・差分表示も利用し、どの本文を残すかを決めてから保存します。迷った場合は、競合解決前に作品フォルダー全体を複製してください。

## G. 推奨する運用

| 対象 | 推奨リポジトリ | 推奨設定 |
|---|---|---|
| 統合Windowsエディタのソース | アプリ用リポジトリ | Privateまたはチームのアクセス制限 |
| 小説本文 | 作品ごとの原稿リポジトリ | 必ずPrivate |
| 生成されたWindows実行ファイル | GitHub Releasesなど | ソースと分けて配布 |
| 作業中の一時ファイル | Git管理外 | `.gitignore`で除外 |

一日の執筆終了時、または大きな改稿の前後にコミットを作成してください。GitHubへのpushだけに頼らず、重要な原稿は別ドライブや外部バックアップにも複製することを推奨します。

## H. 今後のアプリ内GitHub連携

現段階では、PowerShellやGitHub CLIを使う手動運用が安全です。次の段階では、アプリ内に「変更確認」「コミット」「GitHubへ送信」「最新状態を取得」「履歴を表示」「競合を確認」の操作を追加できます。

アプリ内連携を実装する場合も、認証情報を作品フォルダーやプロジェクトJSONへ保存しない設計にします。GitHubログインはブラウザー認証またはOS側のGit Credential Managerを利用し、公開範囲は初期値をPrivateとします。


## I. Archive Desk v0.4.0のアプリ内同期

v0.4.0以降のWindowsアプリでは、互換フォルダーをGit管理している場合、上部の「GitHubへ同期」ボタンから、その時点までのMarkdown本文と`.archive-desk/project.json`をまとめてGitHubへ送信できます。通常の自動保存はローカル保存として働き、GitHubへの記録は利用者がボタンを押した区切りだけで作成されます。

初回だけ、次の準備を行います。

1. GitHub上で原稿用のリポジトリを作成します。未公開原稿はPrivateリポジトリを推奨します。
2. Archive Deskの「互換を開く」で、Git管理している原稿フォルダーを開きます。
3. そのフォルダーに`README.md`、`manuscript/`、`.archive-desk/project.json`があることを確認します。
4. 上部の更新アイコンから「GitHub同期」を開き、「初回接続を開始」を押してGitHub認証を完了します。
5. 「接続確認」でリモートURLと認証状態を確認します。

以後は、執筆の区切りで「GitHubへ同期」を押すだけです。アプリが変更を確認し、日付と作品名をコミットメッセージに付けて記録し、GitHubへ送信します。変更がない場合は「GitHubは最新です」と表示します。

別PCやObsidianで先に編集した場合は、「GitHubから取得」を使います。取得後は互換フォルダーを再読込し、外部変更の差分表示で本文を確認してください。競合がある場合は、アプリが表示するエラーを確認し、先に原稿フォルダーを複製してから手動で解決します。

認証情報は作品フォルダーや`.archive-desk/project.json`には保存されません。Windows側のGit認証情報とGitHub CLIの認証状態を利用します。アプリ内同期にはGitとGitHub CLIが必要です。
