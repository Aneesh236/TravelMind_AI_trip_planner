// This code runs securely on Netlify, not inside the visitor's browser.
// Therefore, the OpenAI API key is never shown in script.js.

export default async function planTrip(request) {
    if (request.method !== "POST") {
        return jsonResponse({ error: "Only POST requests are allowed." }, 405);
    }

    try {
        const data = await request.json();

        const destination = String(data.destination || "").trim();
        const days = Number(data.days);
        const budget = String(data.budget || "").trim();
        const traveller = String(data.traveller || "").trim();
        const interests = Array.isArray(data.interests)
            ? data.interests.map(String).slice(0, 8)
            : [];

        if (
            !destination ||
            destination.length > 100 ||
            !Number.isInteger(days) ||
            days < 1 ||
            days > 15 ||
            !budget ||
            !traveller ||
            interests.length === 0
        ) {
            return jsonResponse(
                { error: "Please enter valid trip details." },
                400
            );
        }

        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return jsonResponse(
                {
                    error:
                        "The OpenAI API key has not been added in Netlify."
                },
                500
            );
        }

        const prompt = `
Create a practical ${days}-day travel itinerary.

Destination: ${destination}
Budget: ${budget}
Traveller: ${traveller}
Interests: ${interests.join(", ")}

Include:
- A short trip overview
- Morning, afternoon and evening plans for every day
- Recommended hotels or areas to stay
- Local food suggestions
- Transport advice
- A packing list
- An estimated budget breakdown
- Three useful local tips

Use clear headings and bullet points.
Keep the plan realistic and state that all prices are estimates.
Do not claim live prices, opening hours or availability.
`;

        const openAIResponse = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4.1-mini",
                    messages: [
                        {
                            role: "system",
                            content:
                                "You are Travel Mind, an expert and realistic travel planner."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ]
                })
            }
        );

        const result = await openAIResponse.json();

        if (!openAIResponse.ok) {
            console.error("OpenAI error:", result.error?.message);

            return jsonResponse(
                {
                    error:
                        "OpenAI could not create the itinerary. Check the API key and billing."
                },
                502
            );
        }

        const itinerary = result.choices?.[0]?.message?.content?.trim();

        if (!itinerary) {
            return jsonResponse(
                { error: "OpenAI returned an empty itinerary." },
                502
            );
        }

        return jsonResponse({ itinerary: itinerary }, 200);
    } catch (error) {
        console.error("Planner error:", error);

        return jsonResponse(
            { error: "Something went wrong. Please try again." },
            500
        );
    }
}

function jsonResponse(data, status) {
    return new Response(JSON.stringify(data), {
        status: status,
        headers: {
            "Content-Type": "application/json"
        }
    });
}

// The browser calls /api/plan.
export const config = {
    path: "/api/plan"
};
