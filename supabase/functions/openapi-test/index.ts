// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import "xhr_polyfill";
import { serve } from "std/server";
import { corsHeaders } from '../_shared/cors.ts'
import { Configuration, OpenAIApi } from "openai";
import * as prompts from "../_shared/prompts.ts";
import * as request from "../_shared/pocos/subject/subject_request.ts";
import * as response from "../_shared/pocos/subject/subject_response.ts";
import * as assistant from "../_shared/pocos/subject/assistant_response.ts";

const config = new Configuration({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

console.log("OpenAI Function Up!"); 
serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request parameters
    const subjectRequest: request.SubjectRequest = (await req.json());
    const newUserMessage = `subject: ${subjectRequest.subject}, proficiency: ${subjectRequest.proficiency ?? request.defaultProficiency}, sectionCount: ${subjectRequest.section_count ?? request.defaultSectionCount}`;
    request.ValidateCourseRequest(subjectRequest, newUserMessage);

    console.log("Request: " + JSON.stringify(subjectRequest))

    // Initialize new OpenAI API client
    const openai = new OpenAIApi(config);

    // Create a completion
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: prompts.system1 },
        { role: "user", content: prompts.user1 },
        { role: "assistant", content: prompts.assistant1 },
        { role: "user", content: prompts.user1error },
        { role: "assistant", content: prompts.assistant1error },
        { role: "user", content: newUserMessage }
      ],
      max_tokens: (subjectRequest.max_tokens ?? request.defaultMaxTokens),
      temperature: (subjectRequest.temperature ?? request.defaultTemperature),
    });

    // Parse the completion response
    const message: string = completion.data.choices[0].message!.content;
    console.log("Response: " + message)
    const assistantResponse: assistant.AssistantResponse = JSON.parse(message);
    assistant.ValidateAssistantResponse(assistantResponse, (subjectRequest.section_count ?? request.defaultSectionCount));

    const subjectResponse: response.SubjectResponse = response.MapAssistantResponseToSubjectResponse(assistantResponse);

    // Return a response with the parsed course object
    return new Response(JSON.stringify(subjectResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(error);
    return new Response(error.message, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});