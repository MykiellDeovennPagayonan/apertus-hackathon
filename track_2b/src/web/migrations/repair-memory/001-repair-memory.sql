CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE composer_repair_episodes (
  id uuid PRIMARY KEY,
  occurrence uuid NOT NULL,
  scope_key text NOT NULL CHECK (scope_key ~ '^account:[a-zA-Z0-9_-]{1,100}$'),
  stage text NOT NULL CHECK (length(stage) BETWEEN 1 AND 100),
  contract_key text NOT NULL CHECK (contract_key ~ '^[a-f0-9]{64}$'),
  evidence jsonb NOT NULL CHECK (octet_length(evidence::text) <= 32768),
  outcome text NOT NULL CHECK (outcome IN ('created','updated','runtime_action','failed','cancelled','unsupported','clarification')),
  processing text NOT NULL DEFAULT 'pending' CHECK (processing IN ('pending','processed','skipped')),
  processing_failures integer NOT NULL DEFAULT 0 CHECK (processing_failures BETWEEN 0 AND 3),
  lesson_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days'
);
CREATE INDEX composer_repair_pending ON composer_repair_episodes (created_at, id) WHERE processing = 'pending';
CREATE INDEX composer_repair_episode_scope ON composer_repair_episodes (scope_key, expires_at);

CREATE TABLE composer_repair_lessons (
  id uuid PRIMARY KEY,
  scope_key text NOT NULL CHECK (scope_key = 'shared' OR scope_key ~ '^account:[a-zA-Z0-9_-]{1,100}$'),
  lesson_key text NOT NULL CHECK (lesson_key ~ '^[a-f0-9]{64}$'),
  stage text NOT NULL CHECK (length(stage) BETWEEN 1 AND 100),
  contract_key text NOT NULL CHECK (contract_key ~ '^[a-f0-9]{64}$'),
  family text NOT NULL CHECK (family ~ '^[a-f0-9]{64}$'),
  kind text NOT NULL CHECK (kind IN ('flat_arguments','evaluated_numbers')),
  guidance text NOT NULL CHECK (length(guidance) BETWEEN 1 AND 600),
  proof jsonb NOT NULL CHECK (octet_length(proof::text) <= 2048),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('candidate','active','retired')),
  preventive boolean NOT NULL DEFAULT false,
  embedding vector(384) NOT NULL CHECK (vector_norm(embedding) > 0),
  embedding_version text NOT NULL CHECK (length(embedding_version) BETWEEN 1 AND 301),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  reviewer text,
  reviewed_at timestamptz,
  reviewed_digest text,
  retirement_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope_key, lesson_key),
  CHECK (NOT preventive OR status = 'active'),
  CONSTRAINT composer_repair_shared_review CHECK (scope_key <> 'shared' OR status <> 'active' OR (reviewer IS NOT NULL AND length(reviewer) BETWEEN 1 AND 100 AND reviewed_at IS NOT NULL AND reviewed_digest IS NOT NULL AND reviewed_digest ~ '^[a-f0-9]{64}$'))
);
CREATE INDEX composer_repair_lookup ON composer_repair_lessons (scope_key, stage, contract_key, family) WHERE status = 'active';
