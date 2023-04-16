alter table "public"."course" drop constraint "course_user_id_fkey";

alter table "public"."course" add constraint "course_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profile(id) ON DELETE SET NULL not valid;

alter table "public"."course" validate constraint "course_user_id_fkey";


