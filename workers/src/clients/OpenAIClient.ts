import * as defaults from "../consts/Defaults";
import { OpenAIError, OpenAIInvalidResponseError } from "../consts/Errors";
import { InternalCourse, InternalTopic } from "../lib/InternalModels";
import * as Mappers from "../lib/Mappers";
import { ILessonContentPost as ILessonContentRequestPost } from "../dtos/TopicDto";
import { ICourseRequestPost } from "../dtos/CourseDtos";
import * as NewCoursePrompts from "../consts/prompts/course/NewCoursePrompts";
import * as LessonPrompts from "../consts/prompts/lesson/LessonPrompts";
import {
  CourseOutlineResponse,
  IOpenAIResponse,
  CourseContentResponse,
  LessonContentResponse,
  ILesson,
} from "./OpenAIResponses";
import { Env } from "../worker";
import { Outline_0_0_1_ } from "../consts/prompts/course/Outline_0.0.1";
import { FullCourse_0_0_1 } from "../consts/prompts/lesson/FullCourse_0.0.1";

export class OpenAIClient {
  private langchainSchema: any;
  private langchainPrompts: any;

  constructor(private env: Env) {}

  private async loadChatClient(): Promise<any>{
    let chatClient;
    if (!chatClient) {
      await import("langchain/chat_models/openai").then(({ ChatOpenAI }) => {
        chatClient = new ChatOpenAI(
          {
            openAIApiKey: this.env.OPENAI_API_KEY,
          },
          {
            basePath: "https://oai.hconeai.com/v1",
            baseOptions: {
              headers: {
                "Helicone-Auth": `Bearer ${this.env.HELICONE_API_KEY}`,
                // "helicone-increase-timeout": true,
                // "Connection": "keep-alive"
              },
            },
          }
        );
      });
    }

    return chatClient;
  }

  private async loadLangchainSchema() {
    if (!this.langchainSchema) {
      this.langchainSchema = await import("langchain/schema");
    }
    return this.langchainSchema;
  }

  private async loadLangchainPrompts() {
    if (!this.langchainPrompts) {
      this.langchainPrompts = await import("langchain/prompts");
    }
    return this.langchainPrompts;
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
    let chatClient = await this.loadChatClient();
    let gpt_tokenizer = await import("gpt-tokenizer");
    const tokens = gpt_tokenizer.encode(JSON.stringify(messages));
    if (model == defaults.gpt4) chatClient.maxTokens = defaults.gpt4MaxTokens - tokens.length;
    else if (model == defaults.gpt35) chatClient.maxTokens = defaults.gpt35MaxTokens - tokens.length;
    else if (model == defaults.gpt3516k) chatClient.maxTokens = defaults.gpt3516kMaxTokens - tokens.length;
    chatClient.temperature = temperature ?? defaults.defaultTemperature;
    chatClient.modelName = model;

    let json = "";
    try {
      console.log(`Model: ${chatClient.modelName}`);
      console.log(`Max tokens: ${chatClient.maxTokens}`);
      console.log(`Temperature: ${chatClient.temperature}`);
      console.log("Calling OpenAI API", JSON.stringify(messages));
      const response = await chatClient.call(messages);
      console.log("OpenAI API response received");
      json = response.text.substring(response.text.indexOf("{"), response.text.lastIndexOf("}") + 1);
      console.log("JSON: " + json);
      const parsedResponse = new responseType(json);
      parsedResponse.validate();
      return parsedResponse;
    } catch (error: any) {
      if (error instanceof OpenAIError || error instanceof OpenAIInvalidResponseError || model == defaults.gpt3516k) {
        throw error;
      } else {
        // If the error is due to parsing the response, try to fix the JSON
        const { HumanChatMessage } = await this.loadLangchainSchema();
        chatClient.modelName = defaults.gpt35;
        const fixedResponse = await chatClient.call([
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

    const { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } =
      await this.loadLangchainPrompts();

    const chatPrompt = ChatPromptTemplate.fromPromptMessages([
      SystemMessagePromptTemplate.fromTemplate(Outline_0_0_1_),
      HumanMessagePromptTemplate.fromTemplate(courseRequest.search_text!),
    ]);

    const responseC = await chatPrompt.formatPromptValue({
      course_request: courseRequest.search_text!,
    });

    const messages = responseC.toChatMessages();

    // let user_message = courseRequest.search_text;
    // // if (courseRequest.module_count != null) {
    // //   user_message = `${user_message}. Module Count: ${courseRequest.module_count}`;
    // // }

    // let messages;
    // if (model == defaults.gpt4) {
    //   messages = [new SystemChatMessage(NewCoursePrompts.course_outline_titles), new HumanChatMessage(user_message!)];
    // } else {
    //   messages = [
    //     new HumanChatMessage(`${NewCoursePrompts.course_outline_titles}. Course Request Text: ${user_message}`),
    //   ];
    // }

    const response = await this.createChatCompletion(model, messages, CourseOutlineResponse, undefined, undefined);

    return Mappers.mapExternalCourseOutlineResponseToInternal(response.response);
  }

  // 16k model
  async createCourseContent(course: any, searchText: string): Promise<ILesson[]> {
    const { HumanChatMessage, SystemChatMessage } = await this.loadLangchainSchema();

    const { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } =
      await this.loadLangchainPrompts();

    const chatPrompt = ChatPromptTemplate.fromPromptMessages([
      HumanMessagePromptTemplate.fromTemplate(FullCourse_0_0_1),
    ]);

    const responseC = await chatPrompt.formatPromptValue({
      course_request: searchText,
      course: JSON.stringify(course, null, 2),
    });

    let messages = responseC.toChatMessages();

    let lessonContent = await this.createChatCompletion(
      defaults.gpt3516k,
      messages,
      CourseContentResponse,
      undefined,
      undefined
    );

    return lessonContent.response.data.lessons;
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
