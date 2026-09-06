export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: "No plant image provided." });
    }

    const response = await fetch(
      "https://ai-gateway.vercel.sh/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.AI_GATEWAY_API_KEY}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-5.4-fast",
          messages: [
            {
              role: "system",
              content:
                "You are FloraMedic, an AI plant-care assistant. Analyze plant photos for visible signs of stress, disease, pests, watering problems, nutrient issues, or other plant-health problems. Do not claim certainty from an image alone. Clearly state when something cannot be determined visually.",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analyze this plant photo.

Return a concise report containing:
1. Plant identification, if reasonably identifiable
2. Visible symptoms
3. Most likely problem
4. Confidence: Low, Medium, or High
5. Recommended care steps
6. Other possible causes

If the plant looks healthy, say so rather than inventing a disease.`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: image,
                  },
                },
              ],
            },
          ],
          max_tokens: 700,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(data);
      return res.status(response.status).json({
        error: data?.error?.message || "AI analysis failed.",
      });
    }

    const diagnosis = data?.choices?.[0]?.message?.content;

    if (!diagnosis) {
      return res.status(500).json({ error: "No diagnosis was returned." });
    }

    return res.status(200).json({ diagnosis });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "FloraMedic could not analyze this image.",
    });
  }
}
