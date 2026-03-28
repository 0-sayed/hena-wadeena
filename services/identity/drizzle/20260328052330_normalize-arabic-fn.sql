-- Arabic text normalization for full-text search (mirrors market.normalize_arabic)
-- Used by generated tsvector columns on the users table
-- pg_trgm is required for the trigram index created in the next migration
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION identity.normalize_arabic(input text)
RETURNS text AS $$
  SELECT regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          input,
          '[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]',
          '', 'g'
        ),
        '[آأإ]', 'ا', 'g'
      ),
      'ة', 'ه', 'g'
    ),
    'ـ', '', 'g'
  );
$$ LANGUAGE sql IMMUTABLE STRICT;
