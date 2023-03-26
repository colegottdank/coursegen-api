import "xhr_polyfill";
import { serve } from "std/server";
import { HttpService } from "../_shared/util/httpservice.ts";
import { SectionContentRequest } from "../_shared/dtos/content/SectionContentRequest.ts";
import { OpenAIClient } from "../_shared/clients/OpenAIClient.ts";
import { SectionDao } from "../_shared/daos/SectionDao.ts";
import { ISection } from "../_shared/models/public/ISection.ts";
import { BadRequestError } from "../_shared/consts/errors/BadRequestError.ts";

const httpService = new HttpService(async (req: Request) => {
  const sectionContentRequest = new SectionContentRequest(await req.json());
  sectionContentRequest.Validate();

  // Initialize Supabase client
  const supabase = httpService.getSupabaseClient(req);

  const sectionDao = new SectionDao(supabase);
  const section = await sectionDao.getSectionBySectionId(sectionContentRequest.section_id!);

  if(section.content) {
    throw new BadRequestError("Section already has content");
  }

  sectionContentRequest.title = section.title

  const openAIClient = new OpenAIClient();
  const content = await openAIClient.createSectionContent(sectionContentRequest);
  console.log("post call", content)

  await sectionDao.updateSectionContentBySectionId(sectionContentRequest.section_id!, content);

  const publicSection: ISection = {
    id: section.id,
    title: section.title,
    dates: section.dates ?? undefined,
    description: section.description,
    content: content ?? undefined,
    path: section.path
  }

  return publicSection;
});

serve((req) => httpService.handle(req));
