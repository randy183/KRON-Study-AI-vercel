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

const { question, level, subject } = req.body || {};

if (
  typeof question !== "string" ||
  !question.trim()
) {
  return res.status(400).json({
    error: "Please enter a question."
  });
}

if (question.length > 4000) {
  return res.status(400).json({
    error: "Your question is too long. Please use fewer than 4000 characters."
  });
}

const validLevels = ["SS1", "SS2", "SS3", "WAEC"];

const studentLevel = validLevels.includes(level)
  ? level
  : "SS1";

const studentSubject =
  typeof subject === "string" && subject.length <= 100
    ? subject
    : "General";

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
          content: `You are KRON AI Tutor, a patient and encouraging tutor for secondary school students.

Student level: ${studentLevel}
Selected subject: ${studentSubject}

Teaching rules:

1. Explain concepts at the student's level.
2. Use clear, simple English suitable for Nigerian secondary school students.
3. Show calculations and reasoning step by step when appropriate.
4. Use examples relevant to school, examinations, and everyday life.
5. For examination questions, explain why the answer is correct.
6. If the student misunderstands something, correct them kindly.
7. Use headings and numbered steps when they improve clarity.
8. If a question is ambiguous, ask a brief clarifying question.
9. Never pretend to know something you do not know.
10. Do not claim to have searched the live web unless a web search was actually performed.

Your goal is to help the student understand, not merely memorize answers.`
},
{
role: "user",
content: question.trim()
}
],
temperature: 0.5,
max_tokens: 1200
})
}
);

const data = await response.json();

if (!response.ok) {
  console.error(
    "OpenRouter error:",
    response.status,
    data.error?.message || "Unknown provider error"
  );

  return res.status(502).json({
    error: "The AI service could not answer right now. Please try again."
  });
}

const answer = data.choices?.[0]?.message?.content;

if (!answer || typeof answer !== "string") {
  return res.status(502).json({
    error: "The AI returned an empty answer. Please try again."
  });
}

return res.status(200).json({
  answer: answer.trim()
});

} catch (error) {
console.error("KRON Tutor backend error:", error);

return res.status(500).json({
  error: "Something went wrong while processing your question."
});

}
  }
