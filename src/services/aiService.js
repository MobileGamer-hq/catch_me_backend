const { GoogleGenAI } = require("@google/genai");
const axios = require("axios");

// Initialize Gemini API
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Generates an exciting game summary using Gemini with a fallback to Grok.
 * @param {Object} gameData - The complete game object including teams, stats, and events.
 * @returns {Promise<string>} The generated summary.
 */
const generateGameSummary = async (gameData) => {
  const prompt = `You are an expert sports commentator. Your job is to analyze the following raw JSON game data and write an exciting, factual sports article summarizing the game.

Game Data:
${JSON.stringify(gameData)}

CRITICAL INSTRUCTIONS:
1. Start with the match-up and current score: Look at \`data.homeTeam.name\` vs \`data.awayTeam.name\`, and mention the score from \`data.currentState.homeScore\` and \`data.currentState.awayScore\`.
2. Analyze the timeline of events: Look at \`data.gameEvents\` and \`data.scoreEvents\` to narrate exactly what happened in the game (e.g., who scored, who was substituted, who got a steal/block).
3. Mention key players by name (check \`data.homeTeam.players\` and \`data.awayTeam.players\`).
4. Keep the tone engaging, professional, and entirely based on the facts provided in the JSON. Do NOT make up any events that did not happen.
5. Never include raw JSON or technical jargon in your output.`;

  try {
    const result = await genAI.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });
    console.log("Used Gemini");
    return result.text;
  } catch (geminiError) {
    console.error(
      "Gemini API failed, falling back to Grok:",
      geminiError.message,
    );
    return await generateWithGrok(prompt);
  }
};

/**
 * Fallback to Grok via xAI REST API
 * @param {string} prompt - The prompt to send.
 * @returns {Promise<string>} The generated summary.
 */
const generateWithGrok = async (prompt) => {
  try {
    const response = await axios.post(
      "https://api.x.ai/v1/chat/completions",
      {
        messages: [
          { role: "system", content: "You are an expert sports commentator." },
          { role: "user", content: prompt },
        ],
        model: "grok-4.3",
        stream: false,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROK_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );
    console.log("Used Grok");
    return response.data.choices[0].message.content;
  } catch (grokError) {
    console.error(
      "Grok API failed:",
      grokError.response ? grokError.response.data : grokError.message,
    );
    throw new Error(
      "Failed to generate game summary with both Gemini and Grok.",
    );
  }
};

module.exports = {
  generateGameSummary,
};
