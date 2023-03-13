import { corsHeaders } from './cors.ts';
import { SubjectResponse } from './pocos/subject/subject_response.ts';

export const HttpService = (handler: (req: Request) => Promise<Response>) => async (req: Request): Promise<Response> => {
    // This is needed if you're planning to invoke your function from a browser.
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    try {
      return await handler(req);
      
    } catch (error) {
      let errorCode = error.code || 400;
      const errorResponse: SubjectResponse = { error: { code: errorCode, message: error.message } };
      return new Response(JSON.stringify(errorResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: errorCode,
      });
    }
  }
