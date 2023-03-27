ALTER FUNCTION insert_course_and_sections
SET SCHEMA public;

drop policy "Authenticated users can insert new course" on "public"."course";

drop policy "Users can update their courses" on "public"."course";

drop policy "Authenticated users can insert new section" on "public"."section";

drop policy "Users can update their sections" on "public"."section";