interface Env {
  AI: Ai;
  ASSETS: Fetcher;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/chat") {
      if (request.method !== "POST") {
        return json({ error: "Method Not Allowed" }, 405);
      }

      try {
        const body = (await request.json()) as ChatRequest;

        if (!body.messages || !Array.isArray(body.messages)) {
          return json({ error: "messages is required" }, 400);
        }

        const messages = body.messages
          .filter(
            (message) =>
              message &&
              ["system", "user", "assistant"].includes(message.role) &&
              typeof message.content === "string"
          )
          .slice(-30);

        if (messages.length === 0) {
          return json({ error: "No valid messages" }, 400);
        }

        const response = await env.AI.run("@cf/openai/gpt-oss-20b", {
          messages,
          max_tokens: 1024,
          reasoning_effort: "low"
        });

        return json({ success: true, response });
      } catch (error) {
        console.error(error);
        return json({ error: "AI request failed" }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  }
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
