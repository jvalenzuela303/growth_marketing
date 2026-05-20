-- ── Migration 015 — Lead AI Memory ────────────────────────────────────────────
--
-- Adds an `ai_memory` TEXT column to leads.
-- Stores a running natural-language summary of the lead's profile,
-- quiz answers, and conversation history — injected into the AI system prompt
-- to give the agent persistent, contextual memory across sessions.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS ai_memory TEXT;

COMMENT ON COLUMN leads.ai_memory IS
  'Running AI-generated summary of lead context: profile, interests, objections, prior conversations. Updated after each AI interaction.';
