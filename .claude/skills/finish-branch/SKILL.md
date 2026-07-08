---
name: finish-branch
description: Wrap up a finished feature branch — return to the default branch, pull the latest, tear down the isolated worktree (if any), and delete the now-unneeded local branch. Use after a branch's work is committed, pushed, and a PR is open/merged, when the user wants to clean up their local checkout (e.g. "switch to main, pull and remove the branch", "clean up this branch", "finish this branch").
---

# Finish Branch

Post-PR local cleanup: get back to a clean default-branch checkout and drop the
feature branch's local artifacts. The remote branch and its PR are untouched —
this only tidies the local environment.

## Safety first (do this before anything destructive)

1. **Confirm the work is safe.** Run `git status` and `git log --oneline @{u}..`
   (or `git status -sb`). Refuse to continue — and tell the user — if there are:
   - **uncommitted changes** (working tree not clean), or
   - **commits not pushed** to the branch's upstream.
   Deleting a local branch is only safe when everything lives on the remote.

2. **Warn about branch-only files.** Switching to the default branch removes any
   tracked files that exist only on the feature branch (skills, mockups, docs
   added in this PR) from the working directory until the PR merges. Call this
   out if the branch added such files, so the user isn't surprised.

## Steps

1. **Identify the default branch** — don't hardcode `main`:
   `git remote show origin | sed -n 's/.*HEAD branch: //p'` (commonly `main`).

2. **Switch to it:** `git checkout <default>`.

3. **Pull the latest:** `git pull --ff-only origin <default>` (fast-forward only;
   if it can't fast-forward, stop and report rather than creating a merge).

4. **Remove the worktree, if the branch lived in a linked one.**
   - `git worktree list` — if the feature branch was checked out in a *linked*
     worktree (not the primary one you're standing in), remove it:
     `git worktree remove <path>` (add `--force` only if it has throwaway
     changes the user has okayed).
   - `git worktree prune` to clear stale entries.
   - If there is only the **primary** worktree, there is nothing to remove — say
     so; `git worktree remove` cannot remove the main working tree.

5. **Delete the local feature branch:** `git branch -d <feature>`. The `-d` form
   refuses if the branch isn't merged into HEAD or its upstream — that safety is
   the point. Only escalate to `-D` when you've confirmed the branch is fully
   pushed (its commits are safe on the remote) and the user wants it gone anyway;
   say which you used and why.

## Notes
- Never delete the branch you're currently on — switch to the default branch
  first (step 2), then delete (step 5).
- This does **not** delete the remote branch or close the PR. If the user also
  wants the remote branch gone, that's `git push origin --delete <feature>` — a
  separate, explicitly-confirmed action.
- Report a short summary at the end: which branch you're on, that the pull
  succeeded, what (if anything) was removed.
