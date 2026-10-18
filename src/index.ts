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
        return Response.json(
          { error: "Method Not Allowed" },
          { status: 405 }
        );
      }

      const body = await request.json() as ChatRequest;

      if (!Array.isArray(body.messages)) {
        return Response.json(
          { error: "messages is required" },
          { status: 400 }
        );
      }

      const messages = body.messages
        .filter(
          (message) =>
            message &&
            ["system", "user", "assistant"].includes(
              message.role
            ) &&
            typeof message.content === "string"
        )
        .slice(-20);

      const lastMessage = [...messages]
        .reverse()
        .find(
          (message) => message.role === "user"
        );

      if (!lastMessage) {
        return Response.json(
          { error: "User message not found" },
          { status: 400 }
        );
      }

      // =========================
      // Web Search
      // =========================

const searchResponse = await env.AI.websearch({
  gatewayId: "default",
  query: lastMessage.content,
  provider: "exa",
  byokAlias: "default",
  limit: 5
});

      const searchResults =
        await searchResponse.json();
      console.log(
  "WEB SEARCH RESULT:",
  JSON.stringify(searchResults)
);

      // =========================
      // Workers AI
      // =========================

      const aiResponse = await env.AI.run(
        "@cf/openai/gpt-oss-20b",
        {
          messages: [
            {
              role: "system",
              content: `
あなたはユーザー専用のAIアシスタントです。

基本的に日本語で回答してください。

以下はインターネット検索によって取得した情報です。

この情報を参考にして回答してください。

最新情報について質問された場合は、
検索結果を優先してください。

検索結果に存在しない情報を、
検索結果に存在するかのように断定しないでください。

検索結果:
${JSON.stringify(searchResults)}
`
            },
            ...messages
          ],
          max_tokens: 1024,
          reasoning_effort: "low"
        }
      );

      return Response.json({
        success: true,
        response: aiResponse,
        search: searchResults
      });
    }

    return env.ASSETS.fetch(request);
  }
} satisfies ExportedHandler<Env>;
