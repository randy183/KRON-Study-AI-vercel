export default async function handler(req, res) {

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
            studentAnswer,
            studyData
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
        // PROMPT
        // =========================

        let prompt = "";


        // =========================
        // GENERATE QUIZ
        // =========================

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
        // GENERATE WEEKLY TARGET
        // =========================

        if (mode === "weekly-target") {

            const data =
                studyData || {};


            const studentLevel =
                data.level ||
                "Unknown";


            const studentTerm =
                data.term ||
                "Not specified";


            const recentQuizzes =
                Array.isArray(
                    data.recentQuizzes
                )
                    ? data.recentQuizzes
                    : [];


            const planner =
                data.planner || {};


            const notes =
                data.notes || {};


            const previousWeek =
                data.previousWeek || {};


            prompt = `
You are KRON Study AI, an intelligent Nigerian secondary-school study planner.

Create ONE realistic weekly study target for the student.

STUDENT LEVEL:
${studentLevel}

TERM:
${studentTerm}

RECENT QUIZ DATA:
${JSON.stringify(recentQuizzes)}

PLANNER DATA:
${JSON.stringify(planner)}

NOTES/STUDY DATA:
${JSON.stringify(notes)}

PREVIOUS WEEK:
${JSON.stringify(previousWeek)}

Your job is to analyze the student's study activity and create a balanced weekly target.

The target should consider:

- Student level
- Recent quiz performance
- Weak subjects
- Recent study activity
- Planner activity
- Notes activity
- Previous weekly-target performance
- Areas that need improvement

Do NOT create an impossible target.

The target should normally contain:

- 3 to 8 quizzes
- 3 to 10 planner/study tasks
- 1 to 6 notes/study topics

Choose sensible numbers based on the student's activity.

Also provide specific subject/topic recommendations.

Return ONLY valid JSON.

Use exactly this structure:

{
  "target": {
    "quizzes": 5,
    "tasks": 6,
    "notes": 3,
    "total": 14,
    "focusSubjects": [
      "Mathematics",
      "Chemistry"
    ],
    "recommendations": [
      "Complete two Mathematics practice sessions.",
      "Revise one weak Chemistry topic.",
      "Take at least one Chemistry quiz."
    ],
    "reason": "Short explanation of why KRON selected this target."
  }
}

Rules:

- "quizzes", "tasks", "notes", and "total" MUST be numbers.
- "total" MUST equal quizzes + tasks + notes.
- focusSubjects MUST be an array.
- recommendations MUST be an array.
- Keep recommendations practical.
- Do not invent personal information.
- Do not use markdown.
- Do not use code fences.
- Do not write anything before or after the JSON.
`;
        }


        // =========================
        // INVALID MODE
        // =========================

        if (
            mode !== "generate" &&
            mode !== "check" &&
            mode !== "weekly-target"
        ) {

            return res.status(400).json({
                error: "Invalid mode"
            });
        }


        // =========================
        // OPENROUTER REQUEST
        // =========================

        const response =
            await fetch(
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

                        model:
                            "openrouter/free",

                        messages: [

                            {
                                role: "system",

                                content:
                                    "You are KRON Study AI. Follow the requested JSON format exactly. Return valid JSON only."
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
                                : mode === "weekly-target"
                                    ? 2000
                                    : 1000

                    })
                }
            );


        // =========================
        // READ RESPONSE
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
        // CLEAN RESPONSE
        // =========================

        let cleaned =
            String(content).trim();


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
        // VALIDATE QUIZ
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
        // VALIDATE WEEKLY TARGET
        // =========================

        if (mode === "weekly-target") {

            if (
                !result ||
                !result.target
            ) {

                return res.status(502).json({

                    error:
                        "AI response did not contain a valid weekly target."

                });
            }


            const target =
                result.target;


            const quizzes =
                Number(target.quizzes) || 0;


            const tasks =
                Number(target.tasks) || 0;


            const notesCount =
                Number(target.notes) || 0;


            target.quizzes =
                quizzes;


            target.tasks =
                tasks;


            target.notes =
                notesCount;


            target.total =
                quizzes +
                tasks +
                notesCount;


            if (
                !Array.isArray(
                    target.focusSubjects
                )
            ) {

                target.focusSubjects = [];

            }


            if (
                !Array.isArray(
                    target.recommendations
                )
            ) {

                target.recommendations = [];

            }


            if (
                typeof target.reason !==
                "string"
            ) {

                target.reason =
                    "";

            }

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
