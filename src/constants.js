export const BIBLE_ENTRY_TYPES = [
  "Character",
  "Plot Summary",
  "Setting",
  "Lore",
  "Chapter Outline",
  "Instructions",
];

export const GENERATION_PRESETS = {
  // Precise and coherent, but less creative. Good for editing or getting specific details.
  precise: {
    label: "Precise",
    temperature: 0.4,
    repetition_penalty: 1.15,
    top_p: 0.9,
    top_k: 40,
  },
  // A good balance of creativity and coherence. Good for general writing.
  balanced: {
    label: "Balanced",
    temperature: 0.75,
    repetition_penalty: 1.1,
    top_p: 0.95,
    top_k: 50,
  },
  // More creative and unpredictable. Good for brainstorming and new ideas.
  creative: {
    label: "Creative",
    temperature: 1.0,
    repetition_penalty: 1.0,
    top_p: 1.0,
    top_k: 0, // 0 means disabled
  },
  // A story-writer preset, aims for long-form coherence and creativity.
  storywriter: {
    label: "Storywriter",
    temperature: 0.85,
    repetition_penalty: 1.08,
    top_p: 0.92,
    top_k: 100,
  },
};

export const EMBEDDING_TYPES = new Set(["Character", "Lore", "Setting"]);
