import { buildPrompt, buildMemoryUpdatePrompt } from "../prompt-builder";

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

export const generateInitialMemory = async (docs, apiKey, llmEndpoint) => {
  const summaryPromises = docs.map(async (doc) => {
    if (doc.content.trim().length < 20) return null;
    const { body, error } = buildMemoryUpdatePrompt(doc.title, doc.content);
    if (error) throw new Error(error);

    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const response = await fetch(llmEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...body, stream: true }),
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
    let fullMemoryContent = "# Memory\n\nA summary of events as they happen.";
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
  signal
) => {
  if (!llmEndpoint) return null;

  const { body, error: promptError } = buildMemoryUpdatePrompt(
    docToSummarize.title,
    docToSummarize.content
  );

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
      body: JSON.stringify({ ...body, stream: true }),
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
  options,
  apiKey,
  llmEndpoint,
  onData,
  signal
) => {
  const {
    body,
    promptForHistory,
    bibleEntriesForLog,
    error: promptError,
  } = buildPrompt(options);

  if (promptError) {
    throw new Error(promptError);
  }

  console.log(
    "Bible entries included in context:",
    bibleEntriesForLog.map((e) => e.title)
  );

  try {
    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const response = await fetch(llmEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...body, stream: true }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const generatedText = await streamResponse(response, onData, signal);
    return {
      promptForHistory,
      options,
      text: generatedText,
    };
  } catch (err) {
    console.error("Text generation failed:", err);
    throw new Error(`Failed to generate text: ${err.message}`);
  }
};

export const continueGeneration = async (
  cardToContinue,
  apiKey,
  llmEndpoint,
  onData,
  signal
) => {
  const continueOptions = {
    ...cardToContinue.options,
    mode: "write",
    cardContent: cardToContinue.text,
  };
  const {
    body,
    bibleEntriesForLog,
    error: promptError,
  } = buildPrompt(continueOptions);

  if (promptError) {
    throw new Error(promptError);
  }

  console.log(
    "Bible entries included in context for CONTINUE:",
    bibleEntriesForLog.map((e) => e.title)
  );

  try {
    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const response = await fetch(llmEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...body, stream: true }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const generatedText = await streamResponse(response, onData, signal);
    return {
      options: continueOptions,
      text: generatedText,
    };
  } catch (err) {
    console.error("Continue generation failed:", err);
    throw new Error(`Failed to continue generation: ${err.message}`);
  }
};

export const regenerate = async (
  cardToRegenerate,
  apiKey,
  llmEndpoint,
  onData,
  signal
) => {
  const { body, error: promptError } = buildPrompt(cardToRegenerate.options);

  if (promptError) {
    throw new Error(promptError);
  }

  console.log("Messages for network request:", body.messages);

  try {
    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const response = await fetch(llmEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...body, stream: true }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const generatedText = await streamResponse(response, onData, signal);
    return {
      options: cardToRegenerate.options,
      text: generatedText,
    };
  } catch (err) {
    console.error("Regeneration failed:", err);
    throw new Error(`Failed to regenerate: ${err.message}`);
  }
};
