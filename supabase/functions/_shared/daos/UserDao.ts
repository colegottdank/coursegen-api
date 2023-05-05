import { SupabaseClient, User } from "@supabase/supabase-js";
import { SupabaseError } from "../consts/errors/Errors.ts";
import { Database } from "../database.types.ts";

export class UserDao {
    constructor(private supabase: SupabaseClient) {}

    async getUserByRequest(req: Request): Promise<User | null>{
      let header = req.headers.get('Authorization')?.replace("Bearer ","");
      if(!header) return null;

      const user = await this.supabase.auth.getUser(header);
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

    async updateProfileGeneratingStatus(
      user_id: string,
      generating_status: string
    ): Promise<void> {
      const { error } = await this.supabase
        .from("profile")
        .update({ generating_status: generating_status })
        .eq('id', user_id);
  
      if (error) {
        throw new SupabaseError(error.code, `Failed to update profile generating status`);
      }
    }
}
  