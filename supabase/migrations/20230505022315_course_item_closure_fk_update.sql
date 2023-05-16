ALTER TABLE course_item_closure
DROP CONSTRAINT fk_course_item_closure_course_id;

ALTER TABLE course_item_closure
ADD CONSTRAINT fk_course_item_closure_course_id
FOREIGN KEY (course_id) REFERENCES public.course(id)
ON DELETE CASCADE;
