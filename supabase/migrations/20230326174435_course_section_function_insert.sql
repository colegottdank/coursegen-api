CREATE OR REPLACE FUNCTION insert_course_and_sections(
  course_data TEXT,
  section_data TEXT
) RETURNS TEXT AS $$
DECLARE
  inserted_course_id UUID;
  section record;
  course_json jsonb;
  section_json jsonb;
BEGIN
  course_json := to_json(course_data);
  section_json := to_json(section_data);

  RAISE LOG 'title %', course_json ->> 'title';

  INSERT INTO course (title, description, dates, user_id)
  VALUES (
    course_data ->> 'title',
    course_data ->> 'description',
    course_data ->> 'dates',
    (course_data ->> 'userId')::UUID
  )
  RETURNING id INTO inserted_course_id;

  FOR section IN
    SELECT json_array_elements_text(section_data)::jsonb AS section
  LOOP
    INSERT INTO section (title, description, dates, content, user_id, course_id, path)
    VALUES (
      (section ->> 'title')::TEXT,
      (section ->> 'description')::TEXT,
      (section ->> 'dates')::TEXT,
      (section ->> 'content')::TEXT,
      (course_data ->> 'userId')::UUID,
      inserted_course_id,
      (section ->> 'path')::TEXT
    );
  END LOOP;
  RETURN 'Function executed successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;