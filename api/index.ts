import server from "../dist/server/server.js";

export default async function handler(request: Request): Promise<Response> {
  return (server as { fetch: (req: Request, env?: unknown, ctx?: unknown) => Promise<Response> }).fetch(
    request,
    {},
    {},
  );
}
