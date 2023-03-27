ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

CREATE SCHEMA private;

ALTER FUNCTION insert_course_and_sections
SET SCHEMA private;

GRANT EXECUTE ON FUNCTION private.insert_course_and_sections TO supabase_auth_admin;

REVOKE ALL ON SCHEMA private FROM public;

drop policy "Individual insert access" on "public"."profile";

drop policy "Users can update own profile." on "public"."profile";

drop policy "Authenticated users can insert new course" on "public"."course";

drop policy "Users can update their courses" on "public"."course";

drop policy "Authenticated users can insert new section" on "public"."section";

drop policy "Users can update their sections" on "public"."section";