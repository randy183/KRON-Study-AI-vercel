export default async function handler(req, res) {
if (req.method !== "POST") {
return res.status(405).json({
error: "Method not allowed. Please send a POST request."
});
}

try {
const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) {
  return res.status(500).json({
    error: "The AI service is not configured yet."
  });
}

const { level, subject } = req.body || {};

const validLevels = ["SS1", "SS2", "SS3", "WAEC"];

if (!validLevels.includes(level)) {
  return res.status(400).json({
    error: "Please select a valid class level."
  });
}

if (
  typeof subject !== "string" ||
  !subject.trim() ||
  subject.length > 100
) {
  return res.status(400).json({
    error: "Please select a valid subject."
  });
}

const response = await fetch(
  "https://openrouter.ai/api/v1/chat/completions",
  {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://kronstudyaivercel.vercel.app",
      "X-Title": "KRON Study AI"
    },
    body: JSON.stringify({
      model: "openrouter/free",
      messages: [
        {
          role: "system",
          content: `You are the curriculum planning assistant for KRON Study AI.

Your task is to help Nigerian secondary school students organise their learning.

IMPORTANT RULES:

1. Never claim that you accessed NERDC or searched the live web.
2. You do not have a live web-search tool in this endpoint.
3. Never invent official curriculum quotations, document titles, URLs, or citations.
4. Clearly distinguish established curriculum knowledge from an unverified proposed study plan.
5. Do not claim that your proposed weekly order is NERDC's official weekly schedule.
6. If you cannot confidently identify the relevant curriculum topics, say that the official curriculum needs to be retrieved and verified before a reliable plan can be produced.
7. Use clear English suitable for Nigerian secondary school students.
8. Keep the response structured and easy to read.

The official source to consult when retrieval becomes available is the Nigerian Educational Research and Development Council (NERDC)."}, { role: "user", content:"Prepare a curriculum planning response for:
Class: ${level}
Subject: ${subject}

Explain that official NERDC topics must be verified before being presented as official. Do not fabricate a list of official topics or citations.`
}
],
temperature: 0.2,
max_tokens: 800
})
}
);

const data = await response.json();

if (!response.ok) {
  console.error(
    "OpenRouter curriculum error:",
    response.status,
    data.error?.message || "Unknown provider error"
  );

  return res.status(502).json({
    error: "The curriculum service is unavailable. Please try again."
  });
}

const answer = data.choices?.[0]?.message?.content;

if (!answer || typeof answer !== "string") {
  return res.status(502).json({
    error: "The curriculum service returned an empty response."
  });
}

return res.status(200).json({
  answer: answer.trim(),
  sourceStatus: "not_live_verified"
});

} catch (error) {
console.error("KRON Curriculum backend error:", error);

return res.status(500).json({
  error: "Something went wrong while preparing the curriculum response."
});

}
}
