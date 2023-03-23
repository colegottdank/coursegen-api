alter table "public"."course" drop constraint "course_key_key";

alter table "public"."course" drop constraint "unique_course_user_title";

alter table "public"."section" drop constraint "unique_section_parent_course_order";

alter table "public"."section" drop constraint "unique_section_parent_course_title";

drop index if exists "public"."course_key_key";

drop index if exists "public"."unique_course_user_title";

drop index if exists "public"."unique_section_parent_course_order";

drop index if exists "public"."unique_section_parent_course_title";

CREATE UNIQUE INDEX "UX_Course_Key" ON public.course USING btree (key);

CREATE UNIQUE INDEX "UX_Course_UserId_Title" ON public.course USING btree (user_id, title);

CREATE UNIQUE INDEX "UX_Section_ParentId_CourseId_SectionOrder" ON public.section USING btree (parent_id, course_id, section_order);

CREATE UNIQUE INDEX "UX_Section_ParentId_CourseId_Title" ON public.section USING btree (parent_id, course_id, title);

alter table "public"."course" add constraint "UX_Course_Key" UNIQUE using index "UX_Course_Key";

alter table "public"."course" add constraint "UX_Course_UserId_Title" UNIQUE using index "UX_Course_UserId_Title";

alter table "public"."section" add constraint "UX_Section_ParentId_CourseId_SectionOrder" UNIQUE using index "UX_Section_ParentId_CourseId_SectionOrder";

alter table "public"."section" add constraint "UX_Section_ParentId_CourseId_Title" UNIQUE using index "UX_Section_ParentId_CourseId_Title";


