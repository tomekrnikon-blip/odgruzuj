-- Stworzenie bezpiecznej funkcji do czyszczenia niepotwierdzonych użytkowników.
CREATE OR REPLACE FUNCTION public.cleanup_unconfirmed_users_logic()
RETURNS void AS $$
DECLARE
    user_to_delete RECORD;
BEGIN
    FOR user_to_delete IN
        SELECT id FROM auth.users
        WHERE confirmation_sent_at IS NOT NULL
          AND confirmed_at IS NULL
          AND (now() - confirmation_sent_at) > interval '24 hours'
    LOOP
        RAISE NOTICE 'Deleting unconfirmed user %', user_to_delete.id;
        DELETE FROM auth.users WHERE id = user_to_delete.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;