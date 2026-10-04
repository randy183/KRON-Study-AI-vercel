export default async function handler(req, res) {

    if (req.method !== "POST") {

        return res.status(405).json({
            error: "Method not allowed"
        });

    }


    try {

        const {
            mode,
            subject,
            count,
            question,
            correctAnswer,
            studentAnswer
        } = req.body || {};


        if (!mode) {

            return res.status(400).json({
                error: "Missing mode"
            });

        }


        const apiKey =
            process.env.OPENROUTER_API_KEY;


        if (!apiKey) {

            return res.status(500).json({
                error:
                    "OPENROUTER_API_KEY is not configured."
            });

        }


        let prompt = "";


        if (mode === "generate") {

            const number =
                Number(count) || 5;


            const choiceCount =
                Math.ceil(number * 0.6);


            const writtenCount =
                number - choiceCount;


            prompt = `
You are KRON Study AI,
an expert Nigerian secondary-school teacher.

Generate exactly ${number} fresh ${subject}
practice questions suitable for WAEC/SSCE students.

IMPORTANT QUESTION MIX:

- ${choiceCount} questions must be multiple-choice.
- ${writtenCount} questions must be written-answer questions.
- Multiple-choice questions must have exactly
  4 options.
- Written questions must have no options.
- Do not repeat questions.
- Make the questions academically useful.
- Give the correct answer and a clear explanation.

Return ONLY valid JSON.

Use this exact structure:

{
  "questions": [
    {
      "type": "choice",
      "question": "Question text",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "correct": 0,
      "answer": "Correct answer",
      "explanation": "Clear explanation"
    },
    {
      "type": "written",
      "question": "Question text",
      "answer": "Expected answer",
      "explanation": "Clear explanation"
    }
  ]
}

For "correct", use:
0 for option A,
1 for option B,
2 for option C,
3 for option D.

Do not include markdown.
Do not include code fences.
`;
        }


        if (mode === "check") {

            prompt = `
You are KRON Study AI,
an expert Nigerian secondary-school teacher.

Subject:
${subject}

Question:
${question}

Expected answer:
${correctAnswer}

Student answer:
${studentAnswer}

Determine whether the student's answer
is substantially correct.

Accept reasonable wording differences.

Return ONLY valid JSON:

{
  "correct": true,
  "explanation": "Explain why the answer is correct or incorrect and give the correct concept."
}

The value of "correct" must be either true or false.
Do not include markdown.
Do not include code fences.
`;

        }
         if (
            mode !== "generate" &&
            mode !== "check"
        ) {

            return res.status(400).json({
                error: "Invalid mode"
            });

        }


        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${apiKey}`,

                    "HTTP-Referer":
                        "https://kron-study-ai.vercel.app",

                    "X-Title":
                        "KRON Study AI"
                },

                body: JSON.stringify({

                    model:
                        "openai/gpt-4o-mini",

                    messages: [

                        {
                            role: "system",

                            content:
                                "You are KRON Study AI. Always follow the requested JSON format exactly."
                        },

                        {
                            role: "user",

                            content: prompt
                        }

                    ],

                    temperature: 0.7,

                    max_tokens: 5000

                })

            }
        );


        const data =
            await response.json();


        if (!response.ok) {

            return res.status(
                response.status
            ).json({

                error:
                    data?.error?.message ||
                    "OpenRouter request failed."

            });

        }


        const content =
            data?.choices?.[0]?.message?.content;


        if (!content) {

            return res.status(500).json({

                error:
                    "The AI returned no content."

            });

        }


        let cleaned =
            content.trim();


        if (cleaned.startsWith("```")) {

            cleaned =
                cleaned
                    .replace(/^```json\s*/i, "")
                    .replace(/^```\s*/i, "")
                    .replace(/\s*```$/i, "")
                    .trim();

        }


        let result;


        try {

            result =
                JSON.parse(cleaned);

        } catch (parseError) {

            return res.status(500).json({

                error:
                    "The AI returned invalid JSON."

            });

        }


        return res.status(200).json(result);


    } catch (error) {

        console.error(
            "KRON AI error:",
            error
        );


        return res.status(500).json({

            error:
                error.message ||
                "Unexpected server error."

        });

    }

}     
