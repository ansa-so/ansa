-- Backfill: inject "default": null for optional params without an explicit default
-- This ensures all schema-defined parameters are visible to the LLM,
-- fixing an issue where Claude (High Precision) would omit optional tool params.
UPDATE
  agent_tools
SET
  input_schema = jsonb_set(
    input_schema :: jsonb,
    '{properties}',
    (
      SELECT
        jsonb_object_agg(
          KEY,
          CASE
            WHEN NOT COALESCE(input_schema :: jsonb -> 'required', '[]' :: jsonb) ? KEY
            AND NOT (value ? 'default') THEN value || '{"default": null}' :: jsonb
            ELSE value
          END
        )
      FROM
        jsonb_each(input_schema :: jsonb -> 'properties')
    )
  ) :: json
WHERE
  execution_type IN ('http', 'mock')
  AND input_schema :: jsonb -> 'properties' IS NOT NULL
  AND jsonb_typeof(input_schema :: jsonb -> 'properties') = 'object'
  AND (
    SELECT
      count(*)
    FROM
      jsonb_each(input_schema :: jsonb -> 'properties')
  ) > 0;
