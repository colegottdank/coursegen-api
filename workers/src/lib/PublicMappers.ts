import { InternalGenerationLog } from "./InternalModels";
import { PublicGenerationLog } from "./PublicModels";

export function mapInternalToPublicGenerationLog(generationLog: InternalGenerationLog): PublicGenerationLog {
    let publicGenerationLog: PublicGenerationLog = {
        id: generationLog.id,
        reference_name: generationLog.reference_name,
        reference_type: generationLog.reference_type,
        reference_id: generationLog.reference_id,
        generator_user_id: generationLog.generator_user_id,
        owner_user_id: generationLog.owner_user_id,
        generation_status: generationLog.generation_status,
        created_at: generationLog.created_at,
        updated_at: generationLog.updated_at
    };

    return publicGenerationLog;
}
