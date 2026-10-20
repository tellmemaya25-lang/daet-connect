-- Add sample cover image URLs to existing packages for testing
-- These are placeholder images from a CDN that represent travel/tourism

UPDATE tours_packages 
SET cover_image_url = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=800&fit=crop'
WHERE title = 'Barlan''s Apartment' AND cover_image_url IS NULL;

UPDATE tours_packages 
SET cover_image_url = 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1200&h=800&fit=crop'
WHERE title = 'Bagasbas Beach Surfing Experience' AND cover_image_url IS NULL;

UPDATE tours_packages 
SET cover_image_url = 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&h=800&fit=crop'
WHERE title = 'Island Hopping Adventure' AND cover_image_url IS NULL;

-- Check the results
SELECT id, title, cover_image_url 
FROM tours_packages 
ORDER BY created_at DESC;
