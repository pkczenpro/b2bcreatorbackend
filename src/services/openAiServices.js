import "dotenv/config";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const generatePost = async (prompt) => {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                { role: "system", content: "You are a helpful AI that generates engaging social media posts for linkedin in linkedin style." },
                { role: "user", content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 200,
        });

        return response.choices[0]?.message?.content.trim();
    } catch (error) {
        console.error("OpenAI Error:", error);
        throw new Error("Failed to generate post");
    }
};

export default generatePost;
