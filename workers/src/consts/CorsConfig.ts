import { createCors } from "itty-router/createCors";

export const { preflight, corsify } = createCors({
    origins: ["*"],
    methods: ["OPTIONS"],
    headers: ["authorization, x-client-info, apikey, content-type"],
  });