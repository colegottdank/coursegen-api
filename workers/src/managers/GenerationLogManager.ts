import { GenerationLogDao } from "../daos/GenerationLogDao";
import { InternalGenerationStatus } from "../lib/InternalModels";
import { mapInternalToPublicGenerationLog } from "../lib/PublicMappers";
import { RequestWrapper } from "../router";

export class GenerationLogManager {
  async getGenerationLogsByUser(request: RequestWrapper) {
    const { supabaseClient, user } = request;

    const generationLogDao = new GenerationLogDao(supabaseClient);
    let generationLogs = await generationLogDao.getRecentGenerationLogsByUserIdAndStatus(
      user!.id,
      [InternalGenerationStatus.Failure, InternalGenerationStatus.Success, InternalGenerationStatus.InProgress],
      10
    );

    generationLogs.forEach((generationLog) => {
      return mapInternalToPublicGenerationLog(generationLog);
    });

    return generationLogs;
  }
}