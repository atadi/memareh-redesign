# AGENTS.md

This file provides guidance to AI coding agents working in this repository.

## Repository Layout

This repository uses a local `.agents` directory at the project root.

Main agent resources are located at:

- `.agents/agents/` — persona/role definitions
- `.agents/skills/` — reusable skill workflows
- `.agents/skills/<skill-name>/SKILL.md` — individual skill instructions

There is no required `.claude` directory in this project.

## Core Rule

Before making code changes, agents must check whether the user’s request matches an available skill.

If a skill applies, the agent must read the relevant local skill file directly:

```txt
.agents/skills/<skill-name>/SKILL.md
```

Agents must not assume skill contents from memory. Always read the skill file first.

## Skill Discovery and Invocation

Do not use a built-in `skill` tool or external workflow loader.

To use a skill:

1. Understand the user’s request.
2. Identify the matching skill under `.agents/skills/`.
3. Read `.agents/skills/<skill-name>/SKILL.md`.
4. Follow the skill’s process, requirements, and exit criteria.
5. Only implement after the required planning/specification steps are complete.

## Intent to Skill Mapping

Use these mappings unless a more specific skill exists:

- Feature or new functionality → `spec-driven-development`, then `incremental-implementation`, then `test-driven-development`
- Planning or task breakdown → `planning-and-task-breakdown`
- Bug, failure, or unexpected behavior → `debugging-and-error-recovery`
- Code review → `code-review-and-quality`
- Refactoring or simplification → `code-simplification`
- API or interface design → `api-and-interface-design`
- UI or frontend work → `frontend-ui-engineering`
- Release or launch preparation → `shipping-and-launch`

## Lifecycle Mapping

For larger tasks, follow this lifecycle:

1. DEFINE → `spec-driven-development`
2. PLAN → `planning-and-task-breakdown`
3. BUILD → `incremental-implementation` and `test-driven-development`
4. VERIFY → `debugging-and-error-recovery`
5. REVIEW → `code-review-and-quality`
6. SHIP → `shipping-and-launch`

## Personas

Personas are role definitions stored in:

```txt
.agents/agents/<role>.md
```

Personas define perspective, responsibilities, and output style.

Personas may use skills, but personas should not invoke or route to other personas unless the user explicitly asks for that orchestration.

## Execution Rules

For every request:

1. Inspect the request.
2. Check whether a matching skill exists.
3. If a skill applies, read its `SKILL.md`.
4. Follow the skill exactly.
5. Do not bypass planning, testing, review, or verification steps required by the skill.

Avoid these rationalizations:

- “This is too small for a skill.”
- “I can just quickly implement this.”
- “I’ll gather context first without checking skills.”
- “I already know what this skill probably says.”

Correct behavior:

- Check available skills first.
- Read the applicable skill file.
- Then proceed according to its workflow.

## Creating or Updating Skills

Skills are markdown-first workflows.

Each skill should live at:

```txt
.agents/skills/<kebab-case-name>/SKILL.md
```

A skill should generally include:

- Overview
- When to Use
- Process
- Verification or Exit Criteria
- Common Mistakes or Red Flags, where relevant

Add scripts or supporting files only when the skill genuinely requires runnable helpers.

## Important Path Convention

All paths in this repository should reference `.agents/...`.

Do not reference `.claude/...` unless that directory is intentionally added later.
