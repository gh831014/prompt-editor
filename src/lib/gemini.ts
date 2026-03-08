import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("GEMINI_API_KEY is not set. AI features may not work.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

export async function generateResponse(
  prompt: string,
  context: string,
  modelName: string = "gemini-2.5-flash-latest"
) {
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Context (Current Prompt Content):\n${context}\n\nUser Request:\n${prompt}`,
            },
          ],
        },
      ],
      config: {
        systemInstruction: "You are a helpful assistant for optimizing prompts. Analyze the provided prompt content and help the user improve it based on their request. Focus on clarity, structure, and effectiveness.",
      },
    });
    return response.text;
  } catch (error) {
    console.error("Error generating AI response:", error);
    throw error;
  }
}
