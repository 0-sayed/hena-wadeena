-- Arabic text normalization function for full-text search
-- Used by generated tsvector columns on listings, investment_opportunities, business_directories
-- Strips diacritics, normalizes alef variants, converts taa marbuta, removes tatweel

CREATE OR REPLACE FUNCTION market.normalize_arabic(input text)
RETURNS text AS $$
  SELECT regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          input,
          '[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]',
          '', 'g'
        ),
        '[\u0622\u0623\u0625]', 'ا', 'g'
      ),
      'ة', 'ه', 'g'
    ),
    'ـ', '', 'g'
  );
$$ LANGUAGE sql IMMUTABLE STRICT;
