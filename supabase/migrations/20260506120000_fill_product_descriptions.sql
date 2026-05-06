-- Fill in proper titles and descriptions for products that still have placeholder content
UPDATE public.products
SET
  title = 'Handcrafted Artisan Creation',
  description = 'A beautifully handcrafted piece made with care by skilled Indian artisans. Each item is unique, reflecting traditional techniques passed down through generations. Perfect as a thoughtful gift or a meaningful addition to your home.',
  category = COALESCE(NULLIF(category, ''), 'Handicrafts'),
  materials = COALESCE(NULLIF(materials, ''), 'Locally sourced natural materials'),
  dimensions = COALESCE(NULLIF(dimensions, ''), 'Varies — please contact the artist for exact dimensions'),
  care_instructions = COALESCE(NULLIF(care_instructions, ''), 'Wipe gently with a soft, dry cloth. Avoid direct sunlight and moisture.')
WHERE description IS NULL
   OR description = ''
   OR description ILIKE '%pending%'
   OR title ILIKE 'Untitled%';
