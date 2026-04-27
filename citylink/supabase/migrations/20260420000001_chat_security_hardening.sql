-- supabase/migrations/20260420000001_chat_security_hardening.sql

-- 1. Hardening chat_messages
DROP POLICY IF EXISTS public_insert_messages ON chat_messages;
DROP POLICY IF EXISTS public_select_messages ON chat_messages;

CREATE POLICY chat_messages_select_policy ON chat_messages
    FOR SELECT TO authenticated
    USING (
        (auth.uid() = user_id OR auth.uid() = to_user_id)
        OR EXISTS (
            SELECT 1 FROM message_threads
            WHERE thread_id = chat_messages.thread_id
            AND (user_a_id = auth.uid() OR user_b_id = auth.uid())
        )
    );

CREATE POLICY chat_messages_insert_policy ON chat_messages
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND (
            to_user_id IS NOT NULL 
            OR EXISTS (
                SELECT 1 FROM message_threads
                WHERE thread_id = chat_messages.thread_id
                AND (user_a_id = auth.uid() OR user_b_id = auth.uid())
            )
        )
    );

-- 2. Hardening message_threads
DROP POLICY IF EXISTS public_insert_threads ON message_threads;
DROP POLICY IF EXISTS public_select_threads ON message_threads;
DROP POLICY IF EXISTS public_update_threads ON message_threads;

CREATE POLICY message_threads_select_policy ON message_threads
    FOR SELECT TO authenticated
    USING (user_a_id = auth.uid() OR user_b_id = auth.uid() OR is_admin());

CREATE POLICY message_threads_insert_policy ON message_threads
    FOR INSERT TO authenticated
    WITH CHECK (user_a_id = auth.uid() OR user_b_id = auth.uid() OR is_admin());

CREATE POLICY message_threads_update_policy ON message_threads
    FOR UPDATE TO authenticated
    USING (user_a_id = auth.uid() OR user_b_id = auth.uid() OR is_admin());

-- 3. Hardening profiles (public insert)
DROP POLICY IF EXISTS profiles_public_insert ON profiles;
CREATE POLICY profiles_self_insert ON profiles
    FOR INSERT TO public
    WITH CHECK (auth.uid() = id);

-- 4. Hardening products (public insert)
DROP POLICY IF EXISTS "Public Insert" ON products;

-- 5. Hardening merchants (read public)
DROP POLICY IF EXISTS merchants_read_public ON merchants;
CREATE POLICY merchants_read_public_hardened ON merchants
    FOR SELECT TO authenticated
    USING (((auth.jwt() ->> 'is_anonymous'::text))::boolean IS NOT TRUE);
