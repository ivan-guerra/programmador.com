---
title: "Setting Up a Local LLM"
date: 2025-06-13T11:14:31-04:00
description: "How to setup and use a local LLM with NeoVim."
tags: ["neovim", "llm"]
---

This is a quick and dirty guide to setting up a local LLM. You'll see how to run
the Qwen2.5-Code-3B-Instruct model on your local machine using `vllm`. You'll
then setup the CodeCompanion plugin in NeoVim for interacting with the model
directly from your editor.

## `vllm` Installation and Server Setup

Step one is to install the `vllm` CLI utility:

```bash
python -m venv local-llm
source local-llm/bin/activate
pip install vllm
```

The `vllm` tool will download and standup a local server for the model. Take
note of what hardware you have available (RAM, CPU, GPU/VRAM) and then browse
models at [hugginface.co][1]. This example kicks off a Qwen2.5-Code-3B-Instruct
model server:

```bash
vllm serve --model Qwen2.5-Code-3B-Instruct
```

The command will take a few minutes to run as it downloads the model and sets up
the server. A successful run will look like this:

```text
Starting vLLM API server 0 on http://0.0.0.0:8000
...
INFO: Started server process [5853]
INFO: Waiting for application startup.
INFO: Application startup complete.
INFO: 172.22.117.26:436999 - "GET /v1/models HTTP/1.1" 200 OK
```

The server is now ready to accept requests.

## NeoVim Setup with CodeCompanion

[CodeCompanion][2] is one of many plugins meant to assists in integrating LLMs
with NeoVim. CodeCompanion groups LLM configuration via adapters. The plugin
includes many default adapters for popular LLMs. However, it doesn't have an
adapter for the Qwen model.

Below is a Lazy plugin configuration for CodeCompanion that adds an adapter for
the Qwen model.

```lua
{
    "olimorris/code-companion.nvim",
    lazy = false,
    depedendencies = {
        "nvim-lua/plenary.nvim",
        "nvim-treesitter/nvim-treesitter",
    },
    config = {
        adapters = {
            qwen = function()
                return require("codecompanion.adapters").extend("openai_compatible", {
                    env = {
                        url = "http://localhost:8000",
                        chat_url = "/v1/chat/completions",
                        models_endpoint = "/v1/models",
                    },
                })
            end,
        },
        strategies = {
            chat = {
                adapter = "qwen",
            },
            inline = {
                adapter = "qwen",
            },
            cmd = {
                adapter = "qwen",
            },
        },
    }
}
```

Since the Qwen model is OpenAI compatible, you can inherit from the
`openai_compatible` adapter and extend it with the necessary configuration.

The plugin requires the `markdown` and `markdown_inline` Tree-sitter parsers.
Install them both with `:TSInstall markdown markdown_inline`. You can also
improve your experience by installing a number of additional plugins. See
[Additional Plugins][3] for more information.

## Further Reading

For CodeCompanion usage instructions, refer to the [user guide][4]. In general,
CodeCompanion provides a chat interface for querying the LLM. There's also
support for inline prompting (that is, you highlight a section of code and ask
the LLM for help).

For more information on vLLM (the library not the CLI utility), checkout
[this][5] RedHat article.

[1]: https://huggingface.co/models
[2]: https://github.com/olimorris/codecompanion.nvim
[3]: https://codecompanion.olimorris.dev/installation.html#additional-plugins
[4]: https://codecompanion.olimorris.dev/usage/introduction.html
[5]: https://www.redhat.com/en/topics/ai/what-is-vllm
