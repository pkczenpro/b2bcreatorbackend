import dotenv from "dotenv";
import { ChatTogetherAI } from "@langchain/community/chat_models/togetherai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

dotenv.config();

const generatePost = async (prompt, modelName = "qwen/qwen1.5-72b-chat") => {
  console.log("Model Name:", modelName);

  try {
    let llm;

    if (modelName === "openai") {
      llm = new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: "gpt-4", // You can make this dynamic too if needed
        temperature: 0.7,
      });
    } else {
      llm = new ChatTogetherAI({
        togetherApiKey: process.env.TOGETHER_AI_API_KEY,
        modelName, // Use the Together model
        temperature: 0.7,
      });
    }

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
    console.error("LLM Error:", error);
    throw new Error("Failed to generate content");
  }
};

export default generatePost;
