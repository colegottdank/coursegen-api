import { Database } from "../database.types.ts";
import { ICourse } from "../models/internal/ICourse.ts";

export const mapCourseFromDb = (row: Database["public"]["Tables"]["course"]["Row"]): ICourse => {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      dates: row.dates ?? undefined,
      userId: row.user_id
    };
  };