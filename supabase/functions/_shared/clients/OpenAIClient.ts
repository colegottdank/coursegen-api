import { SupabaseClient } from "@supabase/supabase-js";
import { ICourseOutline } from "./../models/internal/ICourseOutline.ts";
import { Configuration, OpenAIApi } from "openai";
import { ICourseRequest } from "../dtos/course/CourseRequest.ts";
import * as new_course_prompts from "../consts/prompts/new_course_prompts.ts";
import * as section_content_prompts from "../consts/prompts/section_content_prompts.ts";
import { defaultMaxTokens, defaultProficiency, defaultSectionCount, defaultTemperature } from "../consts/defaults.ts";
import { CourseOutlineResponse } from "../dtos/course/CourseOutlineResponse.ts";
import { ISection } from "../models/internal/ISection.ts";
import { ISectionContentRequest } from "../dtos/content/SectionContentRequest.ts";
import { OpenAIError } from "../consts/errors/OpenAIError.ts";
import { OpenAI } from "@openai/streams";

export class OpenAIClient {
  private openai: any;
  private config: any;

  constructor() {
    this.config = new Configuration({ apiKey: Deno.env.get("OPENAI_APIKEY") });
    this.openai = new OpenAIApi(this.config);
  }

  async createCourseOutline(courseRequest: ICourseRequest): Promise<ICourseOutline> {
    // let model = "gpt-4";
    let model = "gpt-3.5-turbo";
    let messages;
    let user_message = courseRequest.search_text ?? courseRequest.subject;

    if(courseRequest.section_count != null)
    {
      user_message = `${user_message}. Section Count: ${courseRequest.section_count}`;
    }

    if(model === "gpt-4") {
      messages = [
        { role: "system", content: new_course_prompts.course_outline_system2 },
        { role: "user", content: user_message },
      ]
    }
    else if (model === "gpt-3.5-turbo") {
      messages = [
        { role: "user", content: `${new_course_prompts.course_outline_system2}. Request: ${user_message} ` },
      ]
    }

    let completion: any = undefined;
    try {
      completion = await this.openai.createChatCompletion({
        // model: "gpt-3.5-turbo",
        model: "gpt-4",
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
    courseOutlineResponse.validate();

    const courseOutline: ICourseOutline = {
      Course: {
        title: courseOutlineResponse.response.data.course.title,
        description: courseOutlineResponse.response.data.course.description,
        dates: courseOutlineResponse.response.data.course.dates,
      },
      Sections: courseOutlineResponse.response.data.sections.map((section, index) => {
        const mappedSection: ISection = {
          title: section.title,
          description: section.description,
          dates: section.dates,
          path: (index + 1).toString().padStart(2, "0"),
        };
        return mappedSection;
      }),
    };

    return courseOutline;
  }

  async createSectionContentStream(sectionContentRequest: ISectionContentRequest, supabase: SupabaseClient): Promise<string> {
    const newUserMessage = `Section: ${sectionContentRequest.title}, Proficiency: ${
      sectionContentRequest.proficiency ?? defaultProficiency
    }`;

    // let model = "gpt-4";
    let model = "gpt-3.5-turbo";
    let messages;

    if(model === "gpt-4") {
      messages = [
        { role: "system", content: section_content_prompts.section_content_system1 },
        { role: "user", content: newUserMessage },
      ];
    }
    else if (model === "gpt-3.5-turbo") {
      messages = [
        { role: "user", content: section_content_prompts.section_content_system1 + `, New section content request: ${newUserMessage}}` }
      ];
    }

    const stream = await OpenAI(
      "chat",
      {
        model: model,
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
      const chunkStr = decoder.decode(chunk);
      if (chunkStr) {
        if (subscribed) {
          channel.send({ type: "broadcast", event: "section_content", chunkStr });
        }
        content += chunkStr;
      }
    }

    return content;
  }
}

export const config = {
  runtime: "edge",
};
