DROP FUNCTION IF EXISTS public.check_and_increment_sync(UUID);
DROP FUNCTION IF EXISTS public.check_and_increment_sync(p_connection_id UUID);

CREATE FUNCTION public.check_and_increment_sync(p_connection_id UUID)
RETURNS TABLE(can_sync BOOLEAN, current_count INTEGER, max_syncs INTEGER) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_syncs_this_month INTEGER;
    v_syncs_reset_at TIMESTAMPTZ;
    v_max_syncs INTEGER := 60;
BEGIN
    SELECT syncs_this_month, syncs_reset_at
    INTO v_syncs_this_month, v_syncs_reset_at
    FROM public.mt5_connections
    WHERE id = p_connection_id;

    IF date_trunc('month', v_syncs_reset_at) < date_trunc('month', now()) THEN
        UPDATE public.mt5_connections
        SET syncs_this_month = 0, syncs_reset_at = now()
        WHERE id = p_connection_id;
        v_syncs_this_month := 0;
    END IF;

    IF v_syncs_this_month >= v_max_syncs THEN
        RETURN QUERY SELECT FALSE, v_syncs_this_month, v_max_syncs;
        RETURN;
    END IF;

    UPDATE public.mt5_connections
    SET syncs_this_month = syncs_this_month + 1
    WHERE id = p_connection_id;

    RETURN QUERY SELECT TRUE, v_syncs_this_month + 1, v_max_syncs;
END;
$$;

DROP FUNCTION IF EXISTS public.check_rate_limit(UUID, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.check_rate_limit(p_user_id UUID, p_action TEXT, p_max_requests INTEGER, p_window_seconds INTEGER);

CREATE FUNCTION public.check_rate_limit(
    p_user_id UUID,
    p_action TEXT,
    p_max_requests INTEGER,
    p_window_seconds INTEGER
)
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_count INTEGER;
    v_window_start TIMESTAMPTZ;
BEGIN
    v_window_start := now() - (p_window_seconds || ' seconds')::INTERVAL;

    SELECT COUNT(*) INTO v_count
    FROM public.rate_limit_tracking
    WHERE user_id = p_user_id
      AND action = p_action
      AND created_at > v_window_start;

    IF v_count < p_max_requests THEN
        INSERT INTO public.rate_limit_tracking (user_id, action)
        VALUES (p_user_id, p_action);
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

DROP POLICY IF EXISTS "Authenticated users can manage firms" ON public.prop_firms;
DROP POLICY IF EXISTS "Anyone can view prop firms" ON public.prop_firms;

CREATE POLICY "Anyone can view prop firms" 
ON public.prop_firms FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage challenges" ON public.prop_firm_challenges;
DROP POLICY IF EXISTS "Anyone can view challenges" ON public.prop_firm_challenges;

CREATE POLICY "Anyone can view challenges" 
ON public.prop_firm_challenges FOR SELECT 
TO authenticated 
USING (true);
