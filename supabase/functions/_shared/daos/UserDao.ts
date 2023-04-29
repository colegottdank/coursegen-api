import { SupabaseClient, User } from "@supabase/supabase-js";
import { Database } from "../database.types.ts";
import { SupabaseError } from "../consts/errors/SupabaseError.ts";

export class UserDao {
    constructor(private supabase: SupabaseClient) {}

    async getUserByRequest(req: Request): Promise<User | null>{
        const user = await this.supabase.auth.getUser(req.headers.get('Authorization')!.replace("Bearer ",""));

        return user?.data?.user;
    }
  
    async getProfileByUserId(
      user_id: string
    ): Promise<Database["public"]["Tables"]["profile"]["Row"]> {
      const { data, error } = await this.supabase
        .from("profile")
        .select("*")
        .eq('id', user_id)
        .returns<Database["public"]["Tables"]["profile"]["Row"]>()
        .single();
  
      if (error) {
        throw new SupabaseError(error.code, `Failed to retrieve profile`);
      }
  
      if (!data) {
          throw new SupabaseError("404", `Failed to retrieve profile`);
      }
  
      return data;
    }
}
  