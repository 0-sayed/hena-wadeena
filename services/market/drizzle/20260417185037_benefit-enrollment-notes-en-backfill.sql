ALTER TABLE "market"."benefit_info"
ADD COLUMN IF NOT EXISTS "enrollment_notes_en" text;

UPDATE "market"."benefit_info"
SET "enrollment_notes_en" = CASE "slug"
  WHEN 'takaful-wa-karama' THEN 'Apply at the Kharga social solidarity office. Applications are reviewed within 30 days, and the program stays open year-round.'
  WHEN 'sakan-karim' THEN 'Submit the application at the local housing office. A field visit is completed to confirm eligibility before approval.'
  WHEN 'tamween' THEN 'You can correct card details or add family members at the supply office. The card remains tied to the place of residence.'
  WHEN 'disability-allowance' THEN 'Submit the application with the certified medical report. Assessment can take up to 60 days, and payments start monthly after approval.'
  WHEN 'non-contributory-pension' THEN 'Available to residents over 65 who do not receive an insurance pension. The application is reviewed and followed by a field visit.'
  WHEN 'solar-pump-grant' THEN 'Apply through the local agricultural association or directly at the NREA office. The grant covers a full pump installation or up to an 80% discount.'
  ELSE "enrollment_notes_en"
END
WHERE "slug" IN (
  'takaful-wa-karama',
  'sakan-karim',
  'tamween',
  'disability-allowance',
  'non-contributory-pension',
  'solar-pump-grant'
);
