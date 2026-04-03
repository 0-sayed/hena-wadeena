-- Fix listings district column: convert Arabic values to English enum codes
-- Same issue as guide-booking service: frontend sends English codes, DB stored Arabic

UPDATE market.listings
SET district = CASE district
  WHEN 'الخارجة' THEN 'kharga'
  WHEN 'الداخلة' THEN 'dakhla'
  WHEN 'الفرافرة' THEN 'farafra'
  WHEN 'باريس' THEN 'baris'
  WHEN 'بلاط' THEN 'balat'
  ELSE district
END
WHERE district IN ('الخارجة', 'الداخلة', 'الفرافرة', 'باريس', 'بلاط');

-- Also fix business_directories table if it has the same issue
UPDATE market.business_directories
SET district = CASE district
  WHEN 'الخارجة' THEN 'kharga'
  WHEN 'الداخلة' THEN 'dakhla'
  WHEN 'الفرافرة' THEN 'farafra'
  WHEN 'باريس' THEN 'baris'
  WHEN 'بلاط' THEN 'balat'
  ELSE district
END
WHERE district IN ('الخارجة', 'الداخلة', 'الفرافرة', 'باريس', 'بلاط');
