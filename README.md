# ArgoCD Troubleshooter

<img src="public/icon-128.png" width="64" alt="icon"/>

[中文文档](README-zh.md)

AI-powered Chrome extension that diagnoses ArgoCD application deployment issues. It collects diagnostic data from the ArgoCD API, filters to only unhealthy resources and their events/logs, then streams the analysis to an LLM for root cause and fix steps.

## Features

- **Smart Filtering** -- Only sends unhealthy resources, related events, and pod logs to the LLM. Healthy resources are excluded to reduce noise.
- **Pod Logs** -- Automatically fetches logs for pods in the unhealthy resource subtree.
- **Resource Event Drill-down** -- Fetches per-resource events (not just app-level) for the full unhealthy subtree (Deployment -> ReplicaSet -> Pod).
- **Sensitive Data Redaction** -- Redacts secrets, tokens, and other sensitive values before sending to the LLM.
- **Content Preview** -- Review the exact prompt before sending to the LLM.
- **Streaming Response** -- LLM results stream in real-time.
- **Flexible LLM Backend** -- Works with any OpenAI-compatible API (OpenAI, Anthropic, self-hosted).
- **i18n** -- English and Chinese (中文).

## How It Works

1. Navigate to an ArgoCD application page in your browser
2. Open the side panel (click the extension icon)
3. Click **Start Diagnosis** -- the extension collects application state, resource tree, events, and pod logs from the ArgoCD API
4. Review the generated prompt in the preview
5. Click **Send to LLM** -- the diagnosis streams back with root cause analysis and fix steps

## Install

### From Release

1. Download the latest `argocd-troubleshooter-v*.zip` from [Releases](../../releases)
2. Unzip to a folder
3. Open `chrome://extensions/`, enable **Developer mode**
4. Click **Load unpacked** and select the unzipped folder

### From Source

```bash
pnpm install
pnpm build
```

Then load the `dist/` folder as an unpacked extension.

## Development

```bash
pnpm install
pnpm dev          # watch mode
pnpm test         # run tests
pnpm test:watch   # test watch mode
```

## Configuration

Open the extension side panel and switch to the **Settings** tab:

| Setting | Default | Description |
|---------|---------|-------------|
| API Endpoint | `https://api.openai.com/v1` | OpenAI-compatible API base URL |
| Model | `gpt-4o` | Model ID |
| API Key | -- | Stored in session only (cleared on browser close) |
| Temperature | 0.3 | 0 - 1 |
| Max Tokens | 4096 | Max response length |

Presets are available for **OpenAI** and **Anthropic**.

## Release

Push a version tag to trigger the GitHub Actions workflow:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This runs tests, builds the extension, and creates a GitHub Release with the plugin zip.

## Tech Stack

- Chrome Extension Manifest V3
- React 19 + TypeScript
- Vite + esbuild
- Vitest

## License

ISC
