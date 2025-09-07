import { useState, useEffect, useCallback } from "react";
import { GENERATION_PRESETS } from "../constants";

const useCustomPresets = () => {
  const [customPresets, setCustomPresets] = useState(() => {
    try {
      const saved = localStorage.getItem("customGenerationPresets");
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error("Failed to load custom presets:", error);
      return {};
    }
  });

  const saveCustomPreset = useCallback(
    (presetName, settings) => {
      const newPresets = {
        ...customPresets,
        [presetName]: { ...settings, label: presetName, custom: true },
      };
      setCustomPresets(newPresets);
      localStorage.setItem(
        "customGenerationPresets",
        JSON.stringify(newPresets)
      );
    },
    [customPresets]
  );

  const deleteCustomPreset = useCallback(
    (presetName) => {
      const { [presetName]: _, ...rest } = customPresets;
      setCustomPresets(rest);
      localStorage.setItem("customGenerationPresets", JSON.stringify(rest));
    },
    [customPresets]
  );

  return { customPresets, saveCustomPreset, deleteCustomPreset };
};

export const useGenerationPresets = (initialPreset) => {
  const { customPresets, saveCustomPreset, deleteCustomPreset } =
    useCustomPresets();
  const [preset, setPreset] = useState(initialPreset || "balanced");
  const [finalPresets, setFinalPresets] = useState({
    ...GENERATION_PRESETS,
    ...customPresets,
  });
  const [currentSettings, setCurrentSettings] = useState(finalPresets[preset]);

  useEffect(() => {
    const newFinalPresets = { ...GENERATION_PRESETS, ...customPresets };
    setFinalPresets(newFinalPresets);
    if (newFinalPresets[preset]) {
      setCurrentSettings(newFinalPresets[preset]);
    } else {
      setPreset("balanced");
      setCurrentSettings(newFinalPresets["balanced"]);
    }
  }, [customPresets, preset]);

  const selectPreset = useCallback((presetName) => {
    setPreset(presetName);
  }, []);

  const updateCurrentSettings = useCallback(
    (newSettings) => {
      setCurrentSettings((prev) => ({ ...prev, ...newSettings }));
    },
    [currentSettings]
  );

  return {
    preset,
    selectPreset,
    currentSettings,
    updateCurrentSettings,
    availablePresets: finalPresets,
    saveCustomPreset,
    deleteCustomPreset,
  };
};
