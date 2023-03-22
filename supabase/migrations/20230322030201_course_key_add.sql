alter table "public"."course" add column "key" uuid not null default uuid_generate_v4();

CREATE UNIQUE INDEX course_key_key ON public.course USING btree (key);

alter table "public"."course" add constraint "course_key_key" UNIQUE using index "course_key_key";


