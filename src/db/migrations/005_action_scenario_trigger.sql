-- Режим триггера 'scenario': действие вызывается строго из шага сценария
-- (не как LLM-инструмент и не по событию).
ALTER TABLE agent_actions DROP CONSTRAINT IF EXISTS agent_actions_trigger_type_check;
ALTER TABLE agent_actions
  ADD CONSTRAINT agent_actions_trigger_type_check CHECK (trigger_type IN ('llm_tool', 'event', 'scenario'));
