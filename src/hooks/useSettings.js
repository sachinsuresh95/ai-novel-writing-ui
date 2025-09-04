import { useState, useEffect } from "react";
import { GENERATION_PRESETS } from "../constants";

export const useSettings = () => {
  const [llmEndpoint, setLlmEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [maxTokens, setMaxTokens] = useState(300);
  const [generationPreset, setGenerationPreset] = useState("balanced");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [credsValidated, setCredsValidated] = useState(false);

  useEffect(() => {
    const savedEndpoint = localStorage.getItem("llmEndpoint");
    const savedApiKey = localStorage.getItem("apiKey");

    if (savedEndpoint) {
      setLlmEndpoint(savedEndpoint);
      setApiKey(savedApiKey || "");
      const savedMaxTokens = localStorage.getItem("maxTokens");
      if (savedMaxTokens) setMaxTokens(parseInt(savedMaxTokens, 10));
      const savedPreset = localStorage.getItem("generationPreset");
      if (savedPreset && GENERATION_PRESETS[savedPreset]) {
        setGenerationPreset(savedPreset);
      }
      setCredsValidated(true);
    } else {
      setIsSettingsOpen(true);
    }
  }, []);

  const handleSaveSettings = async (endpoint, key, tokens, preset) => {
    setSettingsError("");
    console.log("saving api settings...");
    const chatCompletionsEndpoint = `${endpoint}/chat/completions`;
    try {
      const headers = { "Content-Type": "application/json" };
      if (key) headers["Authorization"] = `Bearer ${key}`;
      const testBody = {
        messages: [{ role: "user", content: "Test" }],
        max_tokens: 1,
      };
      const response = await fetch(chatCompletionsEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(testBody),
      });
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      setLlmEndpoint(chatCompletionsEndpoint);
      setApiKey(key);
      setMaxTokens(tokens);
      setGenerationPreset(preset);
      localStorage.setItem("llmEndpoint", chatCompletionsEndpoint);
      localStorage.setItem("apiKey", key);
      localStorage.setItem("maxTokens", tokens);
      localStorage.setItem("generationPreset", preset);
      setIsSettingsOpen(false);
      setCredsValidated(true);
    } catch (err) {
      console.error("Settings validation failed:", err);
      setSettingsError(
        `Endpoint test failed: ${err.message}. Please check the URL and API Key (if required).`
      );
    }
  };

  return {
    llmEndpoint,
    apiKey,
    maxTokens,
    generationPreset,
    isSettingsOpen,
    setIsSettingsOpen,
    settingsError,
    credsValidated,
    handleSaveSettings,
    setCredsValidated,
  };
};
