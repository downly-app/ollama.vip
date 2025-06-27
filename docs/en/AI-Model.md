# AI 模型 API 调用指南

**作者**: Manus AI

## 简介

本文档旨在为开发者提供主流 AI 模型的 API 调用地址、请求方式以及认证方法，帮助开发者快速集成这些强大的 AI 能力到自己的应用中。我们将涵盖以下 AI 模型：GPT (OpenAI)、Claude (Anthropic)、Llama (Meta/Ollama)、Mistral AI、Gemini (Google AI)、Deepseek 和 Qwen (阿里云通义千问)。

## 1. GPT (OpenAI)

OpenAI 提供了强大的 GPT 模型系列，包括 GPT-3.5 和 GPT-4 等。其 API 接口设计简洁，易于使用。

*   **官方文档**: [https://platform.openai.com/docs/api-reference/introduction](https://platform.openai.com/docs/api-reference/introduction)

### 1.1 API 调用地址

OpenAI API 的基础 URL 为 `https://api.openai.com/v1/`。

### 1.2 请求方式

主要使用 `POST` 请求，请求体通常为 JSON 格式。

### 1.3 认证方式

通过在请求头中添加 `Authorization: Bearer YOUR_API_KEY` 进行认证。`YOUR_API_KEY` 是您在 OpenAI 平台生成的 API Key。

### 1.4 示例 (聊天补全)

*   **Endpoint**: `/chat/completions`
*   **请求示例**: 

```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ]
}
```

## 2. Claude (Anthropic)

Anthropic 的 Claude 模型以其强大的推理能力和安全性著称。

*   **官方文档**: [https://docs.anthropic.com/en/home](https://docs.anthropic.com/en/home)

### 2.1 API 调用地址

Anthropic API 的基础 URL 为 `https://api.anthropic.com/v1/`。

### 2.2 请求方式

主要使用 `POST` 请求，请求体为 JSON 格式。

### 2.3 认证方式

通过在请求头中添加 `x-api-key: YOUR_API_KEY` 进行认证。`YOUR_API_KEY` 是您在 Anthropic 平台生成的 API Key。

### 2.4 示例 (消息)

*   **Endpoint**: `/messages`
*   **请求示例**: 

```json
{
  "model": "claude-3-opus-20240229",
  "max_tokens": 1024,
  "messages": [
    {
      "role": "user",
      "content": "Hello, Claude!"
    }
  ]
}
```

## 3. Llama (Meta/Ollama)

Llama 模型由 Meta 发布，通常可以通过 Ollama 等工具在本地部署，或通过 Meta 官方 API 访问。

*   **Meta Llama API 文档**: [https://llama.developer.meta.com/docs/quickstart](https://llama.developer.meta.com/docs/quickstart)
*   **Ollama 文档**: [https://ollama.ai/](https://ollama.ai/)

### 3.1 API 调用地址

*   **Meta Llama API**: `https://api.llama.com/v1/` (具体端点可能因模型和功能而异)
*   **Ollama (本地部署)**: `http://localhost:11434/api`

### 3.2 请求方式

主要使用 `POST` 请求，请求体为 JSON 格式。

### 3.3 认证方式

*   **Meta Llama API**: 通常通过在请求头中添加 `Authorization: Bearer YOUR_API_KEY` 进行认证。
*   **Ollama (本地部署)**: 默认情况下，本地部署的 Ollama API 可能不需要认证，但建议根据实际部署情况进行配置。

### 3.4 示例 (Ollama 聊天)

*   **Endpoint**: `/chat`
*   **请求示例**: 

```json
{
  "model": "llama3",
  "messages": [
    {
      "role": "user",
      "content": "Why is the sky blue?"
    }
  ]
}
```

## 4. Mistral AI

Mistral AI 提供了高性能的开源模型和 API 服务。

*   **官方文档**: [https://docs.mistral.ai/api/](https://docs.mistral.ai/api/)

### 4.1 API 调用地址

Mistral AI API 的基础 URL 为 `https://api.mistral.ai/v1/`。

### 4.2 请求方式

主要使用 `POST` 请求，请求体为 JSON 格式。

### 4.3 认证方式

通过在请求头中添加 `Authorization: Bearer YOUR_API_KEY` 进行认证。`YOUR_API_KEY` 是您在 Mistral AI 平台生成的 API Key。

### 4.4 示例 (聊天补全)

*   **Endpoint**: `/chat/completions`
*   **请求示例**: 

```json
{
  "model": "mistral-tiny",
  "messages": [
    {
      "role": "user",
      "content": "What is the capital of France?"
    }
  ]
}
```

## 5. Gemini (Google AI)

Google AI 的 Gemini 模型提供了多模态能力。

*   **官方文档**: [https://ai.google.dev/api/all-methods](https://ai.google.dev/api/all-methods)

### 5.1 API 调用地址

Gemini API 的基础 URL 通常为 `https://generativelanguage.googleapis.com/v1beta/`。

### 5.2 请求方式

主要使用 `POST` 请求，请求体为 JSON 格式。

### 5.3 认证方式

通常通过在请求 URL 中添加 `?key=YOUR_API_KEY` 或在请求头中添加 `x-goog-api-key: YOUR_API_KEY` 进行认证。`YOUR_API_KEY` 是您在 Google AI Studio 或 Google Cloud Platform 生成的 API Key。

### 5.4 示例 (生成内容)

*   **Endpoint**: `models/gemini-pro:generateContent`
*   **请求示例**: 

```json
{
  "contents": [
    {
      "parts": [
        {
          "text": "Tell me a story about a magic backpack."
        }
      ]
    }
  ]
}
```

## 6. Deepseek

Deepseek 提供了兼容 OpenAI API 的模型服务。

*   **官方文档**: [https://api-docs.deepseek.com/zh-cn/](https://api-docs.deepseek.com/zh-cn/)

### 6.1 API 调用地址

Deepseek API 的基础 URL 为 `https://api.deepseek.com/`。

### 6.2 请求方式

主要使用 `POST` 请求，请求体为 JSON 格式。

### 6.3 认证方式

通过在请求头中添加 `Authorization: Bearer YOUR_API_KEY` 进行认证。`YOUR_API_KEY` 是您在 Deepseek 平台生成的 API Key。

### 6.4 示例 (聊天补全)

*   **Endpoint**: `/chat/completions`
*   **请求示例**: 

```json
{
  "model": "deepseek-chat",
  "messages": [
    {
      "role": "user",
      "content": "Hello, Deepseek!"
    }
  ]
}
```

## 7. Qwen (阿里云通义千问)

Qwen 是阿里云推出的通义千问大模型系列。

*   **阿里云 DashScope 文档**: [https://help.aliyun.com/document_detail/271219.html](https://help.aliyun.com/document_detail/271219.html)

### 7.1 API 调用地址

Qwen API 的调用地址通常与阿里云 DashScope 服务相关，具体地址可能因地域和模型而异。例如：`https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation`。

### 7.2 请求方式

主要使用 `POST` 请求，请求体为 JSON 格式。

### 7.3 认证方式

通过在请求头中添加 `Authorization: Bearer YOUR_API_KEY` 进行认证。`YOUR_API_KEY` 是您在阿里云 DashScope 平台生成的 API Key。

### 7.4 示例 (文本生成)

*   **Endpoint**: `/api/v1/services/aigc/text-generation/generation`
*   **请求示例**: 

```json
{
  "model": "qwen-turbo",
  "input": {
    "messages": [
      {
        "role": "user",
        "content": "你好，请问你是谁？"
      }
    ]
  },
  "parameters": {
    "result_format": "message"
  }
}
```


