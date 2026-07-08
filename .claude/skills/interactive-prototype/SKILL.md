---
name: interactive-prototype
description: Build a new feature through a design-first, human-in-the-loop workflow — interview to close knowledge gaps, agree on a written spec, prototype the look & feel as a standalone HTML mockup for approval, THEN implement in the real code, verify it works, and open a PR. Use when the user wants to add a feature but design/behavior should be confirmed before touching production code (e.g. "prototype this first", "show me how it looks before building", "interactive prototype").
---

# Interactive Prototype

A gated, 6-step workflow for adding a feature the right way: agree on **what** and **how it looks** before writing production code. Each step ends with an explicit human checkpoint — do not advance past a checkpoint without the user's confirmation.

## When to use
- The user wants a new feature/mode and cares about design and behavior, not just "make it work".
- Requirements have gaps that are cheaper to resolve by asking than by guessing.
- The change touches user-facing UI where a wrong guess means expensive rework.

## Operating principles
- **Ground before asking.** Read the codebase first. Only ask about things you genuinely cannot infer from the code (design taste, product decisions, scale/scope). Never ask what a `grep` would answer.
- **One checkpoint per step.** Stop and get a yes before moving on. Surface the checkpoint clearly ("Confirm this and I'll move to step N+1").
- **Match the house style.** Reuse the project's existing components, tokens, colors, and vocabulary. The prototype and final code should look like they belong.
- **Keep the plan visible.** Track the 6 steps with the task tools so the user always knows where you are.

## The 6 steps

### Step 1 — Interview (close the knowledge gaps)
Research the code, then ask only the decisions that matter, using `AskUserQuestion` (2–4 tight questions with recommended options first). Cover: is this a new mode or an extension? data model shape? vocabulary/labels? scope of stats/comparisons? edge cases. Capture answers.

**Checkpoint:** answers collected.

### Step 2 — Understanding as a bullet list (spec)
Write back, as a clear bullet list, exactly what you will build: data model changes, screens/flows, in-session behavior, end-of-session stats, edge cases, and what is explicitly out of scope. Invite corrections.

**Checkpoint:** the user approves or edits the bullet list.

### Step 3 — Design prototype (look & feel, no production code)
Build a **standalone, self-contained HTML prototype** (inline CSS/JS, seeded fake data) that shows the real screens and the key interactions — using the project's actual colors/type/vocabulary. Deliver it so the user can see and click it (Artifact for a hosted page, or `SendUserFile` for a local `.html`). Walk through each screen and interaction.

**Checkpoint:** the user confirms the design AND the functional behavior. Iterate on the prototype until they do.

### Step 4 — Implement in the real code + verify
Apply the approved design to the actual codebase, reusing existing patterns. Then **verify it actually works** — typecheck/lint/build, and drive the real feature end-to-end (not just tests). Fix until green and behaving as prototyped.

**Checkpoint:** build passes and the feature demonstrably works.

### Step 5 — Reviewer's guide (how to judge it)
Write a short guide the user can follow to evaluate the result themselves: what changed and where (file map), how to run it, a click-through script that exercises every new behavior, the edge cases to poke, and how to confirm each acceptance criterion from step 2.

**Checkpoint:** the user has what they need to judge it.

### Step 6 — Pull request
Commit on the designated branch, push, and open a **draft PR** (mirror any repo PR template). Summarize the change, link the prototype, and paste the reviewer's guide into the PR body.

**Checkpoint:** PR opened; share the link.

## Notes
- If the user says "skip the prototype" or "just build it", collapse steps 2–3 into a quick written spec and proceed — but still verify (step 4) and produce the reviewer's guide (step 5).
- Prototypes are throwaway. Keep them in a scratch/mockups location, not mixed into `src/`.
