const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports.getTravelSuggestions = async(city, days) => {
    try {

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
        });

        const prompt = `
Generate a travel plan for ${city} for ${days} days.

Return ONLY valid JSON. No markdown. No extra text and simple words.

FORMAT:
{
  "places": ["Place 1", "Place 2", "Place 3", "Place 4", "Place 5"],
  "food": ["Food 1", "Food 2", "Food 3", "Food 4"],
  "plan": [
    "Day 1: ...",
    "Day 2: ...",
    "Day 3: ..."
  ]
}

Rules:
- places = exactly 5 items
- food = exactly 4 items
- plan = exactly ${days} items
`;

        const result = await model.generateContent(prompt);

        let response;
        let text;

        if (result && result.response) {
            response = result.response;

            if (typeof response.text === "function") {
                text = response.text();
            } else {
                text = null;
            }
        } else {
            response = null;
            text = null;
        }

        if (!text) {
            console.error("Gemini: Empty or invalid response");
            return emptyAI(); // your safe fallback
        }

        if (!text) return emptyAI();

        const clean = text.replace(/```json|```/g, "").trim();
        const start = clean.indexOf("{");
        const end = clean.lastIndexOf("}");

        if (start === -1 || end === -1) return emptyAI();

        const data = JSON.parse(clean.substring(start, end + 1));

        // ✅ PROPER if-else (as you requested)
        let places = [];
        let food = [];
        let plan = [];

        if (Array.isArray(data.places) && data.places.length >= 5) {
            places = data.places.slice(0, 5);
        }

        if (Array.isArray(data.food) && data.food.length >= 4) {
            food = data.food.slice(0, 4);
        }

        if (Array.isArray(data.plan) && data.plan.length >= days) {
            plan = data.plan.slice(0, days);
        }

        return { places, food, plan };
    } catch (err) {
        console.error("Gemini Error:", err.message);
        return emptyAI();
    }
};

function emptyAI() {
    return {
        places: [],
        food: [],
        plan: [],
    };
}