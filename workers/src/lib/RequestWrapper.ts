import { SupabaseClient, User, createClient } from "@supabase/supabase-js";

export class RequestWrapper {
  url: URL;
  authorization: string | undefined;
  user: User | undefined;
  supabase: SupabaseClient | undefined;

  constructor(private request: Request, private env: Env) {
    this.url = new URL(request.url);
    this.authorization = request.headers.get("Authorization")?.replace("Bearer ", "");
  }

  async getUser(request: Request): Promise<User | null> {
    if (this.user) return this.user;
    if (!this.authorization) return null;

    this.supabase = createClient(this.env.SUPABASE_URL, this.env.SUPABASE_SERVICE_ROLE_KEY);
    const user = await this.supabase.auth.getUser(this.authorization);
    this.user = user?.data?.user ?? undefined;
    return user?.data?.user;
  }

  getBody(): ReadableStream<Uint8Array> | null {
    return this.request.body;
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
}
