import { SupabaseClient, User } from "@supabase/supabase-js";

export class RequestWrapper {
  url: URL;
  authorization: string | undefined;
  user: User | undefined;
  supabase: SupabaseClient | undefined;
  bodyAsJson: string | undefined;

  constructor(private request: Request, private env: Env) {
    this.url = new URL(request.url);
    this.authorization = request.headers.get("Authorization")?.replace("Bearer ", "");
  }

  getBody(): ReadableStream<Uint8Array> | null {
    return this.request.body;
  }

  async getBodyAsText(): Promise<string | undefined> {
    if(this.bodyAsJson) return this.bodyAsJson;
    this.bodyAsJson = await this.request.json();
    return this.bodyAsJson;
  }

  getHeaders(): Headers {
    return this.request.headers;
  }

  setHeader(key: string, value: string): void {
    this.request.headers.set(key, value);
  }

  getMethod(): string {
    return this.request.method;
  }

  getUrl(): URL {
    return this.url;
  }

  getEnv(): Env {
    return this.env;
  }

  getSupabaseUrl(): string {
    return this.env.SUPABASE_URL;
  }

  getSupabaseServiceRoleKey(): string {
    return this.env.SUPABASE_SERVICE_ROLE_KEY;
  }

  getHeliconeApiKey(): string {
    return this.env.HELICONE_API_KEY;
  }

  getOpenAIApiKey(): string {
    return this.env.OPENAI_API_KEY;
  }

  getAuthorization(): string | undefined {
    return this.authorization;
  }
}
