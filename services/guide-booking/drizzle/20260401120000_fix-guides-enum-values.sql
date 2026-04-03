-- Fix guides languages: convert Arabic to English enum values
UPDATE guide_booking.guides SET
  languages = ARRAY(
    SELECT CASE x
      WHEN 'العربية' THEN 'arabic'
      WHEN 'الإنجليزية' THEN 'english'
      WHEN 'الفرنسية' THEN 'french'
      WHEN 'الألمانية' THEN 'german'
      WHEN 'الإيطالية' THEN 'italian'
      ELSE x
    END
    FROM unnest(languages) AS x
  )
WHERE languages && ARRAY['العربية', 'الإنجليزية', 'الفرنسية', 'الألمانية', 'الإيطالية'];

-- Fix guides specialties: convert Arabic to English enum values  
UPDATE guide_booking.guides SET
  specialties = ARRAY(
    SELECT CASE x
      WHEN 'آثار' THEN 'history'
      WHEN 'تاريخ' THEN 'history'
      WHEN 'معابد' THEN 'history'
      WHEN 'صحراء' THEN 'nature'
      WHEN 'تخييم' THEN 'adventure'
      WHEN 'سفاري' THEN 'adventure'
      WHEN 'مغامرات' THEN 'adventure'
      WHEN 'تزلج رملي' THEN 'adventure'
      WHEN 'استشفاء' THEN 'nature'
      WHEN 'ينابيع حارة' THEN 'nature'
      WHEN 'سياحة علاجية' THEN 'nature'
      WHEN 'تصوير' THEN 'photography'
      WHEN 'مناظر طبيعية' THEN 'nature'
      WHEN 'عمارة' THEN 'culture'
      ELSE x
    END
    FROM unnest(specialties) AS x
  )
WHERE specialties && ARRAY['آثار', 'تاريخ', 'معابد', 'صحراء', 'تخييم', 'سفاري', 'مغامرات', 'تزلج رملي', 'استشفاء', 'ينابيع حارة', 'سياحة علاجية', 'تصوير', 'مناظر طبيعية', 'عمارة'];

-- Remove duplicate values from arrays (caused by multiple Arabic terms mapping to same English enum)
UPDATE guide_booking.guides SET
  languages = (SELECT ARRAY(SELECT DISTINCT unnest(languages)))
WHERE array_length(languages, 1) != (SELECT COUNT(DISTINCT x) FROM unnest(languages) x);

UPDATE guide_booking.guides SET
  specialties = (SELECT ARRAY(SELECT DISTINCT unnest(specialties)))
WHERE array_length(specialties, 1) != (SELECT COUNT(DISTINCT x) FROM unnest(specialties) x);
