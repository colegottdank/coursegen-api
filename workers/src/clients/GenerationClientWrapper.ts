import { GenerationLogDao } from "../daos/GenerationLogDao";
import { InternalGenerationReferenceType, InternalGenerationStatus } from "../lib/InternalModels";
import { ToInternalGenerationLog } from "../lib/Mappers";

export class GenerationWrapper {
    private generationLogDao: GenerationLogDao;

    constructor(private supabaseClient: any) {
        this.generationLogDao = new GenerationLogDao(this.supabaseClient);
    }

    async wrapGenerationRequest<T>(
        generator_user_id: string,
        owner_user_id: string,
        referenceName: string,
        referenceId: string,
        referenceType: InternalGenerationReferenceType,
        requestCallback: () => Promise<T>
    ): Promise<T> {
        // Insert initial InProgress generation log
        const generationLog = ToInternalGenerationLog(
            referenceName,
            referenceId,
            generator_user_id,
            owner_user_id,
            referenceType,
            InternalGenerationStatus.InProgress
        );
        await this.generationLogDao.insertGenerationLog(generationLog);

        try {
            // Execute the actual request logic
            const result = await requestCallback();

            // Update generation log to Success
            await this.generationLogDao.updateGenerationLogStatus(
                generationLog.id!,
                InternalGenerationStatus.Success
            );

            return result;
        } catch (error) {
            // Update generation log to Failure
            await this.generationLogDao.updateGenerationLogStatus(
                generationLog.id!,
                InternalGenerationStatus.Failure
            );

            throw error;
        }
    }
}
