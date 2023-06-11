CREATE TYPE generation_status_enum AS ENUM ('in_progress', 'success', 'failure');
CREATE TYPE reference_type_enum AS ENUM ('course', 'lesson');

CREATE TABLE generation_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_name TEXT NOT NULL,
    reference_id UUID NOT NULL,
    generator_user_id UUID NOT NULL REFERENCES public.profile(id),
    owner_user_id UUID NOT NULL REFERENCES public.profile(id),
    generation_status generation_status_enum NOT NULL,
    reference_type reference_type_enum NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "UX_generation_log_reference_id_status" UNIQUE (reference_id, generation_status)
);

CREATE INDEX idx_generation_log_status_generator_user_id
ON public.generation_log
USING btree (generation_status, generator_user_id);

CREATE INDEX idx_generation_log_status_generator_user_id_owner_user_id_updated_at
ON public.generation_log
USING btree (generation_status, generator_user_id, owner_user_id, updated_at);

CREATE INDEX idx_generation_log_status_reference_id
ON public.generation_log
USING btree (generation_status, reference_id);