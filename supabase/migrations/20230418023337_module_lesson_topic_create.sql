CREATE TYPE course_item_type AS ENUM ('module', 'lesson');

CREATE TABLE course_item (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    title text NOT NULL,
    description text NOT NULL,
    dates text NULL,
    order_index integer NOT NULL,
    type course_item_type NOT NULL,
    course_id uuid NOT NULL REFERENCES public.course(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profile(id) ON DELETE SET NULL,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE course_item_closure (
    ancestor_id uuid NOT NULL REFERENCES public.course_item(id) ON DELETE CASCADE,
    descendant_id uuid NOT NULL REFERENCES public.course_item(id) ON DELETE CASCADE,
    depth integer NOT NULL CHECK (depth >= 0),

    PRIMARY KEY (ancestor_id, descendant_id)
);

CREATE TABLE topic (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    title text NOT NULL,
    content text,
    order_index integer,

    lesson_id uuid NOT NULL REFERENCES public.course_item(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profile(id) ON DELETE SET NULL,
    course_id uuid NOT NULL REFERENCES public.course(id) ON DELETE CASCADE,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT "UX_Topic_Lesson_OrderIndex" UNIQUE (lesson_id, order_index)
);

-- Create a table to store relationships between upgraded lessons and their origin topics
CREATE TABLE lesson_origin_topic (
    lesson_id uuid NOT NULL REFERENCES public.course_item(id) ON DELETE CASCADE,
    topic_id uuid NOT NULL REFERENCES public.topic(id) ON DELETE CASCADE,

    CONSTRAINT "PK_LessonOriginTopic" PRIMARY KEY (lesson_id, topic_id)
);

ALTER TABLE public.lesson_origin_topic ENABLE ROW LEVEL SECURITY;

-- Create a table to store relationships between upgraded modules and their origin lessons
CREATE TABLE module_origin_lesson (
    module_id uuid NOT NULL REFERENCES public.course_item(id) ON DELETE CASCADE,
    lesson_id uuid NOT NULL REFERENCES public.course_item(id) ON DELETE CASCADE,

    CONSTRAINT "PK_ModuleOriginLesson" PRIMARY KEY (module_id, lesson_id)
);

ALTER TABLE public.module_origin_lesson ENABLE ROW LEVEL SECURITY;

-- Enable RLS and create policies for the module table
ALTER TABLE public.course_item ENABLE ROW LEVEL SECURITY;

-- Module table RLS policies
CREATE POLICY course_item_update_policy
ON public.course_item
FOR UPDATE
USING (auth.uid() = user_id);

-- Create the validation function
CREATE OR REPLACE FUNCTION public.validate_course_item_update()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.id <> OLD.id THEN
    RAISE EXCEPTION 'Updating "id" is not allowed';
  END IF;

  IF NEW.order_index <> OLD.order_index THEN
    RAISE EXCEPTION 'Updating "order_index" is not allowed';
  END IF;

  IF NEW.type <> OLD.type THEN
    RAISE EXCEPTION 'Updating "type" is not allowed';
  END IF;

  IF NEW.course_id <> OLD.course_id THEN
    RAISE EXCEPTION 'Updating "course_id" is not allowed';
  END IF;

  IF NEW.user_id <> OLD.user_id THEN
    RAISE EXCEPTION 'Updating "user_id" is not allowed';
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
CREATE TRIGGER before_course_item_update
BEFORE UPDATE ON public.course_item
FOR EACH ROW
WHEN (row_security_active('course_item'))
EXECUTE FUNCTION public.validate_course_item_update();

CREATE POLICY course_item_select_policy
ON public.course_item
FOR SELECT
USING (true);

CREATE POLICY course_item_delete_policy
ON public.course_item
FOR DELETE
USING (auth.uid() = user_id);

-- Enable RLS and create policies for the topic table
ALTER TABLE public.topic ENABLE ROW LEVEL SECURITY;

-- Topic table RLS policies
CREATE POLICY topic_update_policy
ON public.topic
FOR UPDATE
USING (auth.uid() = user_id);

-- Create the validation function
CREATE OR REPLACE FUNCTION public.validate_topic_update()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
   IF NEW.id <> OLD.id THEN
    RAISE EXCEPTION 'Updating "id" is not allowed';
  END IF;

  IF NEW.order_index <> OLD.order_index THEN
    RAISE EXCEPTION 'Updating "order_index" is not allowed';
  END IF;

  IF NEW.lesson_id <> OLD.lesson_id THEN
    RAISE EXCEPTION 'Updating "lesson_id" is not allowed';
  END IF;

  IF NEW.user_id <> OLD.user_id THEN
    RAISE EXCEPTION 'Updating "user_id" is not allowed';
  END IF;

  IF NEW.course_id <> OLD.course_id THEN
    RAISE EXCEPTION 'Updating "course_id" is not allowed';
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
CREATE TRIGGER before_topic_update
BEFORE UPDATE ON public.topic
FOR EACH ROW
WHEN (row_security_active('topic'))
EXECUTE FUNCTION public.validate_topic_update();

CREATE POLICY topic_select_policy
ON public.topic
FOR SELECT
USING (true);

CREATE POLICY topic_delete_policy
ON public.topic
FOR DELETE
USING (auth.uid() = user_id);

-- Create the update_updated_at() function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP IS NULL THEN
        RAISE EXCEPTION 'This function can only be called from a trigger context';
    END IF;

    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the triggers for the module, lesson, and topic tables
CREATE TRIGGER update_course_item_updated_at
BEFORE UPDATE ON public.course_item
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_topic_updated_at
BEFORE UPDATE ON public.topic
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- create the enum type
CREATE TYPE generating_status AS ENUM ('generating', 'idle');

-- add the status column to public.profile
ALTER TABLE public.profile ADD COLUMN generating_status generating_status DEFAULT 'idle';