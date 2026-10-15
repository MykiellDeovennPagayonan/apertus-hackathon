-- Repeatable upgrade for databases created before review metadata was mandatory.
ALTER TABLE composer_repair_lessons DROP CONSTRAINT IF EXISTS composer_repair_shared_review;
ALTER TABLE composer_repair_lessons ADD CONSTRAINT composer_repair_shared_review
  CHECK (scope_key <> 'shared' OR status <> 'active' OR
    (reviewer IS NOT NULL AND length(reviewer) BETWEEN 1 AND 100
      AND reviewed_at IS NOT NULL AND reviewed_digest IS NOT NULL
      AND reviewed_digest ~ '^[a-f0-9]{64}$'));
