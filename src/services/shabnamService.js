// Shabnam AI Chat Service
export const ShabnamService = {
  // Streaming chat response
  async streamChat({ message, image, history, postsCount, onChunk, onDone, onError }) {
    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, image, history, postsCount })
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to connect to streaming API");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (dataStr === "[DONE]") {
              if (onDone) onDone();
              return;
            }
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text && onChunk) {
                onChunk(parsed.text);
              }
            } catch (_) {}
          }
        }
      }
      if (onDone) onDone();
    } catch (err) {
      if (onError) onError(err);
    }
  },

  // Standard non-streaming chat fallback
  async sendChat({ message, image, history, postsCount }) {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, image, history, postsCount })
    });
    return response.json();
  }
};

window.ShabnamService = ShabnamService;
