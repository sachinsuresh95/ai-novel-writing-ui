# 🤖 AI Novel Writing UI

**AI Novel Writer** is a powerful, open-source application designed for creative writers who want to harness the power of Large Language Models (LLMs) in their novel-writing process. Inspired by tools like Sudowrite, this application provides a seamless interface to connect your own OpenAI-compatible LLM endpoint, giving you full control over your AI writing assistant. Everything is saved in the browser, no servers.

## ✨ Features

### Core Writing Tools

- **✍️ Intuitive 3-Column Layout**: Keep your workspace organized with a clear view of your document outline, main editor, and AI generation history.
- **🔌 Bring Your Own LLM**: Configure the app to use any OpenAPI-compatible API endpoint. This means you can use open-source models or your own fine-tuned models.
- **🧠 AI Writing Tools**:
  - **Write**: Let the AI continue writing from your cursor's position.
  - **Rewrite**: Get alternative phrasing for your selected text.
  - **Describe**: Elaborate on a selected word or phrase with rich, sensory details.
- **🗂️ Generation History**: All AI outputs are saved as cards. Easily review and insert the best generations into your manuscript.
- **💾 Persistent Settings**: Your LLM endpoint and API key are saved securely in your browser's local storage.

### Advanced Project Management

- **Multi-Project Management System**: Users can create, switch, import/export, and manage multiple novel projects, allowing seamless organization of different writing endeavors.
- **Story Bible System**: A dedicated system for managing structured notes like plot summaries and character backstories, which are used to provide context to the AI for more coherent generations.
- **Automatic Memory System**: An AI-maintained "Memory" that automatically summarizes chapter content to keep the AI's context up-to-date without manual intervention.
- **Text Embeddings and Similarity Search**: The foundation for semantic search has been implemented, allowing the system to find similar bible entries based on meaning for enhanced context retrieval.

## 🚀 Getting Started

Follow these instructions to get the project up and running on your local machine.

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or higher is recommended)
- [npm](https://www.npmjs.com/) (which comes with Node.js)

### Installation & Setup

1.  **Clone the Repository**:

    ```bash
    git clone https://github.com/sachinsuresh95/novel-writer-ui.git
    cd novel-writer-ui
    ```

2.  **Install Dependencies**:
    Open a terminal in the project folder and run:

    ```bash
    npm install
    ```

3.  **Start the Development Server**:
    Run the following command to start the Vite development server:

    ```bash
    npm run dev
    ```

4.  **Open in Browser**:
    Your browser should automatically open to `http://localhost:5173` (or a similar address shown in your terminal).

### Initial Setup

Upon first launch, you'll be prompted to create a new project or load an existing one. Use the project menu to manage your novels.

## 📖 Usage

### 1. Project Management

- **Create a New Project**: Click the project menu in the header and select "New Project" to start a fresh novel. Enter a title and optional description.
- **Switch Projects**: Use the project dropdown to switch between multiple novels you've created.
- **Import/Export Projects**: Export your project as a JSON file for backup or sharing, and import existing projects to continue working.
- **Story Bible**: Access the Story Bible tab in the sidebar to add entries for characters, plots, settings, etc. These provide context for AI generations.

### 2. Configure Your AI Settings

When you first open the application (or via Settings), a modal will appear.

- **LLM Endpoint URL**: Enter the full URL of your OpenAI-compatible completions endpoint.
- **API Key (Optional)**: If your endpoint requires an authentication token, enter it here. It will be sent as a `Bearer` token in the `Authorization` header.

Click **Save**. Your settings will be stored locally in your browser for future sessions.

#### Example: Setting up with a Local LLM

You can use a tool like [LM Studio](https://lmstudio.ai/) or [Ollama](https://ollama.ai/) to serve an LLM locally. Here's an example of how to configure it with LM Studio:

1.  Download and install LM Studio.
2.  In LM Studio, go to the **Local Server** tab.
3.  Select a model and click **Start Server**.
4.  Copy the server base URL (e.g., `http://localhost:1234/v1`).
5.  In AI Novel Writer, paste this URL into the **LLM Endpoint URL** field.
6.  You can enter a random API key if your local server doesn't require one.

### 3. Start Writing

Use the central editor to write your novel. Your text is automatically saved to your browser's local storage as you type, so you won't lose your work. The Automatic Memory system will summarize chapters to maintain AI context.

### 4. Use the AI Tools

- **To Write**: Place your cursor where you want the AI to continue and click the **Write** button in the AI Toolbar. The AI will use your Story Bible and Memory for relevant context.
- **To Rewrite or Describe**: First, select a piece of text in the editor. Then, click the corresponding button in the AI Toolbar.

### 5. Use AI Generations

AI-generated text will appear as cards in the right-hand panel.

- Click the **Insert** button on any card to add its content to your manuscript at your last cursor position.
- If you have text selected in the editor, inserting a generation will replace the selected text.

### 6. Manage Story Bible

- Add new entries via the "New Bible Entry" button in the sidebar.
- Entries are automatically embedded for similarity-based retrieval.

## 🤝 Contributing

Contributions are welcome! If you have ideas for new features, bug fixes, or improvements, please follow these steps:

1.  **Fork the repository.**
2.  **Create a new branch**:
    ```bash
    git checkout -b feature/your-feature-name
    ```
3.  **Make your changes.**
4.  **Commit your changes**:
    ```bash
    git commit -m "feat: Add some amazing feature"
    ```
5.  **Push to the branch**:
    ```bash
    git push origin feature/your-feature-name
    ```
6.  **Open a pull request.**

Please make sure your code follows the project's existing style and conventions.

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

Happy writing! 📝
