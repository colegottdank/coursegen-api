import { SupabaseClient, User } from "@supabase/supabase-js";
import { Database } from "../consts/database.types";
import { SupabaseError } from "../consts/Errors";

export class UserDao {
    constructor(private supabase: SupabaseClient) {}

    async getUserByAuthHeader(authHeader: string): Promise<User | null>{
      const user = await this.supabase.auth.getUser(authHeader);
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
        throw new SupabaseError("422", `Failed to retrieve profile`, error.code);
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
        throw new SupabaseError("422", `Failed to update profile generating status`, error.code);
      }
    }
}
  