import { corsHeaders } from './../consts/cors.ts';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from "../database.types.ts";

interface IErrorResponse {
  error: {
    code: number;
    message: string;
  };
}

export class HttpService {
  constructor(private handler: (req: Request) => Promise<any>) {}

  async handle(req: Request): Promise<Response> {
    // This is needed if you're planning to invoke your function from a browser.
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    try {
      const response = await this.handler(req);
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
      
    } catch (error) {
      let errorCode = error.code || 400;
      const errorResponse: IErrorResponse = { error: { code: errorCode, message: error.message } };
      return new Response(JSON.stringify(errorResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: errorCode,
      });
    }
  }

  getSupabaseClient(req: Request): SupabaseClient<Database> {
    return createClient<Database>(
      // Supabase API URL - env var exported by default.
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var exported by default.
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // Create client with Auth context of the user that called the function.
      // This way your row-level-security (RLS) policies are applied.
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
  }
}