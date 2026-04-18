---
title: "CopilotChat With a Custom Provider"
date: 2026-04-17T22:24:27-04:00
description: "How to setup and use a local LLM with NeoVim."
categories: ["llm"]
tags: ["llm"]
---

This article explains how to configure [CopilotChat][1] to use a custom
provider. CopilotChat is a NeoVim plugin that provides a LLM chat interface and
real-time suggestions. Typically, you use CopilotChat with GitHub Copilot.
However, it also supports custom providers. This is especially useful if you
work a job where they forbid GitHub Copilot but provide internal LLM services.

## Lazy Configuration

It's assumed you're using NeoVim with the Lazy plugin manager. Below is the Lazy
configuration for CopilotChat with a custom provider.

```lua
{
  "CopilotC-Nvim/CopilotChat.nvim",
  branch = "main",
  event = "VeryLazy",
  dependencies = {
    { "github/copilot.vim" },
    { "nvim-lua/plenary.nvim" },
  },
  opts = {
    model = "gemma-4-31b-it", -- Update this to match the id of a provider model
    providers = {
      <COMPANY_NAME> = {
        get_url = function()
          return "<API_BASE_URL>/v1/chat/completions"
        end,
        get_headers = function()
          return {
            ["Authorization"] = "Bearer <YOUR_API_KEY>"),
          }
        end,
        get_models = function()
          return { { id = "gemma-4-31b-it", name = "Gemma 4-31B-it" } }
        end,
        prepare_input = function(data, dev)
          return require("CopilotChat.config.providers").copilot.prepare_input(data, dev)
        end,
        prepare_output = function(data, dev)
          return require("CopilotChat.config.providers").copilot.prepare_output(data, dev)
        end,
      },
    },
  }
}
```

There's a couple fields that require adjustment on your end marked with `<...>`
in the configuration:

- **`COMPANY_NAME`**: This is the name of your provider. You can choose any name
  you want, but it should be unique and descriptive.
- **`API_BASE_URL`**: This is the base address for your provider's API. You'll
  have to consult your provider's docs to find out what this is.
- **`YOUR_API_KEY`**: This is the API key for your provider. Again, consult your
  provider's docs to find out how to generate a user API key or a get an
  organization key.

The `get_models()` function is also of interest. Most providers have a catalog
of LLMs that you can use. In the example, a single model called `gemma-4-31b-it`
gets referenced. You can add as many models as you want from your provider's
catalog. **Just make sure the `id` field matches the model name as defined by
your provider**.

Save and reload your configuration. If all goes well, you should see your
providers' models in the `:CopilotChatModels` menu.

Worth mentioning, there are more functions you can override in the provider
interface provided by CopilotChat. For the full listing see [Providers][2].

[1]: https://github.com/CopilotC-Nvim/CopilotChat.nvim
[2]: https://github.com/CopilotC-Nvim/CopilotChat.nvim#providers
