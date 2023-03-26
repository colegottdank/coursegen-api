import { ICourseOutline } from './../models/internal/ICourseOutline.ts';
import { Configuration, OpenAIApi } from "openai";
import { CourseRequest } from "../dtos/course/CourseRequest.ts";
import * as prompts from "../consts/prompts.ts";
import { defaultMaxTokens, defaultProficiency, defaultSectionCount, defaultTemperature } from "../consts/defaults.ts";
import { CourseOutlineResponse } from "../dtos/course/CourseOutlineResponse.ts";
import { ISection } from "../models/internal/ISection.ts";

export class OpenAIClient {
  private openai: any;
  private config: any;

  constructor() {
    this.config = new Configuration({ apiKey: Deno.env.get("OPENAI_API_KEY") });
    console.log("OpenAI API Key: ", Deno.env.get("OPENAI_API_KEY"));
    this.openai = new OpenAIApi(this.config);
  }

  async createCourseOutline(courseRequest: CourseRequest): Promise<ICourseOutline> {
    const newUserMessage = `subject: ${courseRequest.subject}, 
    proficiency: ${ courseRequest.proficiency ?? defaultProficiency}, 
    sectionCount: ${ courseRequest.section_count ?? defaultSectionCount }`;

    const messages = [
      { role: "system", content: prompts.system1 },
      { role: "user", content: prompts.user1 },
      { role: "assistant", content: prompts.assistant1 },
      { role: "user", content: prompts.user1error },
      { role: "assistant", content: prompts.assistant1error },
      { role: "user", content: newUserMessage },
    ]

    console.log("Preparing to call OpenAI API");
    const completion = await this.openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      // model: "gpt-4",
      messages: messages,
      max_tokens: courseRequest.max_tokens ?? defaultMaxTokens,
      temperature: courseRequest.temperature ?? defaultTemperature,
    });
    console.log("OpenAI API call complete");

    const courseOutlineResponse = new CourseOutlineResponse(completion.data.choices[0].message!.content);
    courseOutlineResponse.validate(courseRequest.section_count ?? defaultSectionCount);

    const courseOutline: ICourseOutline = {
      Course: {
        title: courseOutlineResponse.response.data.course.title,
        description: courseOutlineResponse.response.data.course.description,
        dates: courseOutlineResponse.response.data.course.dates
      },
      Sections: courseOutlineResponse.response.data.course.sections.map((section, index) => {
        const mappedSection: ISection = {
          title: section.title,
          description: section.description,
          dates: section.dates,
          sectionOrder: index + 1,
          path: (index + 1).toString().padStart(2, "0")
        }
        return mappedSection;
      })
    }

    return courseOutline;
  }
}
