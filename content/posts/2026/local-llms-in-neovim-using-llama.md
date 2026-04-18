---
title: "Local LLMs in NeoVim Using Llama"
date: 2026-04-10T18:22:32-04:00
description: "How to setup and use a local LLM with NeoVim."
categories: ["cli-tools", "llm"]
tags: ["llm"]
---

This is a 2026 follow on to [Setting Up a Local LLM][1]. This article will
discuss running two local models using llama.cpp. One model will be a beefier
chat model capable of handling more complex tasks. The second model will be a
smaller model, tuned for auto completion and basic code generation. You'll see
how to integrate both into your NeoVim workflow using the [CodeCompanion][2] and
[llama.vim][3] plugins.

{{<toc>}}

## Installing llama.cpp

llama.cpp is a collection of tools for running open models on your hardware. You
can install the tools in a variety of ways. In this guide, you'll compile it
from source. Why? Compiling from source creates binaries optimized to your
specific hardware. This may or may not lead to noticeable performance gains.
That said, it's easy to do, ensures you have the latest and greatest, and has
the off chance of bumping performance.

This guide assumes you have an NVIDIA GPU and are running a recent Ubuntu Linux
distribution. If you're a Windows Subsystem for Linux user, you should be able
to follow along with the same instructions.

Here are the steps to building and installing llama.cpp:

1. Download and install the latest CUDA compiler and development tools:

```bash
sudo apt update
sudo apt install cmake build-essential nvidia-cuda-toolkit
```

2. Clone the llama.cpp repository. You can select to clone one of their master
   branch tags or grab the latest `master`:

```bash
git clone git@github.com:ggml-org/llama.cpp.git
```

3. Configure, build, and install the llama.cpp tools and libraries:

```bash
cmake -B build -DGGML_CUDA=ON
cmake --build build --config Release
sudo cmake --install build
```

4. Verify installation by checking the output of `llama-server --version`:

```bash
$ llama-server --version
ggml_cuda_init: found 1 CUDA devices (Total VRAM: 12281 MiB):
  Device 0: NVIDIA RTX 3500 Ada Generation Laptop GPU, compute capability 8.9, VMM: yes, VRAM: 12281 MiB
version: 8665 (b8635075f)
built with GNU 13.3.0 for Linux x86_64
```

## Downloading Models

The setup this guide recommends involves having two models: one for chat and one
for code completion. The chat one is the "smart" and more resource intensive
model. The completion model should be one of the smaller Fill-in-the-Middle
(FIM) models.

Which models should you run? That mostly depends on your needs and hardware.
This guide assumes you're a programmer looking to run local models as code
assistants. You have a modest enterprise laptop GPU with 12GB of VRAM, 32
logical cores, and at least 32GB of system RAM. In this case, you can use a
Google Gemma 4 model for chat and a Qwen 2.5 Coder model for code completion.
You can download the llama.cpp compatible GGUF files from [Hugging Face][4].
**Beware, you'll need at least 13GB of disk space to store both models**!

- [`gemma-4-E4B-it-Q8_0.gguf`][5]
- [`qwen2.5-coder-7b-q4_k_m.gguf`][6]

Part of the beauty of self hosting with llama.cpp is that you can swap out
models. Don't hesitate to experiment with new releases and different
quantization levels.

## Deploying the Models

You can deploy the models using the `llama-server` command. This article won't
get into the details of the various options to the server. **It's highly
recommended you read `llama-server --help` and understand what each option does
because they can significantly impact quality and performance**.

To start the chat server:

```bash
llama-server \
    -m /path/to/gemma-4-E4B-it-Q8_0.gguf \
    -ngl 99 \
    --host 0.0.0.0 \
    --port 8080 \
    --ctx-size 32768 \
    --parallel 1 \
    --threads 28
```

To start the code completion server:

```bash
llama-server \
    -m /path/to/qwen2.5-coder-7b-q4_k_m.gguf \
    --port 8012 \
    -ngl 99 \
    -fa on \
    -dt 0.1 \
    --ubatch-size 512 \
    --batch-size 1024 \
    --ctx-size 0 \
    --cache-reuse 256
```

It can be annoying to have to run these commands every time you want to use the
models. You can create user level systemd services to run the servers
automatically on boot:

The chat service `llmchat.service`:

```ini
[Unit]
Description=llama.cpp server (gemma-4-E4B-it)
After=network.target

[Service]
Type=simple
ExecStart=llama-server \
    -m /home/e470948/.huggingface/models/gemma-4-E4B-it-Q8_0.gguf \
    -ngl 99 \
    --host 0.0.0.0 \
    --port 8080 \
    --ctx-size 32768 \
    --parallel 1 \
    --threads 28

[Install]
WantedBy=default.target
```

The code completion service `llmcode.service`:

```ini
[Unit]
Description=llama.cpp server (qwen2.5-coder-7b)
After=network.target

[Service]
Type=simple
ExecStart=llama-server \
    -m /home/e470948/.huggingface/models/qwen2.5-coder-7b-q4_k_m.gguf \
    --port 8012 \
    -ngl 99 \
    -fa on \
    -dt 0.1 \
    --ubatch-size 512 \
    --batch-size 1024 \
    --ctx-size 0 \
    --cache-reuse 256

[Install]
WantedBy=default.target
```

Create these files and move them to `~/.config/systemd/user/`. Then, you can
enable and start the services:

```bash
systemctl --user daemon-reload
systemctl --user enable --now llmchat.service
systemctl --user enable --now llmcode.service
```

A healthy server will be ready to accept requests. You can check the status of
the service, the output should look similar to what's shown below:

```plaintext
$ systemctl --user status llmchat.service
...
Apr 10 19:29:50 programmador llama-server[40957]: srv          init: init: chat template, thinking = 1
Apr 10 19:29:50 programmador llama-server[40957]: main: model loaded
Apr 10 19:29:50 programmador llama-server[40957]: main: server is listening on http://0.0.0.0:8080
Apr 10 19:29:50 programmador llama-server[40957]: main: starting the main loop...
Apr 10 19:29:50 programmador llama-server[40957]: srv  update_slots: all slots are id
```

## Integrating Chat with NeoVim

CodeCompanion is the plugin you'll use to integrate the chat model into your
NeoVim workflow. Below is the initial Lazy configuration to get you up and
running:

```lua
{
    "olimorris/codecompanion.nvim",
    version = "^19.0.0",
    event = "VeryLazy",
    dependencies = {
        "nvim-lua/plenary.nvim",
        "nvim-treesitter/nvim-treesitter",
    },
    opts = {
        adapters = {
            http = {
                ["llama-server"] = function()
                    return require("codecompanion.adapters").extend("openai_compatible", {
                        env = {
                            url = "http://localhost:8080",
                            api_key = "TERM", -- no auth needed; any non-empty string works
                            chat_url = "/v1/chat/completions",
                        },
                        schema = {
                            model = {
                                -- this is just a label, it doesn't have to match the actual model name
                                default = "unsloth/gemma-4-E4B-it-GGUF",
                            },
                        },
                    })
                end,
            },
        },
        interactions = {
            chat = { adapter = "llama-server" },
            inline = { adapter = "llama-server" },
            cmd = { adapter = "llama-server" },
        },
    },
}
```

The configuration installs the CodeCompanion plugin and then defines a new
OpenAI compatible adapter that points to the local llama chat server. After
reloading your config, you should be able to use the `:CodeCompanionChat`
command to start chatting with the model. See the [docs][7] for usage and
examples.

## Integrating Code Completion with NeoVim

llama.vim is the plugin you'll use to integrate the code completion model into
your NeoVim workflow. Below is the initial Lazy configuration to get you up and
running:

```lua
{
    "ggml-org/llama.vim",
    event = "VeryLazy",
    init = function()
        vim.g.llama_config = {
            show_info = false,
            keymap_fim_accept_full = "<C-a>",
            keymap_inst_accept = "<C-a>",
        }
    end,
},
```

Here `<C-a>` is the keybinding to accept the full completion. By default
`keymap_fim_accept_full` and `keymap_inst_accept` bind to `<Tab>`. See the
built-in help `:help llama_config` for more configuration options.

## Conclusion

If you've followed the guide up to this point, you're now able to chat with your
local LLM and receive code completion suggestions in NeoVim. The next steps are
to read the plugins' respective docs and adjust keybindings to your liking.
After that, it's worth experimenting with a few different models and the
`llama-server` options.

[1]: https://programmador.com/posts/2025/setting-up-a-local-llm/
[2]: https://github.com/olimorris/codecompanion.nvim
[3]: https://github.com/ggml-org/llama.vim
[4]: https://huggingface.co/models
[5]:
  https://huggingface.co/unsloth/gemma-4-E4B-it-GGUF/resolve/main/gemma-4-E4B-it-Q8_0.gguf?download=true
[6]:
  https://huggingface.co/itlwas/Qwen2.5-Coder-7B-Q4_K_M-GGUF/resolve/main/qwen2.5-coder-7b-q4_k_m.gguf?download=true
[7]: https://codecompanion.olimorris.dev/getting-started#usage
