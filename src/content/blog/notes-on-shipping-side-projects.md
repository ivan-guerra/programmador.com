---
title: "Notes on shipping side projects"
description: "The gap between 'works on my machine' and 'someone else can use it' is the whole project."
pubDate: 2026-07-10
tags: ["projects"]
---

A pattern I keep noticing: the prototype takes a weekend, and everything after the prototype takes a month.

The weekend part is the fun part — the core loop, the thing that made you want to build it. The month is everything else:

- auth, because someone other than you will use it
- error states, because the happy path is maybe 60% of reality
- a landing page, because "check out my localhost" doesn't travel
- deployment, monitoring, and a domain name you'll agonize over

## What actually helps

**Cut scope before you cut corners.** A small thing that works completely beats a big thing that mostly works. Users forgive missing features; they don't forgive broken ones.

**Ship the boring version first.** Server-rendered pages, a plain database, one region. You can get clever later, and you usually won't need to.

**Set a deadline that embarrasses you.** If the plan is "launch when it's ready," it's not a plan. Pick a date close enough that you have to decide what matters.

> The project isn't done when there's nothing left to add. It's done when you'd be okay with a stranger using it while you're asleep.

None of this is new advice. But writing it down makes it harder to ignore next weekend.
