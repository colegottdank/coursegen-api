// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import "xhr_polyfill";
import { serve } from "std/server";
import { Configuration, OpenAIApi } from "openai";
import { system1, user1, assistant1, assistant1error, user1error, system } from "../_shared/prompts.ts";
import { AssistantResponse } from "../_shared/pocos/course.ts";

const config = new Configuration({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

interface req {
  subject: string;
  proficiency: string;
  sectionCount: number;
}

console.log("OpenAI Function Up!");
serve(async (req) => {
  try {
    // Parse request parameters
    const { subject, proficiency, sectionCount } = (await req.json()) as req;

    // Initialize new OpenAI API client
    const openai = new OpenAIApi(config);

    // Create a completion
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: system1 },
        { role: "user", content: user1 },
        { role: "assistant", content: assistant1 },
        { role: "assistant", content: assistant1error },
        { role: "user", content: user1error },
        { role: "user", content: "subject: " + subject + ", proficiency: " + proficiency + ", sectionCount: " + sectionCount }
      ],
      max_tokens: 1000,
      temperature: 0.25,
    });

    // const completion = await openai.createChatCompletion({
    //   model: "gpt-3.5-turbo",
    //   messages: [
    //     { role: "system", content: system },
    //     { role: "user", content: "subject: " + subject + ", proficiency: " + proficiency + ", sectionCount: " + sectionCount }
    //   ],
    //   max_tokens: 1000,
    //   temperature: 0.25,
    // });

    // Parse the completion response
    const message: string = completion.data.choices[0].message!.content;
    console.log(message)
    const assistantResponse: AssistantResponse = JSON.parse(message);

    if(assistantResponse.success === false) {
      throw new Error(assistantResponse.error.code + " " + assistantResponse.error.message);
    }

    // Return a response with the parsed course object
    return new Response(JSON.stringify(assistantResponse), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);

    return new Response(error.message, {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});

// To invoke:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/' \
//   --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
//   --header 'Content-Type: application/json' \
//   --data '{"name":"Functions"}'
