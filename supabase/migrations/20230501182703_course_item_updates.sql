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

ALTER TABLE course_item_closure
ADD COLUMN course_id UUID;

ALTER TABLE course_item_closure
ADD CONSTRAINT fk_course_item_closure_course_id
FOREIGN KEY (course_id) REFERENCES public.course(id);

ALTER TABLE public.course_item_closure ENABLE ROW LEVEL SECURITY;