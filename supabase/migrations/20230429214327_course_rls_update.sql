-- Drop the existing policy
DROP POLICY "Users can view own course" ON public.course;
DROP POLICY "Authenticated users can insert new course" ON public.course;
DROP POLICY "Individual insert access" ON public.profile;
DROP POLICY "Authenticated users can insert new section" ON public.section;

CREATE POLICY course_select_policy
ON public.course
FOR SELECT
USING (true);

CREATE OR REPLACE FUNCTION public.validate_course_update()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
   IF NEW.id <> OLD.id THEN
    RAISE EXCEPTION 'Updating "id" is not allowed';
  END IF;

  IF NEW.user_id <> OLD.user_id THEN
    RAISE EXCEPTION 'Updating "user_id" is not allowed';
  END IF;

  IF NEW.search_text <> OLD.search_text THEN
    RAISE EXCEPTION 'Updating "search_text" is not allowed';
  END IF;

  IF NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Updating "created_at" is not allowed';
  END IF;

  IF NEW.updated_at <> OLD.updated_at THEN
    RAISE EXCEPTION 'Updating "updated_at" is not allowed';
  END IF;

  RETURN NEW;
END;
$function$;

-- Create the trigger
CREATE TRIGGER before_course_update
BEFORE UPDATE ON public.course
FOR EACH ROW
WHEN (row_security_active('course'))
EXECUTE FUNCTION public.validate_course_update();

ALTER TABLE public.course
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.course_item
ALTER COLUMN user_id DROP NOT NULL;

-- Add the parent_id column
ALTER TABLE course_item
ADD COLUMN parent_id UUID;

-- Define the foreign key constraint
ALTER TABLE course_item
ADD CONSTRAINT fk_parent_id
FOREIGN KEY (parent_id)
REFERENCES course_item (id)
ON DELETE CASCADE;
