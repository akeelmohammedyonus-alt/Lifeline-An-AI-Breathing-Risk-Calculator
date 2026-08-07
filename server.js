import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("."));

if (!process.env.OPENAI_API_KEY) {
    console.warn("WARNING: OPENAI_API_KEY is not set. Create a .env file with your API key.");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/api/chat", async (req, res) => {
    try {
        const { message, history = [] } = req.body;

        const messages = [
            {
                role: "system",
                content: "You are LifeLine AI, a breathing risk assistant that provides safe, helpful advice about humidity, air quality, exercise, stress, temperature, asthma triggers, and breathing risk."
            },
            ...history.flatMap((item) => [
                { role: "user", content: item.user },
                { role: "assistant", content: item.ai }
            ]),
            { role: "user", content: message }
        ];

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages,
            max_tokens: 320,
            temperature: 0.7
        });

        const reply = completion.choices?.[0]?.message?.content?.trim() || "Sorry, I could not generate a reply.";
        res.json({ reply });
    } catch (error) {
        console.error("AI server error:", error);
        res.status(500).json({ error: "AI server error" });
    }
});

app.listen(port, () => {
    console.log(`LifeLine AI server listening at http://localhost:${port}`);
});
