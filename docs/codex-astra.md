# Codex / GPT-6 Astra instruction profile

This branch previously provided a GPT-5.6 Sol overlay and Codex tool rewrites,
but no Astra-specific model routing, overlay or workflow policy. Astra now has an
explicit, opt-in profile. The Codex default remains `gpt-5.6-sol`; other hosts keep
their existing output. This profile changes instructions, not runtime model
selection, reasoning effort, credentials or provider access.

## Generate and verify

From the gstack source checkout, with dependencies installed:

```bash
# Inspect an isolated profile without replacing installed/default skills.
bun run gen:skill-docs --host codex --model gpt-6-astra --out-dir /tmp/gstack-astra
bun run gen:skill-docs --host codex --model gpt-6-astra --out-dir /tmp/gstack-astra --dry-run

# Generate into the normal .agents/skills tree when ready to use this profile.
bun run gen:skill-docs --host codex --model gpt-6-astra

# Restore default Codex/Sol instructions.
bun run gen:skill-docs --host codex
```

The Astra tree contains 54 skills, their `agents/openai.yaml` metadata, and 16
section files. Keep each generated skill directory intact: section references are
relative to its own `SKILL.md`. The existing symlink-based Codex install sees a
regenerated tree. Running `setup` or a build that regenerates default skills selects
Sol again; reapply the explicit Astra command afterward. This is intentional:
there is no hidden persistent model override. An isolated output directory is a
preview, not a complete runtime installation; commands still need gstack's
installed binaries/resources, or an explicit `GSTACK_ROOT` pointing to the source
installation. Freshness checks detect missing/stale metadata without writing it.

`--out-dir` also works for other hosts. With `--host all`, external host outputs
retain their `.agents/skills`, `.factory/skills`, etc. namespaces under that root.
Generation with an output directory does not rewrite the source `llms.txt` or
global suggestion catalog. `--dry-run` never creates output directories.

## Profile behavior

- A shorter shared preamble reuses authorization and settled decisions, asks only
  material questions, and preserves the host's native question schema/fallbacks.
- Codex plan mode is read-only. Skill-local plan-mode exceptions, log/artifact
  writes, issue publication and implementation dispatch do not override it.
- Long review/release sections load when needed. Domain checklists, evidence and
  release gates remain; repeated approvals for routine findings are removed.
- Native independent review uses tools actually available and permitted. Sequential
  self-review is disclosed when independent review is unavailable. Same-model work
  is never labeled cross-model consensus; paid calls require existing authority.
- Authorized fixes continue through verification. Successful checks are reused for
  unchanged code; failures, relevant changes or new evidence justify reruns.
- Safety skills describe instruction-level limits truthfully. Host sandbox and
  approval controls remain authoritative; existing consent covers only its scope.

Template alternatives use whole-line `codex-astra`, `otherwise` and `/codex-astra`
HTML comment delimiters. Each keeps the original instructions in its legacy arm;
only Codex plus the resolved Astra model selects the new arm. Nested, incomplete
or misordered alternatives fail generation. Edit `.tmpl` sources and resolvers,
then regenerate; never patch generated `SKILL.md` files.

## Per-skill audit

All 55 canonical skills were inspected. “Shared” means the domain workflow stays
intact and receives the common Astra policies; it does not mean the skill was
skipped. The separate contributor skill and four native OpenClaw skills are listed
after the table. `connect-chrome` is an alias of `open-gstack-browser`.

| Skill | Astra disposition |
|---|---|
| gstack | Route by requested outcome; distinguish QA from browser command help; avoid keyword-only invocation. |
| office-hours | Reuse known goal; batch independent questions; concise handoff without onboarding gates; load design section on demand. |
| plan-ceo-review | Material scope decisions; no per-finding approvals; native independent challenge; retain premise/error/trajectory review. |
| plan-eng-review | Discover target; complexity counts trigger analysis, not approval; preserve architecture/test/failure checks. |
| plan-design-review | Reuse target; material design choices; retain seven dimensions and visual evidence. |
| plan-devex-review | Batch actual decisions and deferred work; retain persona, journey, TTHW and eight DX dimensions. |
| plan-tune | Shared; explicit user tuning remains distinct from inferred preference or consent. |
| autoplan | Native sequential CEO → applicable design → engineering → DX pipeline; no invented Claude agents or plan-mode writes. |
| design-consultation | Reuse established product/design context; retain system proposal and preview; on-demand section. |
| spec | Host mode governs publication; spawn requires explicit execution intent; preserve redaction and worktree isolation. |
| review | Native independent check with disclosed fallback; retain correctness/security/diff evidence and release blockers. |
| codex | Excluded on Codex: this is a Claude-side wrapper for invoking Codex; unchanged for other hosts. |
| claude | Shared; this explicitly requested cross-provider wrapper retains its real Claude CLI/auth dependency. |
| investigate | Test technical hypotheses; consolidate final verification; reassess failed attempts based on evidence. |
| design-review | Replace invented risk percentages with concrete scope/progress evidence; retain design direction and 30-fix cap. |
| design-shotgun | Actual host delegation or sequential generation; distinct variant outputs and truthful failures. |
| design-html | Shared; retain Pretext, typography, layout and production artifact requirements. |
| devex-review | Label measured times versus estimates; retain real-flow evidence. |
| qa | Evidence-based scope checks, 50-fix cap, preserve needed regression tests instead of timed deletion. |
| qa-only | Shared; keep report-only scope and browser evidence. |
| scrape | Shared; keep prototype/execute split and actual extraction verification. |
| skillify | Shared; codify observed successful flow with required runtime contracts. |
| ship | Continue authorized review fixes and affected tests; repo-specific commands/eval routing; on-demand release sections. |
| land-and-deploy | Shared; preserve merge/deploy authority, CI and production health gates. |
| canary | Continue independent monitoring while decisions are pending; rollback still needs authority. |
| landing-report | Shared; remain read-only and report actual queue state. |
| document-release | Reuse settled version choice; native document/code check; on-demand release body. |
| document-generate | Reuse agreed audience/output scope; retain Diataxis and source verification. |
| setup-deploy | Reuse detected/requested deployment configuration; ask only missing consequential fields. |
| gstack-upgrade | Preserve current upstream and local work; fast-forward only; reapply explicit Astra profile after setup. |
| context-save | Shared plus native skill loading; preserve context format and secrets boundaries. |
| context-restore | Verify checkpoint against current state, then resume already-requested work. |
| learn | Shared; preserve explicit memory changes and source attribution. |
| retro | Verified zero-activity windows produce a report; stale/offline history is disclosed. |
| health | Shared; retain repository-detected quality checks and evidence. |
| benchmark | Shared; preserve measured browser performance and baseline comparisons. |
| benchmark-models | Distinguish provider/model selection, preserve effort, authorize spend, report unknown identity/pricing truthfully. |
| cso | Native independent verification or labeled self-review; keep confidence thresholds and audit scope. |
| setup-gbrain | Shared; explicit setup remains a user-requested integration workflow. |
| sync-gbrain | Shared; respect existing sync scope/consent and configured paths. |
| browse | Shared; preserve daemon commands and real browser evidence. |
| open-gstack-browser | Inspect ownership and process state before cleanup; preserve unrelated sessions. |
| setup-browser-cookies | Shared; preserve user-selected browser/profile/domain access. |
| pair-agent | Shared; preserve pairing tokens, scope and requested remote access. |
| ios-qa | Shared; retain device/auth prerequisites and real-device observations. |
| ios-fix | Investigate competing root causes instead of asking the user to guess. |
| ios-design-review | Group low scores and evidence; audit remains read-only. |
| ios-clean | One concrete removal scope; reuse exact prior authorization. |
| ios-sync | Preserve user changes; diagnose failed regeneration instead of blind replacement. |
| careful | Honest advisory checks; ask only when destructive action lacks matching authority. |
| freeze | Instruction-level directory boundary; canonical paths and symlinks included. |
| guard | Combine advisory destructive-action checks with the scoped-edit boundary. |
| unfreeze | Remove this instruction-level scope only; host controls still apply. |
| make-pdf | Shared; preserve renderer, export and artifact validation. |
| diagram | Shared; preserve editable sources, rendering and offline artifacts. |

`contrib/add-host` remains contributor-only: its host schema/registration workflow
does not select a runtime model. Native OpenClaw `gstack-openclaw-office-hours`,
`gstack-openclaw-ceo-review`, `gstack-openclaw-investigate` and
`gstack-openclaw-retro` retain their OpenClaw orchestration contracts; the Codex
profile does not rewrite them. All 16 section templates participate in generation
and freshness checks, including their host tool/path rewrites.

## Verification and performance claims

Offline tests cover exact/suffixed Astra routing without capturing Sol/Luna,
malformed alternatives, all generated skills/metadata/section references, plan and
safety contracts, unchanged default behavior, read-only freshness checks and actual
benchmark CLI arguments. The pre-change and post-change default generation was
compared across all hosts (613 files; output-directory section paths normalized).
These are structural and integration checks, not empirical model-quality results.

Validation on this checkout (Bun 1.4.2): the targeted generation, profile, resolver,
redaction and benchmark tests pass. The full free runner was attempted in an
isolated checkout; shard 1 stopped at five existing `gbrain-detect-install` failures.
Those tests replace PATH with a system-only list that excludes the temporary Bun
installation (exit 127); the unchanged baseline reproduces the same five failures.
The host-config suite also contains an existing assertion that `claude` must be on
PATH; this Codex environment reports `codex`, and baseline reproduces that failure.
Neither result is reported as a passing full suite. Paid model evals were not run.
`skill:check` reports all host outputs fresh, but exits 1 because its template
coverage check expects `claude/SKILL.md` even though Claude generation excludes
its own wrapper. The unchanged baseline reports the same missing-file warning.

The shared preamble and initial skill loading are smaller. This does not establish
better task accuracy or elapsed time: no paid model comparison is run implicitly.
For an authorized experiment, hold model, configured effort, task, tools and
environment constant; vary only the Sol/default versus Astra instruction profile
in isolated workspaces. Include already-authorized work, missing context, ambiguous
scope, failing tests, unavailable delegation, plan-only tasks, browser failure and
genuinely destructive operations. Compare completion quality, unnecessary question
rounds, verification, tokens and elapsed time, with failures retained in results.

The benchmark CLI separates `--models` (providers) from `--gpt-model` (runtime ID):

```bash
bin/gstack-model-benchmark ./prompt.txt --models gpt --gpt-model gpt-6-astra --dry-run
# After the provider/cost scope is authorized, omit --dry-run to send the prompt.
```

It does not override reasoning effort. The report records that effort is inherited
and unreported; record the effective configuration separately for controlled runs.
Dry-run checks CLI/auth prerequisites, not model entitlement. Requested and
provider-reported model IDs are separate. Missing identity/pricing stays unknown
and is excluded from cost estimation, rather than reported as zero. The existing
CLI harness is read-only and is not itself an interactive end-to-end workflow eval.

Design references: [OpenAI's Astra skill/prompt migration guidance](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra)
and [latest-model guidance](https://developers.openai.com/api/docs/guides/latest-model).
