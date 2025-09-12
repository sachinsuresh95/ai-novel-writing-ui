const VALID_SETTINGS = ["temperature", "top_p", "top_k", "repetition_penalty"];

export const filterGenerationSettings = (settings) => {
  if (!settings) return {};
  return Object.entries(settings).reduce((acc, [key, value]) => {
    if (VALID_SETTINGS.includes(key)) {
      acc[key] = value;
    }
    return acc;
  }, {});
};
