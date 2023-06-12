ALTER TABLE generation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_log FORCE ROW LEVEL SECURITY;

CREATE POLICY generation_log_select_policy
ON public.generation_log
FOR SELECT
USING (auth.uid() = generator_user_id OR auth.uid() = owner_user_id);