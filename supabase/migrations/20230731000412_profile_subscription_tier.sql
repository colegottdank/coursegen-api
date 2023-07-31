ALTER TABLE public.profile ADD COLUMN subscription_tier TEXT NOT NULL DEFAULT 'free';
ALTER TABLE public.profile ADD COLUMN subscription_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profile ADD COLUMN subscription_id TEXT UNIQUE;
ALTER TABLE public.profile ADD COLUMN stripe_id TEXT UNIQUE;