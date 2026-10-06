export default async function handler(req, res) {

    // =========================
    // METHOD CHECK
    // =========================

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {

        // =========================
        // READ REQUEST
        // =========================

        const {
            mode,
            level,
            term,
            subject,
            count,
            question,
            correctAnswer,
            studentAnswer
        } = req.body || {};


        // =========================
        // BASIC VALIDATION
        // =========================

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
                    "OPENROUTER_API_KEY is not configured in Vercel."
            });
        }


        // =========================
        // GENERATE QUIZ
        // =========================

        let prompt = "";


        if (mode === "generate") {

            if (!subject) {
                return res.status(400).json({
                    error: "Missing subject"
                });
            }


            const number =
                Math.max(
                    1,
                    Math.min(
                        Number(count) || 5,
                        20
                    )
                );


            const choiceCount =
                Math.round(number * 0.6);


            const writtenCount =
                number - choiceCount;


            const levelText =
                level || "WAEC";


            const termText =
                levelText === "WAEC"
                    ? "WAEC/SSCE syllabus"
                    : `${levelText}, ${term || "selected term"}`;


            prompt = `
You are KRON Study AI, an expert Nigerian secondary-school teacher.

Create exactly ${number} fresh academic practice questions.

STUDENT LEVEL:
${termText}

SUBJECT:
${subject}

QUESTION REQUIREMENTS:

- Generate exactly ${number} questions.
- ${choiceCount} must be multiple-choice questions.
- ${writtenCount} must be written-answer questions.
- Every multiple-choice question must have exactly 4 options.
- Only one option may be correct.
- Written questions must have no options.
- Do not repeat questions.
- Questions must be appropriate for the selected student level.
- Follow Nigerian secondary-school / WAEC-style academic standards.
- Use correct facts, formulas, terminology and calculations.
- Give the correct answer for every question.
- Give a clear explanation for every question.
- Do not invent syllabus topics that are clearly inappropriate for the selected level.
- For numerical questions, calculate the answer carefully.

MULTIPLE-CHOICE FORMAT:

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
}

The value of "correct" MUST be:
0 = Option A
1 = Option B
2 = Option C
3 = Option D

WRITTEN FORMAT:

{
  "type": "written",
  "question": "Question text",
  "answer": "Expected answer",
  "explanation": "Clear explanation"
}

FINAL RESPONSE RULES:

Return ONLY valid JSON.

Do NOT use markdown.

Do NOT use code fences.

Do NOT write anything before or after the JSON.

Use this exact top-level structure:

{
  "questions": [
    ...
  ]
}
`;
        }


        // =========================
        // CHECK WRITTEN ANSWER
        // =========================

        if (mode === "check") {

            if (!question) {
                return res.status(400).json({
                    error: "Missing question"
                });
            }


            prompt = `
You are KRON Study AI, an expert Nigerian secondary-school teacher.

SUBJECT:
${subject || "General"}

QUESTION:
${question}

EXPECTED ANSWER:
${correctAnswer || ""}

STUDENT ANSWER:
${studentAnswer || ""}

Determine whether the student's answer is substantially correct.

Rules:

- Accept reasonable wording differences.
- Do not require the student's wording to exactly match the expected answer.
- For mathematical answers, accept equivalent correct forms.
- For definitions, accept correct explanations even when wording differs.
- If the student answer is partly correct but misses an essential part, mark it false.
- Give a short, educational explanation.
- State the correct concept or answer when the student is wrong.

Return ONLY valid JSON.

Use exactly this structure:

{
  "correct": true,
  "explanation": "Clear explanation"
}

The "correct" value MUST be either true or false.

Do NOT use markdown.

Do NOT use code fences.

Do NOT write anything before or after the JSON.
`;
        }


        // =========================
        // INVALID MODE
        // =========================

        if (
            mode !== "generate" &&
            mode !== "check"
        ) {

            return res.status(400).json({
                error: "Invalid mode"
            });
        }


        // =========================
        // OPENROUTER REQUEST
        // =========================

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
                        "https://randy183.github.io/KRON-Study-AI/",

                    "X-Title":
                        "KRON Study AI"
                },

                body: JSON.stringify({

                    // OpenRouter's free router
                    // automatically selects an available
                    // free model.
                    model:
                        "openrouter/free",

                    messages: [

                        {
                            role: "system",

                            content:
                                "You are KRON Study AI. Follow the user's requested JSON format exactly. Return valid JSON only."
                        },

                        {
                            role: "user",

                            content: prompt
                        }

                    ],

                    temperature: 0.3,

                    max_tokens:
                        mode === "generate"
                            ? 5000
                            : 1000

                })
            }
        );


        // =========================
        // READ OPENROUTER RESPONSE
        // =========================

        let data;

        try {

            data =
                await response.json();

        } catch (jsonError) {

            return res.status(502).json({
                error:
                    "OpenRouter returned an invalid response."
            });

        }


        // =========================
        // OPENROUTER ERROR
        // =========================

        if (!response.ok) {

            console.error(
                "OpenRouter API error:",
                data
            );


            const providerMessage =
                data?.error?.message ||
                data?.error ||
                data?.message ||
                JSON.stringify(data);


            return res.status(502).json({

                error:
                    "OpenRouter error: " +
                    providerMessage

            });
        }


        // =========================
        // GET AI CONTENT
        // =========================

        const content =
            data?.choices?.[0]?.message?.content;


        if (!content) {

            console.error(
                "OpenRouter response:",
                data
            );


            return res.status(502).json({

                error:
                    "OpenRouter returned no AI content."

            });
        }


        // =========================
        // CLEAN AI RESPONSE
        // =========================

        let cleaned =
            String(content).trim();


        // Remove markdown code fences
        if (cleaned.startsWith("```")) {

            cleaned =
                cleaned
                    .replace(
                        /^```json\s*/i,
                        ""
                    )
                    .replace(
                        /^```\s*/i,
                        ""
                    )
                    .replace(
                        /\s*```$/i,
                        ""
                    )
                    .trim();
        }


        // =========================
        // PARSE JSON
        // =========================

        let result;


        try {

            result =
                JSON.parse(cleaned);

        } catch (parseError) {

            console.error(
                "Invalid AI JSON:",
                cleaned
            );


            return res.status(502).json({

                error:
                    "AI returned invalid JSON."

            });
        }


        // =========================
        // VALIDATE GENERATE RESULT
        // =========================

        if (mode === "generate") {

            if (
                !result ||
                !Array.isArray(
                    result.questions
                )
            ) {

                return res.status(502).json({

                    error:
                        "AI response did not contain a valid questions array."

                });
            }


            if (
                result.questions.length === 0
            ) {

                return res.status(502).json({

                    error:
                        "AI returned an empty quiz."

                });
            }


            // Make sure every question
            // has the fields KRON expects.

            result.questions =
                result.questions.map(
                    (item) => {

                        if (
                            item.type === "choice"
                        ) {

                            return {

                                type:
                                    "choice",

                                question:
                                    item.question ||
                                    "",

                                options:
                                    Array.isArray(
                                        item.options
                                    )
                                        ? item.options
                                        : [],

                                correct:
                                    Number.isInteger(
                                        item.correct
                                    )
                                        ? item.correct
                                        : 0,

                                answer:
                                    item.answer ||
                                    "",

                                explanation:
                                    item.explanation ||
                                    ""

                            };

                        }


                        return {

                            type:
                                "written",

                            question:
                                item.question ||
                                "",

                            answer:
                                item.answer ||
                                "",

                            explanation:
                                item.explanation ||
                                ""

                        };

                    }
                );
        }


        // =========================
        // RETURN RESULT
        // =========================

        return res.status(200).json(
            result
        );


    } catch (error) {

        console.error(
            "KRON backend error:",
            error
        );


        return res.status(500).json({

            error:
                error?.message ||
                "Unexpected server error."

        });

    }
                        }
