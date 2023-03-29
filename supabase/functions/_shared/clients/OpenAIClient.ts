import { SupabaseClient } from "@supabase/supabase-js";
import { ICourseOutline } from "./../models/internal/ICourseOutline.ts";
import { Configuration, OpenAIApi } from "openai";
import { ICourseRequest } from "../dtos/course/CourseRequest.ts";
import * as prompts from "../consts/prompts.ts";
import { defaultMaxTokens, defaultProficiency, defaultSectionCount, defaultTemperature } from "../consts/defaults.ts";
import { CourseOutlineResponse } from "../dtos/course/CourseOutlineResponse.ts";
import { ISection } from "../models/internal/ISection.ts";
import { ISectionContentRequest } from "../dtos/content/SectionContentRequest.ts";
import { OpenAIError } from "../consts/errors/OpenAIError.ts";
import { SectionContentResponse } from "../dtos/content/SectionContentResponse.ts";
import { OpenAI } from "@openai/streams";

export class OpenAIClient {
  private openai: any;
  private config: any;

  constructor() {
    this.config = new Configuration({ apiKey: Deno.env.get("OPENAI_APIKEY") });
    this.openai = new OpenAIApi(this.config);
  }

  async createCourseOutline(courseRequest: ICourseRequest): Promise<ICourseOutline> {
    const newUserMessage = `Subject: ${courseRequest.subject}, 
    Proficiency: ${courseRequest.proficiency ?? defaultProficiency}, 
    Sections: ${courseRequest.section_count ?? defaultSectionCount}`;

    const messages = [
      { role: "system", content: prompts.course_outline_system2 },
      { role: "user", content: prompts.course_outline_user1 },
      { role: "assistant", content: prompts.course_outline_assistant1 },
      { role: "user", content: prompts.course_outline_user2error },
      { role: "assistant", content: prompts.course_outline_assistant2error },
      { role: "user", content: newUserMessage },
    ];

    let completion: any = undefined;
    try {
      completion = await this.openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: messages,
        max_tokens: courseRequest.max_tokens ?? defaultMaxTokens,
        temperature: courseRequest.temperature ?? defaultTemperature,
      });
    } catch (error) {
      if (error.response) {
        throw new OpenAIError(error.response.status, `Failed to retrieve course outline from OpenAI`);
      } else {
        throw new OpenAIError("500", `Failed to retrieve course outline from OpenAI`);
      }
    }

    if (!completion?.data?.choices[0]?.message?.content) {
      throw new OpenAIError("404", `Course outline not returned from OpenAI`);
    }

    const courseOutlineResponse = new CourseOutlineResponse(completion.data.choices[0].message.content);
    courseOutlineResponse.validate(courseRequest.section_count ?? defaultSectionCount);

    const courseOutline: ICourseOutline = {
      Course: {
        title: courseOutlineResponse.response.data.course.title,
        description: courseOutlineResponse.response.data.course.description,
        dates: courseOutlineResponse.response.data.course.dates,
      },
      Sections: courseOutlineResponse.response.data.course.sections.map((section, index) => {
        const mappedSection: ISection = {
          title: section.title,
          description: section.description,
          dates: section.dates,
          sectionOrder: index + 1,
          path: (index + 1).toString().padStart(2, "0"),
        };
        return mappedSection;
      }),
    };

    return courseOutline;
  }

  async createSectionContentStream(
    sectionContentRequest: ISectionContentRequest,
    supabase: SupabaseClient
  ): Promise<string> {
    const newUserMessage = `Section: ${sectionContentRequest.title}, Proficiency: ${
      sectionContentRequest.proficiency ?? defaultProficiency
    }`;

    const messages = [
      { role: "system", content: prompts.section_content_system1 },
      { role: "user", content: prompts.section_content_user1 },
      { role: "assistant", content: prompts.section_content_assistant1 },
      { role: "user", content: newUserMessage },
    ];

    const stream = await OpenAI(
      "chat",
      {
        // model: "gpt-3.5-turbo",
        model: "gpt-4",
        messages: messages,
        max_tokens: sectionContentRequest.max_tokens ?? defaultMaxTokens,
        temperature: sectionContentRequest.temperature ?? defaultTemperature,
      },
      {
        apiKey: Deno.env.get("OPENAI_APIKEY"),
      }
    );

    const channel = supabase.channel(`section_content_${sectionContentRequest.session_key}`);

    let subscribed = false;
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        subscribed = true;
        console.log("Subscribed to channel");
      } else if (status === "CLOSED") {
        console.log(status);
        console.log("Channel closed");
      } else if (status == "TIMED_OUT") {
        console.log(status);
        console.log("Channel timed out");
      } else if (status == "CHANNEL_ERROR") {
        console.log(status);
        console.log("Channel error");
      }
    });

    const decoder = new TextDecoder("utf-8");
    let content = "";
    for await (const chunk of stream) {
      const contentStr = decoder.decode(chunk);
      const parsedData = JSON.parse(contentStr);
      if (parsedData.content) {
        const parsedContent = parsedData.content;
        if (subscribed) {
          console.log(parsedContent);
          channel.send({ type: "broadcast", event: "section_content", parsedContent });
        }
        content += parsedContent;
      }
    }

    return content;
  }

  async createSectionContent(sectionContentRequest: ISectionContentRequest): Promise<string> {
    const newUserMessage = `Section: ${sectionContentRequest.title}, Proficiency: ${
      sectionContentRequest.proficiency ?? defaultProficiency
    }`;

    const messages = [
      { role: "system", content: prompts.section_content_system1 },
      { role: "user", content: prompts.section_content_user1 },
      { role: "assistant", content: prompts.section_content_assistant1 },
      { role: "user", content: prompts.section_content_user2error },
      { role: "assistant", content: prompts.section_content_assistant2error },
      { role: "user", content: newUserMessage },
    ];

    let completion: any = undefined;
    try {
      completion = await this.openai.createChatCompletion(
        {
          model: "gpt-3.5-turbo",
          // model: "gpt-4",
          messages: messages,
          max_tokens: sectionContentRequest.max_tokens ?? defaultMaxTokens,
          temperature: sectionContentRequest.temperature ?? defaultTemperature,
        },
        {
          timeout: 60000,
        }
      );
    } catch (error) {
      if (error?.response) {
        console.log("OpenAI error", error.response.data.error.message);
        throw new OpenAIError(error.response.status, `Failed to retrieve course outline from OpenAI`);
      } else {
        console.log("OpenAI error");
        throw new OpenAIError("500", `Failed to retrieve course outline from OpenAI`);
      }
    }

    console.log(completion);

    if (!completion?.data?.choices[0]?.message?.content) {
      throw new OpenAIError("404", `Course outline not returned from OpenAI`);
    }

    const sectionContentResponse = new SectionContentResponse(completion.data.choices[0].message.content);
    sectionContentResponse.validate();

    return sectionContentResponse.response.data.content;
  }
}

export const config = {
  runtime: "edge",
};
