import { SupabaseClient } from "@supabase/supabase-js";
import { ICourseOutline } from "./../models/internal/ICourseOutline.ts";
import { Configuration, OpenAIApi } from "openai";
import { ICourseRequest } from "../dtos/course/CourseRequest.ts";
import * as new_course_prompts from "../consts/prompts/new_course_prompts.ts";
import * as section_content_prompts from "../consts/prompts/section_content_prompts.ts";
import { defaultMaxTokens, defaultProficiency, defaultSectionCount, defaultTemperature } from "../consts/defaults.ts";
import { CourseOutlineResponse } from "../dtos/course/CourseOutlineResponse.ts";
import { ISection, ISectionContent } from "../models/internal/ISection.ts";
import { ISectionContentRequest } from "../dtos/content/SectionContentRequest.ts";
import { OpenAIError } from "../consts/errors/OpenAIError.ts";
import { OpenAI } from "@openai/streams";
import { SectionContentResponse } from "../dtos/content/SectionContentResponse.ts";

export class OpenAIClient {
  private openai: any;
  private config: any;

  constructor() {
    this.config = new Configuration({ apiKey: Deno.env.get("OPENAI_APIKEY") });
    this.openai = new OpenAIApi(this.config);
  }

  async createCourseOutline(courseRequest: ICourseRequest): Promise<ICourseOutline> {
    let model = "gpt-4";
    // let model = "gpt-3.5-turbo";
    let messages;
    let user_message = courseRequest.search_text ?? courseRequest.subject;

    if (courseRequest.section_count != null) {
      user_message = `${user_message}. Section Count: ${courseRequest.section_count}`;
    }

    if (model === "gpt-4") {
      messages = [
        { role: "system", content: new_course_prompts.course_outline_system2 },
        { role: "user", content: user_message },
      ];
    } else if (model === "gpt-3.5-turbo") {
      messages = [{ role: "user", content: `${new_course_prompts.course_outline_system2}. Request: ${user_message} ` }];
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
        console.log(error);
        console.log(error.response);
        throw new OpenAIError(error.response.status, `Failed to retrieve course outline from OpenAI`, error.response, error);
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

  async generateHeaders(
    sectionContentRequest: ISectionContentRequest,
    courseOutline: string,
    model: string
  ): Promise<string[]> {
    let headerMessages;

    if (model === "gpt-4") {
      headerMessages = [
        {
          role: "system",
          content: section_content_prompts.header_request_1 + ". Existing course outline: " + courseOutline,
        },
        {
          role: "user",
          content: `Section: ${sectionContentRequest.title}, Proficiency: ${
            sectionContentRequest.proficiency ?? defaultProficiency
          }`,
        },
      ];
    } else if (model === "gpt-3.5-turbo") {
      headerMessages = [
        {
          role: "user",
          content:
            section_content_prompts.header_request_1 +
            ". Existing course outline: " +
            courseOutline +
            `, New section content request: Section: ${sectionContentRequest.title}, Proficiency: ${
              sectionContentRequest.proficiency ?? defaultProficiency
            }, }`,
        },
      ];
    }

    let completion: any = undefined;
    try {
      completion = await this.openai.createChatCompletion({
        model: model,
        messages: headerMessages,
        max_tokens: sectionContentRequest.max_tokens ?? defaultMaxTokens,
        temperature: sectionContentRequest.temperature ?? defaultTemperature,
      });
    } catch (error) {
      if (error.response) {
        throw new OpenAIError(error.response.status, `Failed to retrieve headers from OpenAI`);
      } else {
        throw new OpenAIError("500", `Failed to retrieve headers from OpenAI`);
      }
    }

    const headerJson = JSON.parse(completion.data.choices[0].message.content);
    const headers = headerJson["data"]["headers"];
    console.log(headers);

    return headers;
  }

  async createSectionContent(
    sectionContentRequest: ISectionContentRequest,
    courseOutline: string,
    headers: string[],
    model: string
  ): Promise<string[]> {
    // First generate headers
    const messages = headers.map((header: any) => {
      return [
        {
          role: "user",
          content:
            section_content_prompts.section_content_user_message1 +
            ". Existing course outline: " +
            courseOutline +
            `. Header to generate content for: ${header}. Section which the header belongs to: ${
              sectionContentRequest.title
            }, Proficiency for which to consider: ${sectionContentRequest.proficiency ?? defaultProficiency}, }`,
        },
      ];
    });

    // messages.forEach((message, index) => {
    //   console.log("Message " + index + ": ", message[0].content);
    // });

    const promises = messages.map((message: any) => {
      return this.openai.createChatCompletion({
        model: model,
        messages: message,
        max_tokens: sectionContentRequest.max_tokens ?? defaultMaxTokens,
        temperature: sectionContentRequest.temperature ?? defaultTemperature,
      });
    });

    let responses;
    try {
      responses = await Promise.all(promises);
    } catch (error) {
      if (error.response) {
        throw new OpenAIError(error.response.status, `Failed to retrieve section content from OpenAI`);
      } else {
        throw new OpenAIError("500", `Failed to retrieve section content from OpenAI`);
      }
    }

    let content: string[] = [];
    let contentStr = "";
    responses.forEach((response, index) => {
      contentStr += response.data.choices[0].message.content;
      content.push(response.data.choices[0].message.content);
    });

    return content;
  }

  async createSectionContentStream(
    sectionContentRequest: ISectionContentRequest,
    supabase: SupabaseClient
  ): Promise<ISectionContent[]> {
    const newUserMessage = `Section: ${sectionContentRequest.title}, Proficiency: ${
      sectionContentRequest.proficiency ?? defaultProficiency
    }`;

    let model = "gpt-4";
    // let model = "gpt-3.5-turbo";
    let messages;

    if (model === "gpt-4") {
      messages = [
        { role: "system", content: section_content_prompts.section_content_system1 },
        { role: "user", content: newUserMessage },
      ];
    } else if (model === "gpt-3.5-turbo") {
      messages = [
        {
          role: "user",
          content:
            section_content_prompts.section_content_system1 + `, New section content request: ${newUserMessage}}`,
        },
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

    const sectionContentResponse = new SectionContentResponse(content);
    sectionContentResponse.validate();

    const sectionContent: ISectionContent[] = sectionContentResponse.response.data.content.map((sectionContent) => ({
      header: sectionContent.header,
      text: sectionContent.text,
    }));

    return sectionContent;
  }
}

export const config = {
  runtime: "edge",
};
