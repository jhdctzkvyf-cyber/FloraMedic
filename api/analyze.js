export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        error: "No plant image provided."
      });
    }

    // The browser sends the image as:
    // data:image/jpeg;base64,ABC123...
    const match = image.match(/^data:(.+);base64,(.+)$/);

    if (!match) {
      return res.status(400).json({
        error: "Invalid image format."
      });
    }

    const mimeType = match[1];
    const base64Data = match[2];

    const prompt = `
You are FloraMedic, an AI-assisted plant health analyzer.

Examine the uploaded plant photograph carefully.

Give the user a concise plant health report with these sections:

PLANT IDENTIFICATION
Identify the plant if reasonably possible. If uncertain, say that.

HEALTH STATUS
Choose one:
Healthy
Needs Attention
Possible Problem
Serious Symptoms

VISIBLE SYMPTOMS
Describe only symptoms that are actually visible in the photograph.

MOST LIKELY ISSUE
Explain the most likely cause of the visible symptoms.

CONFIDENCE
Low, Medium, or High.

POSSIBLE ALTERNATIVE CAUSES
Give up to three other reasonable possibilities.

CARE RECOMMENDATIONS
Give 3-5 practical steps the owner can take.

IMPORTANT:
Do not invent a disease when the plant appears healthy.
Do not pretend to be certain when a photo alone is insufficient.
If the image does not clearly contain a plant, say so.
Keep the explanation easy for a normal plant owner to understand.
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data
                  }
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini error:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Gemini could not analyze this image."
      });
    }

    const diagnosis =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("\n")
        .trim();

    if (!diagnosis) {
      return res.status(500).json({
        error: "Gemini returned no plant analysis."
      });
    }

    return res.status(200).json({
      diagnosis
    });

  } catch (error) {
    console.error("FloraMedic error:", error);

    return res.status(500).json({
      error: "FloraMedic could not analyze this image."
    });
  }
}
