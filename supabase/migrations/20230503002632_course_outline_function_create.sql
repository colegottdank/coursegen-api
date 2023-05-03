CREATE OR REPLACE FUNCTION get_course_outline(course_id_input uuid)
RETURNS jsonb AS $$
WITH RECURSIVE item_tree AS (
  SELECT
    ci.id,
    ci.parent_id,
    ci.title,
    ci.description,
    ci.dates,
    ci.order_index,
    ci.type,
    ci.course_id,
    ci.user_id,
    0 AS depth
  FROM
    public.course_item ci
  WHERE
    ci.course_id = course_id_input
    AND ci.parent_id IS NULL

  UNION ALL

  SELECT
    ci.id,
    ci.parent_id,
    ci.title,
    ci.description,
    ci.dates,
    ci.order_index,
    ci.type,
    ci.course_id,
    ci.user_id,
    it.depth + 1
  FROM
    public.course_item ci
    JOIN item_tree it ON ci.parent_id = it.id
)
SELECT
  jsonb_build_object(
    'id', c.id,
    'title', c.title,
    'description', c.description,
    'items', jsonb_agg(
      jsonb_build_object(
        'id', it1.id,
        'title', it1.title,
        'description', it1.description,
        'order_index', it1.order_index,
        'type', it1.type,
        'items', (
          SELECT
            jsonb_agg(
              jsonb_build_object(
                'id', it2.id,
                'parent_id', it2.parent_id,
                'title', it2.title,
                'description', it2.description,
                'dates', it2.dates,
                'order_index', it2.order_index,
                'type', it2.type
              )
            )
          FROM
            item_tree it2
          WHERE
            it2.parent_id = it1.id
          ORDER BY
            it2.order_index
        )
      )
    )
  )
FROM
  public.course c
  JOIN item_tree it1 ON c.id = it1.course_id
WHERE
  c.id = course_id_input
  AND it1.depth = 0
GROUP BY
  c.id,
  c.title,
  c.description
$$ LANGUAGE sql;
