-- Add secondary category column to global_flashcards
ALTER TABLE public.global_flashcards 
ADD COLUMN IF NOT EXISTS category2 text DEFAULT NULL;

-- Map old difficulties to new format
UPDATE public.global_flashcards 
SET difficulty = 'easy' WHERE difficulty IN ('łatwy', 'Łatwy');

UPDATE public.global_flashcards 
SET difficulty = 'medium' WHERE difficulty IN ('średni', 'Średni');

UPDATE public.global_flashcards 
SET difficulty = 'hard' WHERE difficulty IN ('trudny', 'Trudny');

-- Delete all existing categories to replace with new ones
DELETE FROM public.categories;

-- Insert new categories from the flashcard set
INSERT INTO public.categories (name, icon, display_order, is_active) VALUES
('Garderoba', '👗', 1, true),
('Salon', '🛋️', 2, true),
('Biuro', '💼', 3, true),
('Kuchnia', '🍳', 4, true),
('Łazienka', '🚿', 5, true),
('Garaż', '🔧', 6, true),
('Spiżarnia', '🧹', 7, true),
('Sypialnia', '🛏️', 8, true),
('Pokój dziecięcy', '🧸', 9, true),
('Błyskawiczne', '⚡', 10, true),
('Sprzątanie sezonowe', '🌸', 11, true);