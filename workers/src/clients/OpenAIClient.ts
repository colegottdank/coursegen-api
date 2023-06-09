import * as defaults from "../consts/Defaults";
import { OpenAIError, OpenAIInvalidResponseError } from "../consts/Errors";
import { InternalCourse, InternalTopic } from "../lib/InternalModels";
import * as Mappers from "../lib/Mappers";
import { ILessonContentPost as ILessonContentRequestPost } from "../dtos/TopicDto";
import { ICourseRequestPost } from "../dtos/CourseDtos";
import * as NewCoursePrompts from "../consts/NewCoursePrompts";
import * as LessonPrompts from "../consts/LessonPrompts";
import { CourseOutlineResponse, IOpenAIResponse, LessonContentResponse } from "./OpenAIResponses";
import { RequestWrapper } from "../router";

export class OpenAIClient {
  private chatClient: any;
  private langchain: any;

  constructor(private request: RequestWrapper) {}

  private async loadChatClient() {
    if (!this.chatClient) {
      await import("langchain/chat_models/openai").then(({ ChatOpenAI }) => {
        this.chatClient = new ChatOpenAI(
          {
            openAIApiKey: this.request.env.OPENAI_API_KEY,
          },
          {
            basePath: "https://oai.hconeai.com/v1",
            baseOptions: {
              headers: {
                "Helicone-Auth": `Bearer ${this.request.env.HELICONE_API_KEY}`,
              },
            },
          }
        );
      });
    }

    return this.chatClient;
  }


  private async loadLangchainSchema() {
    if (!this.langchain) {
      this.langchain = await import("langchain/schema");
    }
    return this.langchain;
  }

  // Wrapper for OpenAI's chat API that handles
  // - Token count limit
  // - Retries due to invalid JSON
  // - Parsing & validation of response
  private async createChatCompletion<T extends IOpenAIResponse>(
    model: string,
    messages: any[],
    responseType: new (responseText: string) => T,
    maxTokens?: number,
    temperature?: number
  ): Promise<T> {
    await this.loadChatClient();
    let gpt_tokenizer = await import("gpt-tokenizer");
    console.log(`About to do this chat completion jawn, here is the client: ${this.chatClient}`)
    const tokens = gpt_tokenizer.encode(JSON.stringify(messages));
    if (model == defaults.gpt4) this.chatClient.maxTokens = defaults.gpt4MaxTokens - tokens.length;
    else this.chatClient.maxTokens = defaults.gpt35MaxTokens - tokens.length;
    this.chatClient.temperature = temperature ?? defaults.defaultTemperature;
    this.chatClient.modelName = model;

    let json = "";
    try {
      const response = await this.chatClient.call(messages);
      json = response.text.substring(response.text.indexOf("{"), response.text.lastIndexOf("}") + 1);
      const parsedResponse = new responseType(json);
      parsedResponse.validate();
      return parsedResponse;
    } catch (error: any) {
      if (error instanceof OpenAIError || error instanceof OpenAIInvalidResponseError) {
        throw error;
      } else {
        // If the error is due to parsing the response, try to fix the JSON
        const { HumanChatMessage } = await this.loadLangchainSchema();
        this.chatClient.modelName = defaults.gpt35;
        const fixedResponse = await this.chatClient.call([
          new HumanChatMessage(
            "Please fix and return just the json that may or may not be invalid. Do not return anything that is not JSON." +
              error.message +
              "JSON to fix: " +
              json
          ),
        ]);

        json = fixedResponse.text.substring(fixedResponse.text.indexOf("{"), fixedResponse.text.lastIndexOf("}") + 1);
        const fixedParsedResponse = new responseType(json);
        fixedParsedResponse.validate();
        return fixedParsedResponse;
      }
    }
  }

  // GPT-4
  async createCourseOutlineTitles(courseRequest: ICourseRequestPost, model: string): Promise<InternalCourse> {
    const { HumanChatMessage, SystemChatMessage } = await this.loadLangchainSchema();
    let user_message = courseRequest.search_text;
    // if (courseRequest.module_count != null) {
    //   user_message = `${user_message}. Module Count: ${courseRequest.module_count}`;
    // }

    let messages;
    if (model == defaults.gpt4) {
      messages = [new SystemChatMessage(NewCoursePrompts.course_outline_titles), new HumanChatMessage(user_message!)];
    } else {
      messages = [
        new HumanChatMessage(`${NewCoursePrompts.course_outline_titles}. Course Request Text: ${user_message}`),
      ];
    }

    const response = await this.createChatCompletion(model, messages, CourseOutlineResponse, undefined, undefined);

    return Mappers.mapExternalCourseOutlineResponseToInternal(response.response);
  }

  // GPT-3.5 Chained
  async createCourseOutline(courseRequest: ICourseRequestPost): Promise<InternalCourse> {
    const { HumanChatMessage, SystemChatMessage } = await this.loadLangchainSchema();

    let courseOutlineMsgs1 = [
      new HumanChatMessage(`${NewCoursePrompts.course_outline_1}. Course Request Text: ${courseRequest.search_text}`),
    ];

    const initialCourseOutline = await this.createChatCompletion(
      defaults.gpt35,
      courseOutlineMsgs1,
      CourseOutlineResponse,
      undefined,
      undefined
    );

    let courseOutlineMsgs2 = [
      new HumanChatMessage(
        `${NewCoursePrompts.course_outline_improve}. Initial course outline: ${JSON.stringify(
          initialCourseOutline.response.data
        )}. Course Request Text: ${courseRequest.search_text}.`
      ),
    ];

    const improvedCourseOutline = await this.createChatCompletion(
      defaults.gpt35,
      courseOutlineMsgs2,
      CourseOutlineResponse,
      undefined,
      undefined
    );

    return Mappers.mapExternalCourseOutlineResponseToInternal(improvedCourseOutline.response);
  }

  // GPT-3.5 Chained
  async createLessonContent(
    lessonRequest: ILessonContentRequestPost,
    lessonTitle: string,
    courseOutline: string,
    searchText: string,
    userId: string
  ): Promise<InternalTopic[]> {
    const { HumanChatMessage, SystemChatMessage } = await this.loadLangchainSchema();

    const lessonContentMsgs = [
      new HumanChatMessage(
        `${LessonPrompts.lesson_content_request}. Existing course outline: ${courseOutline}. Initial course request text: ${searchText}. Lesson to generate content for: ${lessonTitle}.`
      ),
    ];

    let initialLessonContent = await this.createChatCompletion(
      defaults.gpt35,
      lessonContentMsgs,
      LessonContentResponse,
      undefined,
      undefined
    );

    const improveLessonContentMsgs = [
      new HumanChatMessage(
        `${
          LessonPrompts.improve_lesson_content_request
        }. Existing course outline: ${courseOutline}. Initial course request text: ${searchText}. Lesson title that content was previously generated for: ${lessonTitle}. Generated lesson content from previous request: ${JSON.stringify(
          initialLessonContent.response.data
        )}.`
      ),
    ];

    let improvedLessonContent = await this.createChatCompletion(
      defaults.gpt35,
      improveLessonContentMsgs,
      LessonContentResponse,
      undefined,
      undefined
    );

    let internalTopics = Mappers.mapExternalTopicsToInternalTopics(
      improvedLessonContent.response,
      lessonRequest,
      userId
    );

    return internalTopics;
  }
}
