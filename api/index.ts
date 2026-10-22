import server from "../dist/server/server.js";

export default async function handler(req: any, res: any) {
  // Edge runtime or Fetch API standard
  if (req instanceof Request || (req.url && !res)) {
    return (server as any).fetch(req, {}, {});
  }

  // Node.js Serverless runtime (Vercel standard)
  try {
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
    const url = new URL(req.url, `${protocol}://${host}`);

    const headers = new Headers();
    for (const [key, val] of Object.entries(req.headers)) {
      if (val !== undefined) {
        if (Array.isArray(val)) {
          for (const v of val) headers.append(key, v);
        } else {
          headers.set(key, val as string);
        }
      }
    }

    let body: any = undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
      if (req.body) {
        body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      } else {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
        }
        if (chunks.length > 0) {
          body = Buffer.concat(chunks);
        }
      }
    }

    const webReq = new Request(url.href, {
      method: req.method,
      headers,
      body,
    });

    const webRes = await (server as any).fetch(webReq, {}, {});

    res.statusCode = webRes.status;
    webRes.headers.forEach((val: string, key: string) => {
      res.setHeader(key, val);
    });

    const arrayBuffer = await webRes.arrayBuffer();
    res.end(Buffer.from(arrayBuffer));
  } catch (err: any) {
    console.error("Vercel Serverless Handler Error:", err);
    res.statusCode = 500;
    res.end(err?.message || "Internal Server Error");
  }
}
