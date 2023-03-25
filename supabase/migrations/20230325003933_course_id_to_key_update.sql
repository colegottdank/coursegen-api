alter table "public"."section" drop constraint "UX_Section_ParentId_CourseId_SectionOrder";

alter table "public"."section" drop constraint "UX_Section_ParentId_CourseId_Title";

alter table "public"."section" drop constraint "section_course_id_fkey";

alter table "public"."course" drop constraint "course_pkey";

drop index if exists "public"."UX_Section_ParentId_CourseId_SectionOrder";

drop index if exists "public"."UX_Section_ParentId_CourseId_Title";

drop index if exists "public"."course_pkey";

alter table "public"."course" drop column "id";

alter table "public"."section" drop column "course_id";

alter table "public"."section" add column "course_key" uuid;

alter table "public"."section" add column "path" text not null;

CREATE UNIQUE INDEX course_pkey ON public.course USING btree (key);

alter table "public"."course" add constraint "course_pkey" PRIMARY KEY using index "course_pkey";

alter table "public"."section" add constraint "section_course_key_fkey" FOREIGN KEY (course_key) REFERENCES course(key) ON DELETE CASCADE not valid;

alter table "public"."section" validate constraint "section_course_key_fkey";


