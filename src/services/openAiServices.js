import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const llm = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "gpt-4",
  temperature: 0.7,
});

const generatePost = async (prompt) => {
  try {
    const response = await llm.invoke([
      new SystemMessage(
        `You are a professional content strategist specialized in crafting engaging, authentic, and insightful LinkedIn contents.
Your writing style is concise yet thoughtful, with a focus on storytelling, clear takeaways, and a human tone.
Structure the content with short paragraphs, emojis (when appropriate), and strong hooks at the beginning to encourage engagement.
Avoid sounding too robotic or generic — aim for a personal, real voice that resonates with professionals.`
      ),
      new HumanMessage(`Generate a LinkedIn content about: ${prompt}`),
    ]);

    return response.content.trim();
  } catch (error) {
    console.error("Langchain OpenAI Error:", error);
    throw new Error("Failed to generate content");
  }
};

export default generatePost;
