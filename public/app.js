const chat = document.getElementById("chat");
const form = document.getElementById("chatForm");
const input = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const clearButton = document.getElementById("clearButton");

let messages = [];

function addMessage(role, content) {
  const welcome = document.querySelector(".welcome");
  if (welcome) welcome.remove();

  const message = document.createElement("div");
  message.className = `message ${role}`;

  const contentElement = document.createElement("div");
  contentElement.className = "message-content";
  contentElement.textContent = content;

  message.appendChild(contentElement);
  chat.appendChild(message);
  chat.scrollTop = chat.scrollHeight;

  return contentElement;
}

function addLoading() {
  const message = document.createElement("div");
  message.className = "message assistant";
  message.id = "loading";
  message.innerHTML = `
    <div class="message-content">
      <div class="loading">
        <span></span><span></span><span></span>
      </div>
    </div>
  `;
  chat.appendChild(message);
  chat.scrollTop = chat.scrollHeight;
}

function removeLoading() {
  const loading = document.getElementById("loading");
  if (loading) loading.remove();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const text = input.value.trim();
  if (!text) return;

  messages.push({ role: "user", content: text });
  addMessage("user", text);

  input.value = "";
  sendButton.disabled = true;
  addLoading();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages })
    });

    if (!response.ok) throw new Error("API request failed");

    const data = await response.json();
    removeLoading();

    if (!data.success) {
      throw new Error(data.error || "Unknown error");
    }

    const aiResponse = data.response;
    let answer = "";

if (
  typeof aiResponse?.choices?.[0]?.message?.content === "string"
) {
  answer =
    aiResponse.choices[0].message.content;
} else if (
  typeof aiResponse?.response === "string"
) {
  answer = aiResponse.response;
} else {
  answer =
    "申し訳ありません。AIが回答を生成できませんでした。もう一度お試しください。";
}

    messages.push({ role: "assistant", content: answer });
    addMessage("assistant", answer);
  } catch (error) {
    console.error(error);
    removeLoading();
    addMessage("assistant", "申し訳ありません。AIとの通信中にエラーが発生しました。");
  } finally {
    sendButton.disabled = false;
    input.focus();
  }
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

clearButton.addEventListener("click", () => {
  messages = [];
  chat.innerHTML = `
    <div class="welcome">
      <h1>AI Chat</h1>
      <p>何でも質問してください。</p>
    </div>
  `;
  input.focus();
});
