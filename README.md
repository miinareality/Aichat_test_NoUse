# My AI Chat

Cloudflare Workers AI を使ったシンプルなAIチャットです。

## 構成

- Frontend: HTML / CSS / JavaScript
- Backend: Cloudflare Workers
- AI: Cloudflare Workers AI
- Model: `@cf/openai/gpt-oss-20b`

## ローカル実行

```bash
npm install
npx wrangler login
npm run dev
```

## デプロイ

```bash
npm run deploy
```

`wrangler.jsonc` の `ai.binding` により Worker から `env.AI` を利用します。

## GitHub

このリポジトリをGitHubへpushして管理できます。
APIキーをフロントエンドへ書く必要はありません。
