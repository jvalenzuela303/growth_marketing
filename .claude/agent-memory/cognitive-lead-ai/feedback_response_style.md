---
name: Response Style Preferences
description: User expects production-ready code with specific model IDs, cost awareness, and no generic advice
type: feedback
---

Always use specific Anthropic model IDs: claude-opus-4-6 for deep analysis tasks,
claude-sonnet-4-6 for conversational/real-time tasks. Never write "Claude" generically.

**Why:** The user is building a production system and needs to know exactly which model
to instantiate in code. Generic references waste their time.

**How to apply:** Every code block that calls the Anthropic API must specify the exact
model string. Decision tables should include model selection rationale per task.

Include prompt caching (cache_control: ephemeral) on all static system prompts — this is
standard for this project and should appear in every agent implementation without being asked.

**Why:** Saves significant cost at scale (estimated $40-60 USD/month at 1000 leads/day).
Failure to include it means the user has to add it manually in every file.

**How to apply:** Any system prompt block >1024 tokens in the Anthropic SDK should include
cache_control: {"type": "ephemeral"} as a matter of course.
