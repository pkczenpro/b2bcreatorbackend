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
      new SystemMessage("You are a helpful AI that generates engaging social media posts for LinkedIn in LinkedIn style."),
      new HumanMessage(prompt),
    ]);

    return response.content.trim();
  } catch (error) {
    console.error("Langchain OpenAI Error:", error);
    throw new Error("Failed to generate post");
  }
};

export default generatePost;
