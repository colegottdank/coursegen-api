CREATE OR REPLACE FUNCTION insert_course_and_sections(
  course_data TEXT,
  section_data TEXT,
  user_id UUID
) RETURNS TEXT AS $$
DECLARE
  inserted_course_id UUID;
  section jsonb;
  course_json jsonb;
  section_json jsonb;
BEGIN
  course_json := course_data::jsonb;
  section_json := section_data::jsonb;

  INSERT INTO course (title, description, dates, user_id)
  VALUES (
    course_json ->> 'title',
    course_json ->> 'description',
    course_json ->> 'dates',
    user_id
  )
  RETURNING id INTO inserted_course_id;

  FOR section IN
    SELECT jsonb_array_elements(section_json)::jsonb AS section
  LOOP
    INSERT INTO section (title, description, dates, content, user_id, course_id, path)
    VALUES (
      section ->> 'title',
      section ->> 'description',
      section ->> 'dates',
      section ->> 'content',
      user_id,
      inserted_course_id,
      section ->> 'path'
    );
  END LOOP;
  RETURN 'Function executed successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;