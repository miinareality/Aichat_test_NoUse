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

interface WebSearchItem {
  title?: string;
  url?: string;
  description?: string;
}

interface WebSearchResponse {
  items?: WebSearchItem[];
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // =========================
    // AI Chat API
    // =========================
    if (url.pathname === "/api/chat") {
      if (request.method !== "POST") {
        return json(
          { error: "Method Not Allowed" },
          405
        );
      }

      try {
        const body = (await request.json()) as ChatRequest;

        if (!Array.isArray(body.messages)) {
          return json(
            { error: "messages is required" },
            400
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

        if (messages.length === 0) {
          return json(
            { error: "No valid messages" },
            400
          );
        }

        // =========================
        // 最新のユーザーメッセージ
        // =========================

        const lastUserMessage = [...messages]
          .reverse()
          .find(
            (message) => message.role === "user"
          );

        if (!lastUserMessage) {
          return json(
            { error: "User message not found" },
            400
          );
        }

        // =========================
        // Web Search
        // =========================

        let webSearchText = "";

        try {
          const searchResponse =
            await env.AI.websearch({
              gatewayId: "default",
              query: lastUserMessage.content,
              provider: "ceramic",
              limit: 5
            });

          const searchResult =
            (await searchResponse.json()) as WebSearchResponse;

          if (
            searchResult &&
            Array.isArray(searchResult.items)
          ) {
            webSearchText =
              searchResult.items
                .map((item, index) => {
                  return [
                    `検索結果 ${index + 1}`,
                    `タイトル: ${item.title ?? ""}`,
                    `URL: ${item.url ?? ""}`,
                    `内容: ${item.description ?? ""}`
                  ].join("\n");
                })
                .join("\n\n");
          }
        } catch (searchError) {
          console.error(
            "Web Search Error:",
            searchError
          );

          return json(
            {
              error: "Web Search failed",
              details: String(searchError)
            },
            502
          );
        }

        // =========================
        // AIに渡すシステムメッセージ
        // =========================

        const systemMessage: ChatMessage = {
          role: "system",
          content: `
あなたはユーザー専用のAIアシスタントです。

基本的に日本語で回答してください。

インターネット検索結果が提供されている場合、
その情報を参考にして回答してください。

最新情報について質問された場合は、
検索結果を優先してください。

検索結果にない情報を、
検索結果に書かれているかのように断定しないでください。

検索結果にURLがある場合は、
回答の最後に参考情報としてURLを表示してください。

Web検索結果:
${webSearchText || "検索結果はありませんでした。"}
`
        };

        // =========================
        // Workers AI
        // =========================

        const response = await env.AI.run(
          "@cf/openai/gpt-oss-20b",
          {
            messages: [
              systemMessage,
              ...messages
            ],
            max_tokens: 1024,
            reasoning_effort: "low"
          }
        );

        return json({
          success: true,
          response
        });

      } catch (error) {
        console.error(
          "Chat Error:",
          error
        );

        return json(
          {
            error: "AI request failed",
            details: String(error)
          },
          500
        );
      }
    }

    // =========================
    // Webサイト
    // =========================

    return env.ASSETS.fetch(request);
  }
} satisfies ExportedHandler<Env>;


// =========================
// JSON Response
// =========================

function json(
  data: unknown,
  status = 200
): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*"
      }
    }
  );
}
