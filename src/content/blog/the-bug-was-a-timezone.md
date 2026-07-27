---
title: "The bug was a timezone (it's always a timezone)"
description: "A debugging story about a report that was wrong exactly once a day."
pubDate: 2026-06-15
tags: ["debugging"]
---

We had a daily report that was correct 23 hours a day. Between 4pm and 5pm Pacific, the numbers were off by exactly one day's worth of data. Everything else — totals, averages, the charts — looked completely fine.

## The hunt

My first three theories, in order of how confidently I held them:

1. A caching bug (it was not a caching bug)
2. A race condition in the aggregation job (it was not a race condition)
3. Bad data from the upstream service (the upstream service was fine)

The actual clue was embarrassingly visible in the reproduction steps the whole time: *between 4pm and 5pm Pacific.* That's midnight UTC.

## The bug

One code path computed "today" like this:

```ts
const today = new Date().toISOString().slice(0, 10); // UTC
```

And another like this:

```ts
const today = format(new Date(), "yyyy-MM-dd"); // local time
```

For the hour where those two disagree, the report queried one day and labeled it as another.

## The lesson

The fix was one line. The lesson was not: **any time a bug correlates with a time of day, check timezones before anything else.** It costs two minutes to rule out and it's the culprit far more often than the exotic theories.

I now keep a mental checklist for "the bug happens sometimes" reports: timezones, DST transitions, month boundaries, leap days. In that order. It has yet to let me down.
