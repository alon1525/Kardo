-- SQL Script to Add Random Test Cards to Your Decks
-- Run this in your Supabase SQL Editor
-- This will add 10 random cards to each of your existing decks

-- First, let's see what decks you have (optional - just for reference)
-- SELECT id, name, language, user_id FROM decks;

-- Function to add random test cards to a specific deck by deck ID
-- Replace YOUR_DECK_ID with the actual deck ID you want to add cards to

-- Example: Add 10 random Spanish cards to deck ID 1
-- Replace 1 with your actual deck ID
DO $$
DECLARE
    deck_id_var INTEGER := 1; -- CHANGE THIS TO YOUR DECK ID
    current_cards JSONB;
    new_cards JSONB := '[]'::jsonb;
    card_obj JSONB;
    i INTEGER;
    test_cards_front TEXT[] := ARRAY[
        'Hello', 'Goodbye', 'Thank you', 'Please', 'Yes', 'No', 
        'Please', 'Excuse me', 'How are you?', 'Nice to meet you',
        'What is your name?', 'Where are you from?', 'I love you', 'Good morning',
        'Good night', 'Water', 'Food', 'House', 'Car', 'Book'
    ];
    test_cards_back TEXT[] := ARRAY[
        'Hola', 'Adiós', 'Gracias', 'Por favor', 'Sí', 'No',
        'Por favor', 'Disculpe', '¿Cómo estás?', 'Mucho gusto',
        '¿Cuál es tu nombre?', '¿De dónde eres?', 'Te amo', 'Buenos días',
        'Buenas noches', 'Agua', 'Comida', 'Casa', 'Coche', 'Libro'
    ];
    random_index INTEGER;
BEGIN
    -- Get current cards array
    SELECT cards INTO current_cards
    FROM decks
    WHERE id = deck_id_var;
    
    -- If no cards exist, start with empty array
    IF current_cards IS NULL THEN
        current_cards := '[]'::jsonb;
    END IF;
    
    -- Add 10 random cards
    FOR i IN 1..10 LOOP
        -- Pick a random card from our test arrays
        random_index := floor(random() * array_length(test_cards_front, 1) + 1)::INTEGER;
        
        -- Create card object with proper structure
        card_obj := jsonb_build_object(
            'id', extract(epoch from now())::bigint * 1000 + i, -- Unique ID
            'front', jsonb_build_object(
                'content', test_cards_front[random_index],
                'align', 'center',
                'verticalAlign', 'middle',
                'fontSize', '18'
            ),
            'back', jsonb_build_object(
                'content', test_cards_back[random_index],
                'align', 'center',
                'verticalAlign', 'middle',
                'fontSize', '18'
            ),
            'difficulty', CASE 
                WHEN random() < 0.33 THEN 'easy'
                WHEN random() < 0.66 THEN 'medium'
                ELSE 'hard'
            END
        );
        
        -- Add card to array
        current_cards := current_cards || card_obj;
    END LOOP;
    
    -- Update the deck with new cards
    UPDATE decks
    SET cards = current_cards,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = deck_id_var;
    
    RAISE NOTICE 'Added 10 cards to deck ID %', deck_id_var;
END $$;

-- ============================================
-- BONUS: Add cards to ALL your decks at once
-- ============================================
-- Uncomment the section below to add cards to all your decks

/*
DO $$
DECLARE
    deck_record RECORD;
    current_cards JSONB;
    card_obj JSONB;
    i INTEGER;
    test_cards_front TEXT[] := ARRAY[
        'Hello', 'Goodbye', 'Thank you', 'Please', 'Yes', 'No', 
        'Please', 'Excuse me', 'How are you?', 'Nice to meet you',
        'What is your name?', 'Where are you from?', 'I love you', 'Good morning',
        'Good night', 'Water', 'Food', 'House', 'Car', 'Book',
        'Computer', 'Phone', 'Friend', 'Family', 'Work', 'School',
        'Money', 'Time', 'Day', 'Night', 'Sun', 'Moon', 'Star'
    ];
    test_cards_back TEXT[] := ARRAY[
        'Hola', 'Adiós', 'Gracias', 'Por favor', 'Sí', 'No',
        'Por favor', 'Disculpe', '¿Cómo estás?', 'Mucho gusto',
        '¿Cuál es tu nombre?', '¿De dónde eres?', 'Te amo', 'Buenos días',
        'Buenas noches', 'Agua', 'Comida', 'Casa', 'Coche', 'Libro',
        'Computadora', 'Teléfono', 'Amigo', 'Familia', 'Trabajo', 'Escuela',
        'Dinero', 'Tiempo', 'Día', 'Noche', 'Sol', 'Luna', 'Estrella'
    ];
    random_index INTEGER;
BEGIN
    -- Loop through all decks
    FOR deck_record IN SELECT id FROM decks LOOP
        -- Get current cards
        SELECT cards INTO current_cards
        FROM decks
        WHERE id = deck_record.id;
        
        IF current_cards IS NULL THEN
            current_cards := '[]'::jsonb;
        END IF;
        
        -- Add 15 random cards to each deck
        FOR i IN 1..15 LOOP
            random_index := floor(random() * array_length(test_cards_front, 1) + 1)::INTEGER;
            
            card_obj := jsonb_build_object(
                'id', extract(epoch from now())::bigint * 1000 + i + deck_record.id * 1000,
                'front', jsonb_build_object(
                    'content', test_cards_front[random_index],
                    'align', 'center',
                    'verticalAlign', 'middle',
                    'fontSize', '18'
                ),
                'back', jsonb_build_object(
                    'content', test_cards_back[random_index],
                    'align', 'center',
                    'verticalAlign', 'middle',
                    'fontSize', '18'
                ),
                'difficulty', CASE 
                    WHEN random() < 0.33 THEN 'easy'
                    WHEN random() < 0.66 THEN 'medium'
                    ELSE 'hard'
                END
            );
            
            current_cards := current_cards || card_obj;
        END LOOP;
        
        -- Update deck
        UPDATE decks
        SET cards = current_cards,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = deck_record.id;
        
        RAISE NOTICE 'Added 15 cards to deck ID %', deck_record.id;
    END LOOP;
END $$;
*/

-- ============================================
-- QUICK REFERENCE: Check your decks
-- ============================================
-- Run this to see all your decks and their IDs:
-- SELECT id, name, language, jsonb_array_length(cards) as card_count FROM decks ORDER BY id;

-- ============================================
-- QUICK REFERENCE: Check cards in a deck
-- ============================================
-- Run this to see cards in a specific deck (replace 1 with your deck ID):
-- SELECT jsonb_pretty(cards) FROM decks WHERE id = 1;

-- ============================================
-- CLEANUP: Remove all cards from a deck
-- ============================================
-- UPDATE decks SET cards = '[]'::jsonb WHERE id = YOUR_DECK_ID;

