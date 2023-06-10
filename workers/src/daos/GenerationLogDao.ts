import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../consts/database.types";
import { InternalGenerationLog, InternalGenerationStatus } from "../lib/InternalModels";
import { SupabaseError } from "../consts/Errors";
import { ToInternalGenerationLogFromDb, ToInternalGenerationLogFromDbArray } from "../lib/Mappers";

export class GenerationLogDao {
  constructor(private supabaseClient: SupabaseClient<Database>) {}

  async insertGenerationLog(generationLog: InternalGenerationLog): Promise<void> {
    const { error } = await this.supabaseClient.from("generation_log").insert({
      id: generationLog.id,
      reference_name: generationLog.reference_name,
      reference_id: generationLog.reference_id,
      reference_type: generationLog.reference_type,
      generation_status: generationLog.generation_status,
      generator_user_id: generationLog.generator_user_id,
      owner_user_id: generationLog.owner_user_id,
    });

    if (error) {
      throw new SupabaseError(
        "422",
        `Failed to insert generation log ${generationLog.id}. Error message: ${error.message}. Error code: ${error.code}`
      );
    }
  }

  async updateGenerationLogStatus(generationLogId: string, generationStatus: InternalGenerationStatus): Promise<void> {
    const { error } = await this.supabaseClient
      .from("generation_log")
      .update({
        generation_status: generationStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", generationLogId)
      .eq("generation_status", InternalGenerationStatus.InProgress);

    if (error) {
      throw new SupabaseError(
        "422",
        `Failed to update generation log ${generationLogId} status to ${generationStatus}. Error message: ${error.message}. Error code: ${error.code}`
      );
    }
  }

  async getGenerationLogByUserIdAndStatus(
    userId: string,
    generationStatuses: InternalGenerationStatus[]
  ): Promise<InternalGenerationLog[]> {
    const { data, error } = await this.supabaseClient
      .from("generation_log")
      .select("*")
      .eq("generator_user_id", userId)
      .in("generation_status", generationStatuses);

    if (error) {
      throw new SupabaseError(
        "422",
        `Failed to get generation logs for user ${userId} with status ${generationStatuses}. Error message: ${error.message}. Error code: ${error.code}`
      );
    }

    return ToInternalGenerationLogFromDbArray(data);
  }

  async getRecentGenerationLogsByUserIdAndStatus(
    userId: string,
    generationStatuses: InternalGenerationStatus[],
    recentInMinutes: number
  ): Promise<InternalGenerationLog[]> {
    const { data, error } = await this.supabaseClient
      .from("generation_log")
      .select("*")
      .eq("generator_user_id", userId)
      .in("generation_status", generationStatuses)
      .gte("updated_at", new Date(Date.now() - recentInMinutes * 60000).toISOString());

    if (error) {
      throw new SupabaseError(
        "422",
        `Failed to get generation logs for user ${userId} with status ${generationStatuses} since . Error message: ${error.message}. Error code: ${error.code}`
      );
    }

    return ToInternalGenerationLogFromDbArray(data);
  }

  async getGenerationLogByReferenceIdAndStatus(
    referenceId: string,
    generationStatuses: InternalGenerationStatus[]
  ): Promise<InternalGenerationLog | null> {
    const { data, error } = await this.supabaseClient
      .from("generation_log")
      .select("*")
      .eq("reference_id", referenceId)
      .in("generation_status", generationStatuses)
      .single();

    if (error) {
      throw new SupabaseError(
        "422",
        `Failed to get generation logs for reference ${referenceId} with status ${generationStatuses}. Error message: ${error.message}. Error code: ${error.code}`
      );
    }

    if (!data) {
      return null;
    }

    return ToInternalGenerationLogFromDb(data);
  }
}
