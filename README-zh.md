# ArgoCD Troubleshooter

<img src="public/icon-128.png" width="64" alt="icon"/>

[English](README.md)

基于 AI 的 Chrome 扩展，用于诊断 ArgoCD 应用部署问题。它从 ArgoCD API 收集诊断数据，过滤出不健康的资源及其事件和 Pod 日志，然后交由 LLM 分析根因并给出修复步骤。

## 功能特性

- **智能过滤** -- 仅将不健康资源、相关事件和 Pod 日志发送给 LLM，排除健康资源以减少噪声。
- **Pod 日志** -- 自动拉取不健康资源子树中 Pod 的日志。
- **资源事件下钻** -- 针对完整的不健康子树（Deployment -> ReplicaSet -> Pod）拉取各资源级别的事件，而非仅应用级事件。
- **敏感数据脱敏** -- 在发送给 LLM 前自动脱敏 Secret、Token 等敏感值。
- **内容预览** -- 发送前可查看完整的 Prompt 内容。
- **流式响应** -- LLM 诊断结果实时流式返回。
- **灵活的 LLM 后端** -- 支持任意 OpenAI 兼容 API（OpenAI、Anthropic、自托管）。
- **国际化** -- 支持英文和中文。

## 使用流程

1. 在浏览器中打开某个 ArgoCD 应用页面
2. 打开侧边栏（点击扩展图标）
3. 点击 **开始诊断** -- 扩展会从 ArgoCD API 收集应用状态、资源树、事件和 Pod 日志
4. 在预览中检查生成的 Prompt
5. 点击 **发送到 LLM** -- 诊断结果会流式返回，包含根因分析和修复步骤

## 安装

### 从 Release 安装

1. 从 [Releases](../../releases) 下载最新的 `argocd-troubleshooter-v*.zip`
2. 解压到文件夹
3. 打开 `chrome://extensions/`，启用 **开发者模式**
4. 点击 **加载已解压的扩展程序**，选择解压后的文件夹

### 从源码构建

```bash
pnpm install
pnpm build
```

然后将 `dist/` 文件夹作为已解压的扩展加载。

## 开发

```bash
pnpm install
pnpm dev          # 监听模式
pnpm test         # 运行测试
pnpm test:watch   # 测试监听模式
```

## 配置

打开扩展侧边栏，切换到 **设置** 标签页：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| API 端点 | `https://api.openai.com/v1` | OpenAI 兼容 API 地址 |
| 模型 | `gpt-4o` | 模型 ID |
| API Key | -- | 仅存储在会话中（关闭浏览器即清除） |
| Temperature | 0.3 | 0 - 1 |
| Max Tokens | 4096 | 最大响应长度 |

提供 **OpenAI** 和 **Anthropic** 预设。

## 发布

推送版本标签触发 GitHub Actions 工作流：

```bash
git tag v1.0.0
git push origin v1.0.0
```

自动运行测试、构建扩展，并创建带有插件 zip 的 GitHub Release。

## 技术栈

- Chrome Extension Manifest V3
- React 19 + TypeScript
- Vite + esbuild
- Vitest

## 许可证

ISC
