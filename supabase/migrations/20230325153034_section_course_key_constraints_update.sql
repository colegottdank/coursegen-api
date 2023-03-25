alter table "public"."course" drop constraint "UX_Course_Key";

alter table "public"."course" drop constraint "UX_Course_UserId_Title";

alter table "public"."section" drop constraint "section_course_key_fkey";

alter table "public"."course" drop constraint "course_pkey";

drop index if exists "public"."UX_Course_Key";

drop index if exists "public"."UX_Course_UserId_Title";

drop index if exists "public"."course_pkey";

alter table "public"."course" drop column "key";

alter table "public"."course" add column "id" uuid not null default uuid_generate_v4();

alter table "public"."section" drop column "course_key";

alter table "public"."section" drop column "section_order";

alter table "public"."section" add column "course_id" uuid;

CREATE UNIQUE INDEX "UX_Section_CourseKey_Path" ON public.section USING btree (course_id, path);

CREATE UNIQUE INDEX course_pkey ON public.course USING btree (id);

alter table "public"."course" add constraint "course_pkey" PRIMARY KEY using index "course_pkey";

alter table "public"."section" add constraint "UX_Section_CourseKey_Path" UNIQUE using index "UX_Section_CourseKey_Path";

alter table "public"."section" add constraint "section_course_id_fkey" FOREIGN KEY (course_id) REFERENCES course(id) not valid;

alter table "public"."section" validate constraint "section_course_id_fkey";


