alter table "public"."section" drop constraint "unique_section_parent_course_name";

drop index if exists "public"."unique_section_parent_course_name";

alter table "public"."course" add column "dates" text;

alter table "public"."section" drop column "name";

alter table "public"."section" add column "dates" text;

alter table "public"."section" add column "title" text not null;

CREATE UNIQUE INDEX unique_section_parent_course_title ON public.section USING btree (parent_id, course_id, title);

alter table "public"."section" add constraint "unique_section_parent_course_title" UNIQUE using index "unique_section_parent_course_title";