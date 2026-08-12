---
title: "Sol loves to cheat"
description: ""
pubDate: 2026-08-12
tags: ["llm", "harness", "benchmark"]
---

I've been running a "spec-driven" development flow for the past year. 
  
It's pretty simple.
  
Before asking an LLM to _do something_, I first ask it to review the current implementation and draft a doc for _what it needs to do._ 
  
I use this strategy for feature development, greenfield projects, debugging, you name it. 
  
The pattern works well enough, but it's a bit repetitive. 
  
So I decided to attempt to automate it. 

## chum-codex
  
The idea was straightforward: I'd create a **supervisor agent**, that would run the spec-driven "process" and use **worker subagents** to actually write the docs, do the work, etc. 
  
> _Note: when trying to do this with vanilla Codex or Claude Code, it would somewhat work, but the default prompts are catered to a user much more so than a "supervisor"_
  
I determined the supervisor agent only needs the ability to read files and call workers, because that's what I do. 
  
Rather than rebuild a coding harness, I looked at [Pi](https://pi.dev/), [OpenCode](https://opencode.ai/), and Codex's [App Server](https://learn.chatgpt.com/docs/app-server).

I'd been using Codex for quite awhile, so I decided to give app-server a spin. The other options are cool, you should check them out.
  
Anyhow, the first version worked well enough. The supervisor would size the task, call the worker with e.g. a design request, the worker would spit out a doc, the supervisor would then ask the worker to turn that doc into an implementation spec (split by phase, as appropiate), and then finally ask the worker to actually implement the thing. 
  
Woot! I'd saved some time in my development process.

(or did I?) 

## The Rabbit Hole
  
Great, it worked; hacky, but working.
 
> _Note: **this is where I should have stopped**_
  
Sitting on my high horse, I surveyed the landscape and thought "wow, everyone should see this!"   
  
What's the best way to do to that? Benchmarks!
  
What's the best benchmark to test this with? Not [Terminal Bench](https://github.com/harbor-framework/terminal-bench)! 
  
What benchmark did I dive too deep on? Terminal Bench 2.1!
  
## Terminal Bench

If you're not familiar with agentic benchmarks, Terminal Bench's name gives it away. It's a set of tasks that can be accomplished from the terminal, covering a range of one-off tasks from chess to DNA assembly. 
  
Because it's so simple, **it's probably one of the worst benchmarks to test a spec-driven development flow.**
  
Due to it's simple nature, however, it was easy to test against. 

I started with a few of the tasks that the published GPT-5.5 failed at, such as DNA assembly/insert, video extraction/processing, ELF extraction, and protein assembly.

These tasks benefited from a "design pass" before implementation. 

The horse I was riding just got a lot taller.  

> _Note: **Terminal Bench 1.x/2.x is saturated**, but that's a story for another day._
  
## GPT-5.6? 

The [published](https://hub.harborframework.com/datasets/terminal-bench/terminal-bench-2-1/latest?tab=leaderboard&leaderboard=main) GPT-5.5 benchmark is 83.8% (~74/89 tasks, across 5 runs).
  
`chum-codex` was hitting 89.9% or [~80/89 tasks](https://gist.github.com/jumploops/09087cfbad3efaa94da5f6bddaacfd06).

Excited to share the news of my harness beating Codex, I ran a couple of vanilla Codex benchmarks just to make sure. 
  
For context: this was on June 25th, 2026 and rumors were spreading that GPT-5.6 was imminent. 

I ran three vanilla Codex benchmarks... and my heart sank: 88.8% 
  
_My harness_ was just one task ahead of vanilla Codex. 
  
Some tasks were clearly improved, others had regressed. 
  
I reached out to OpenAI, and they mentioned GPT-5.6 was being tested, but confirmed the request IDs from my calls all hit GPT-5.5. 
  
The next day, GPT-5.6 Sol was [announced](https://openai.com/index/previewing-gpt-5-6-sol/). 

Interestingly, Terminal Bench 2.1 was the _only coding-related benchmark they initially shared_, showing 88.8% on GPT-5.6 Sol and 91.9% on Sol Ultra. 
  
Similar to my setup, Ultra uses subagents to do work, though in my testing it's quite a bit more token-heavy than most people want/need for most tasks.
  
In either case, I was excited to see the new frontier! 

## Steering
  
GPT-5.6 is a much harder to steer.  
  
Switching from 5.5 to 5.6 made my harness drop in effectiveness. Things that were easy to do before, were now much more difficult. 
  
I traced part of this to a change in the base Codex prompt. For GPT-5.5, [the prompt](https://gist.github.com/jumploops/56b45522d5b1fbbeb113001346580e4f) is coding-focused and spends a lot of time on "engineering judgment" including frontend guidance, editing constraints, and having "sympathy with the codebase already in front of you"
  
The codex prompt for GPT-5.6 is [much different](https://gist.github.com/jumploops/2063c2b7c9aeca76449f12567212251d), spending almost zero energy on engineering related specifics. Instead it focuses on communication, autonomy and persistence, and skills (previously loaded in as a separate prompt for 5.5). 
  
Similar to what many others have realized, and as I predicted [8 months ago](https://x.com/jumploops/status/2009910802170740771), as the models get better, they'll need less ceremony to get them to work effectively. 
  
On the flip side, as the models get _better_, they'll become [harder to control](https://openai.com/index/hugging-face-model-evaluation-security-incident/).
  
A simple example of this is the Pytorch task from Terminal Bench 2.1.
  
With GPT-5.6 Luna and Terra, the model is easily steered into a general solution that accepts two inputs: `forward(src, tgt)` 
  
With Sol, and especially at higher reasoning levels, the model _regardless of steering_ will default to a single input `forward(src)` solution. 
  
The problem, it seems, is that the model is incredibly hard to steer away from it's own reasoning. Even if instructed to very literally accept the broadest callable interface it can (which sometimes works, if repeated, at medium reasoning, but never works at xhigh). 
  
Wrestling with this model led me down a path that got way too close to benchmark hacking for my liking; but I was too intrigued to stop. 
  
## 94% on TB 2.1
  
Having reduced my prompts substantially, it felt like I was starting over. Even if I wanted to directly hack the benchmark, the model wouldn't let me. It's circular reasoning was too strong to overcome in some cases, and the supervisor was all too willing to go along with it's intelligent worker's report.
  
It's a tough balance, if you swing too far in the other direction, the supervisor will happily expand scope or chase validation endlessly. 

These are simple tasks. We want a working solution on the first pass, not limitless expansion. 
  
I tried lowering the reasoning level, using simplified language, reducing the spec-driven flow, adding new skills, etc. Some things improved, but others failed. 
  
A few things showed promise. 
  
The first was a **third context**. The idea was that we could use an agent that only saw the commentary/reasoning of the worker, and would surface all of the potential mismatches/assumptions that worker made compared to the strict details of the request. 

The supervisor could then review the assumptions the worker took, and ask it to revisit or question said steps. This kind of works, but it's slow and happens after the fact. 
  
Another idea was to **ask the model to output "open questions"** -- something I do with my more hands-on development. The initial idea was to have the worker return open questions (rather than a full design doc) whenever it faced them, have the supervisor resolve them. This would free up the supervisor's context to be the forest rather than the trees.

Still, even with a reduced context, the **supervisor was still hard-pressed to disagree with the worker's conclusions** or overly eager to expand on trivial details. 

To remove this bias, the next idea was to employ a separate context, which would first **map and reduce** (everything old is new again!) the questions, in an attempt to remove any inherent or unfound bias, before ultimately returning a normalized version to the supervisor (or directly to the worker). 
  
This worked better, but it relies on the worker announcing the correct issues _as questions_. 
  
It turns out, with Sol, it's much easier to have it **output _it's decisions_, rather than it's questions.** The model is confident, so it doesn't see it's assumptions as questions, even if it has already stated the alternatives in it's reasoning or commentary.

With decisions in hand, the supervisor (or third context) can pause the worker, assess the decisions as questions, and then steer appropriately. 

This worked much better, and led us to our best result: 84/89 tasks on Terminal Bench 2.1

![chum-codex](https://r2.jumploops.com/Screenshot%202026-07-16%20at%204.05.39%E2%80%AFPM.png)

_Note: 1 task was cyber security blocked, but passed with a GPT-5.6 Terra fallback_

## Sol loves to cheat
  
Back on my high horse, having finally harnessed Sol, and already way too far down the path of using the benchmark for development rather than... as a benchmark, I wanted to see how far we could push this. 
  
No longer looking exclusively at vanilla Codex regressions, I wanted to see what was stopping us from hitting 86 or 88/89. 
  
Long story short, the tasks in Terminal Bench 2.1 are poorly specified, and that's the reason we're seeing Mythos, GPT-5.6, etc. top out around 88.8% without more robust machinery. 
  
An example is `make-mips-interpreter` which informs the agent that the _"I (the user) will check that you booted doom correctly"_ 
  
The [problem](https://github.com/harbor-framework/terminal-bench-2-1/issues/9)? The verifier fails if the output file, _from the agent booting doom_ already exists.
  
So the user wants to check that the agent booted the VM, so the agent leaves the file behind to prove it booted, but the user's test fails early if the file already exists. A catch-22! 
  
Before moving on to better things, I decided I wanted to share our results with the world, with the caveat that it's a little too benchmark hacky for my liking (the whole third context map-reducer thing). 
  
I ran the benchmark once before doing the full N=5 run, and was surprised to see a previouly passing task had failed: `torch-pipeline-parallelism` 
  
I ran it a couple of times. 1/3 worked.
  
Diving into the details, I couldn't figure out what had changed with our harness, so I tested it against Vanilla Codex. It passed 3/3 times. 
  
Intriguing. 

I had an agent review all the runs and determine what worked and what didn't work. 

GPT-5.6 Sol on vanilla Codex [cheated](https://gist.github.com/jumploops/5136460fdb96da3470a8f99f20fa879d).
  
Uh oh, were all of our past successes due to cheating? 
  
## Is it really Sol? 

I investigated the two recent passing runs for chum-codex on `torch-pipeline-parallelism` and found something disturbing. 
 
We explicitly disable the web search feature in Codex, but life finds a way: 
  
![codex-sol-cheating](https://r2.jumploops.com/codex-sol-cheating.png)
  
It seems July 29th was the first "cheat" from vanilla Codex, and our harness cheated today, August 12th. 

Our worker didn't have access to the `web_search` tool, so it instead decided to use curl to access DuckDuckGo, Github, grep.app, and SourceGraph.
  
Concerned, and equally intrigued, we looked back at the 83/89 run from July 17th, but [found no evidence of cheating](https://gist.github.com/jumploops/ef9535daff9637d087dc9fba76077a50) on this or any other tasks.
  
Given the recent [news](https://openai.com/index/responding-next-frontier-critical-cyber-capabilities/) and delay of their next model, one has to wonder... is this really Sol? 

## What's next
  
The `torch-pipeline` task wasn't the only one to fail today, giving me an eery reminder of upgrading our harness from GPT-5.5 to GPT-5.6. 
  
It seems the better the models become, the harder they'll be to build useful guardrails around, and for now I need a break. 
  
I'll probably revisit the harness as I engage more with the problems I face with Sol, Fable, and beyond, but for now I'm going to stick with a hands-on approach to my development. 
  
As the models get more powerful, I need to instruct them less, but the instruction is more important than ever. 
  
Putting them in a loop with lazy prompting can be fun, but trusting their output seems harder now than ever. 
  
Heck, even Terminal Bench 3.0 has added the following instructions to all of their [tasks](https://github.com/harbor-framework/terminal-bench/blob/v3.0.0/tasks/distributed-dedup/instruction.md): 

> **"Do not cheat by using online solutions or hints specific to this task."**

Is this enough? **Unlikely.**