CREATE OR REPLACE FUNCTION insert_course_and_sections(
  course_data JSONB,
  section_data JSONB
) RETURNS TEXT AS $$
DECLARE
  inserted_course_id UUID;
  section record;
BEGIN
  RAISE LOG 'Course data - user_id: %s, title: %s, description: %s, dates: %s. Section data - title: %s, description: %s, dates: %s',
    (course_data ->> 'userId')::UUID,
    (course_data ->> 'title')::TEXT,
    (course_data ->> 'description')::TEXT,
    (course_data ->> 'dates')::TEXT,
    (section_data ->> 'title')::TEXT,
    (section_data ->> 'description')::TEXT,
    (section_data ->> 'dates')::TEXT;

  INSERT INTO course (title, description, dates, user_id)
  VALUES (
    (course_data ->> 'title')::TEXT,
    (course_data ->> 'description')::TEXT,
    (course_data ->> 'dates')::TEXT,
    (course_data ->> 'userId')::UUID
  )
  RETURNING id INTO inserted_course_id;

  FOR section IN
    SELECT jsonb_array_elements_text(section_data)::jsonb AS section
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