import { generationLogLookBackPeriodMinutes } from "../consts/Defaults";
import { GenerationLogDao } from "../daos/GenerationLogDao";
import { InternalGenerationStatus } from "../lib/InternalModels";
import { mapInternalToPublicGenerationLog } from "../lib/PublicMappers";
import { RequestWrapper } from "../router";

export class GenerationLogManager {
  async getGenerationLogsByUser(request: RequestWrapper) {
    const { supabaseClient, user, query } = request;
    let lookback_period_minutes = Number(query.lookback_period_minutes);
    console.log(lookback_period_minutes);

    if (isNaN(lookback_period_minutes)) {
      lookback_period_minutes = generationLogLookBackPeriodMinutes;
    }

    const generationLogDao = new GenerationLogDao(supabaseClient);
    let generationLogs = await generationLogDao.getRecentGenerationLogsByUserIdsAndStatus(
      user!.id,
      [
        InternalGenerationStatus.Failure,
        InternalGenerationStatus.Timeout,
        InternalGenerationStatus.Success,
        InternalGenerationStatus.InProgress,
      ],
      lookback_period_minutes
    );

    generationLogs.forEach((generationLog) => {
      return mapInternalToPublicGenerationLog(generationLog);
    });

    return generationLogs;
  }
}
