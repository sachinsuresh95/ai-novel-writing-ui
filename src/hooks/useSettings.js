import { useState, useEffect } from "react";
import { GENERATION_PRESETS } from "../constants";

export const useSettings = () => {
  const [baseUrl, setBaseUrl] = useState("");
  const [llmEndpoint, setLlmEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [maxTokens, setMaxTokens] = useState(300);
  const [generationSettings, setGenerationSettings] = useState(
    GENERATION_PRESETS.balanced
  );
  const [model, setModel] = useState("");
  const [modelContextWindow, setModelContextWindow] = useState(8192);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [credsValidated, setCredsValidated] = useState(false);

  useEffect(() => {
    const savedBaseUrl = localStorage.getItem("baseUrl");
    const savedApiKey = localStorage.getItem("apiKey");
    const savedModel = localStorage.getItem("model");

    if (savedBaseUrl) {
      setBaseUrl(savedBaseUrl);
      setLlmEndpoint(savedBaseUrl + "/chat/completions");
      setApiKey(savedApiKey || "");
      if (savedModel) setModel(savedModel);
      const savedMaxTokens = localStorage.getItem("maxTokens");
      if (savedMaxTokens) setMaxTokens(parseInt(savedMaxTokens, 10));
      const savedContextWindow = localStorage.getItem("modelContextWindow");
      if (savedContextWindow)
        setModelContextWindow(parseInt(savedContextWindow, 10));
      const savedSettings = localStorage.getItem("generationSettings");
      if (savedSettings) {
        setGenerationSettings(JSON.parse(savedSettings));
      }
      setCredsValidated(true);
    } else {
      setIsSettingsOpen(true);
    }
  }, []);

  const handleSaveSettings = async (
    baseEndpoint,
    key,
    tokens,
    settings,
    model,
    contextWindow
  ) => {
    setSettingsError("");
    const completionsEndpoint = `${baseEndpoint}/chat/completions`;
    console.log("saving api settings...");
    try {
      const headers = { "Content-Type": "application/json" };
      if (key) headers["Authorization"] = `Bearer ${key}`;
      const testBody = {
        model: model,
        messages: [{ role: "user", content: "Test" }],
        max_tokens: 1,
      };
      const response = await fetch(completionsEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(testBody),
      });
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      setBaseUrl(baseEndpoint);
      setLlmEndpoint(completionsEndpoint);
      setApiKey(key);
      setMaxTokens(tokens);
      setGenerationSettings(settings);
      setModel(model);
      setModelContextWindow(contextWindow);
      localStorage.setItem("baseUrl", baseEndpoint);
      localStorage.setItem("llmEndpoint", completionsEndpoint);
      localStorage.setItem("apiKey", key);
      localStorage.setItem("maxTokens", tokens);
      localStorage.setItem("generationSettings", JSON.stringify(settings));
      localStorage.setItem("model", model);
      localStorage.setItem("modelContextWindow", contextWindow);
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
    baseUrl,
    llmEndpoint,
    apiKey,
    maxTokens,
    generationSettings,
    model,
    modelContextWindow, // Export the new state
    isSettingsOpen,
    setIsSettingsOpen,
    settingsError,
    credsValidated,
    handleSaveSettings,
    setCredsValidated,
  };
};
