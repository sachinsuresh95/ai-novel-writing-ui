import { buildPrompt, buildMemoryUpdatePrompt } from "../prompt-builder";
import { filterGenerationSettings } from "../utils";

const streamResponse = async (response, onData, signal) => {
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let fullText = "";
  let buffer = "";

  try {
    // Handle abort signal
    if (signal) {
      signal.addEventListener("abort", () => {
        reader.cancel();
      });
    }

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Process any remaining buffer content
        if (buffer.trim()) {
          const line = buffer.trim();
          if (line.startsWith("data: ")) {
            const dataStr = line.substring(6);
            if (dataStr.trim() !== "[DONE]") {
              try {
                const data = JSON.parse(dataStr);
                const content = data.choices?.[0]?.delta?.content ?? "";
                if (content) {
                  fullText += content;
                  onData?.(content);
                }
              } catch (e) {
                console.error("Error parsing final stream data:", e);
              }
            }
          }
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith("data: ")) {
          const dataStr = trimmedLine.substring(6);
          if (dataStr === "[DONE]") {
            return fullText;
          }
          try {
            const data = JSON.parse(dataStr);
            const content = data.choices?.[0]?.delta?.content ?? "";
            if (content) {
              fullText += content;
              onData?.(content);
            }
          } catch (e) {
            console.error(
              "Error parsing stream data:",
              e,
              "Line:",
              trimmedLine
            );
          }
        }
      }
    }
  } finally {
    // Ensure the reader is always released
    reader.releaseLock();
  }

  return fullText;
};

export const generateInitialMemory = async (
  docs,
  apiKey,
  llmEndpoint,
  model,
  modelContextWindow
) => {
  const summaryPromises = docs.map(async (doc) => {
    if (doc.content.trim().length < 20) return null;
    // We can't use the hook here, but we can use the helpers.
    const { body, error } = buildMemoryUpdatePrompt({
      chapterTitle: doc.title,
      chapterContent: doc.content,
      contextWindowSize: modelContextWindow || 4096,
    });
    if (error) throw new Error(error);

    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const response = await fetch(llmEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...body, stream: true, model }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const summary = await streamResponse(response);
    return {
      title: doc.title,
      summary: summary || "",
    };
  });

  try {
    const results = await Promise.all(summaryPromises);
    let fullMemoryContent = "";
    for (const result of results) {
      if (result?.summary) {
        fullMemoryContent += `\n\n<${result.title}>\n${result.summary}\n</${result.title}>`;
      }
    }
    return {
      id: Date.now() + 99,
      title: "Memory",
      type: "Memory",
      content: fullMemoryContent,
    };
  } catch (err) {
    console.error("Failed to generate initial memory:", err);
    throw new Error(`Failed to generate initial summary: ${err.message}`);
  }
};

export const updateMemory = async (
  docToSummarize,
  apiKey,
  llmEndpoint,
  model,
  modelContextWindow,
  signal
) => {
  if (!llmEndpoint) return null;

  const { body, error: promptError } = buildMemoryUpdatePrompt({
    chapterTitle: docToSummarize.title,
    chapterContent: docToSummarize.content,
    contextWindowSize: modelContextWindow || 4096,
  });

  if (promptError) {
    console.error("Memory update prompt error:", promptError);
    return null;
  }

  try {
    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const response = await fetch(llmEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...body, stream: true, model }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    return await streamResponse(response, null, signal);
  } catch (err) {
    if (err.name === "AbortError") {
      console.log("Memory update request was aborted.");
      return null;
    }
    console.error("Failed to update memory:", err);
    return null;
  }
};

export const generateText = async (
  body,
  apiKey,
  llmEndpoint,
  model,
  generationSettings,
  onData,
  signal
) => {
  // The parent component now handles logging included entries.

  try {
    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const response = await fetch(llmEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...body,
        ...filterGenerationSettings(generationSettings),
        stream: true,
        model,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const generatedText = await streamResponse(response, onData, signal);
    return {
      text: generatedText,
    };
  } catch (err) {
    console.error("Text generation failed:", err);
    throw new Error(`Failed to generate text: ${err.message}`);
  }
};

export const continueGeneration = async (
  body,
  apiKey,
  llmEndpoint,
  model,
  generationSettings,
  onData,
  signal
) => {
  // The parent component now handles logging included entries.

  try {
    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const response = await fetch(llmEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...body,
        ...filterGenerationSettings(generationSettings),
        stream: true,
        model,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const generatedText = await streamResponse(response, onData, signal);
    return {
      text: generatedText,
    };
  } catch (err) {
    console.error("Continue generation failed:", err);
    throw new Error(`Failed to continue generation: ${err.message}`);
  }
};

export const regenerate = async (
  body,
  apiKey,
  llmEndpoint,
  model,
  generationSettings,
  onData,
  signal
) => {
  try {
    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const response = await fetch(llmEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...body,
        ...filterGenerationSettings(generationSettings),
        stream: true,
        model,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const generatedText = await streamResponse(response, onData, signal);
    return {
      text: generatedText,
    };
  } catch (err) {
    console.error("Regeneration failed:", err);
    throw new Error(`Failed to regenerate: ${err.message}`);
  }
};
