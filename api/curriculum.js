const OPENROUTER_URL =
  "https://openrouter.ai/api/v1/chat/completions";

const SUPABASE_TABLE = "kron_study_cache";

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function makeCacheKey(level, term, subject, topic = "") {
  return [
    normalize(level),
    normalize(term),
    normalize(subject),
    normalize(topic)
  ].join("__");
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase environment variables are missing."
    );
  }

  return {
    url: url.replace(/\/+$/, ""),
    key
  };
}

async function supabaseRequest(path, options = {}) {
  const { url, key } = getSupabaseConfig();

  const response = await fetch(
    `${url}/rest/v1/${path}`,
    {
      ...options,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...options.headers
      },
      signal: AbortSignal.timeout(20000)
    }
  );

  const text = await response.text();

  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    console.error(
      "Supabase error:",
      response.status,
      data
    );

    throw new Error(
      "KRON could not access its saved study content."
    );
  }

  return data;
}

async function getSavedContent(cacheKey) {
  const query =
    `${SUPABASE_TABLE}` +
    "?select=cache_key,content_type,content,sources" +
    `&cache_key=eq.${encodeURIComponent(cacheKey)}` +
    "&limit=1";

  const rows = await supabaseRequest(query);

  return Array.isArray(rows) && rows.length > 0
    ? rows[0]
    : null;
}

async function saveContent(record) {
  const saved = await supabaseRequest(
    `${SUPABASE_TABLE}?on_conflict=cache_key`,
    {
      method: "POST",
      headers: {
        Prefer: "resolution=ignore-duplicates,return=representation"
      },
      body: JSON.stringify(record)
    }
  );

  if (Array.isArray(saved) && saved.length > 0) {
    return saved[0];
  }

  // Another request may have saved the same content
  // while this request was generating it.
  const existing = await getSavedContent(
    record.cache_key
  );

  if (existing) {
    return existing;
  }

  throw new Error(
    "KRON could not confirm that the content was saved."
  );
}

function parseAIJSON(text) {
  if (typeof text !== "string") {
    throw new Error("The AI returned no content.");
  }

  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start < 0 || end < start) {
    throw new Error(
      "The AI did not return the required JSON."
    );
  }

  return JSON.parse(
    cleaned.slice(start, end + 1)
  );
}

async function generateContent(prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "The OpenRouter API key is missing."
    );
  }

  const response = await fetch(
    OPENROUTER_URL,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer":
          "https://kronstudyaivercel.vercel.app",
        "X-Title": "KRON Study AI"
      },
      body: JSON.stringify({
        model: "openrouter/free",

        messages: [
          {
            role: "system",
            content: `
You are KRON Study AI, a Nigerian secondary-school
curriculum researcher and teacher.

RESEARCH REQUIREMENTS:
- Use the web-search tool to research the requested subject.
- Search the wider web, including official and reputable
  Nigerian educational sources.
- Prefer official sources when available.
- Never invent sources, URLs, official claims or topics.
- Distinguish verified information from suggested study plans.
- Use clear English suitable for Nigerian students.
- Return valid JSON only, without Markdown fences.

For a curriculum request, return this structure:
{
  "title": "Curriculum title",
  "topics": [
    {
      "week": 1,
      "title": "Topic title",
      "description": "Short description"
    }
  ],
  "sources": [
    {
      "title": "Source title",
      "url": "https://example.com"
    }
  ],
  "notes": "Research limitations or uncertainties"
}

For a lesson request, return this structure:
{
  "title": "Lesson title",
  "introduction": "Introduction",
  "learningObjectives": ["Objective"],
  "sections": [
    {
      "heading": "Section heading",
      "explanation": "Detailed explanation"
    }
  ],
  "workedExamples": [
    {
      "question": "Example question",
      "solution": "Step-by-step solution"
    }
  ],
  "summary": ["Key point"],
  "practiceQuestions": [
    {
      "question": "Practice question",
      "answer": "Answer and explanation"
    }
  ],
  "sources": [
    {
      "title": "Source title",
      "url": "https://example.com"
    }
  ]
}
`
          },
          {
            role: "user",
            content: prompt
          }
        ],

        tools: [
          {
            type: "openrouter:web_search",
            parameters: {
              engine: "auto",
              max_results: 5,
              max_uses: 2
            }
          }
        ],

        temperature: 0.2,
        max_tokens: 5000
      }),
      signal: AbortSignal.timeout(60000)
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(
      "OpenRouter error:",
      response.status,
      data.error?.message || data
    );

    throw new Error(
      "Online curriculum research failed. Please try again."
    );
  }

  const message = data.choices?.[0]?.message;

  if (!message || typeof message.content !== "string") {
    throw new Error(
      "OpenRouter returned no usable content."
    );
  }

  return parseAIJSON(message.content);
}

function validateRequest(body) {
  const action = body.action;
  const level = String(body.level || "").trim();
  const term = String(body.term || "").trim();
  const subject = String(body.subject || "").trim();
  const topic = String(body.topic || "").trim();

  if (
    !["getCurriculum", "getLesson"].includes(action)
  ) {
    throw new Error(
      "Invalid action. Use getCurriculum or getLesson."
    );
  }

  if (
    !["SS1", "SS2", "SS3", "WAEC"].includes(level)
  ) {
    throw new Error("Select a valid class level.");
  }

  if (!subject || subject.length > 100) {
    throw new Error("Select a valid subject.");
  }

  if (
    ![
      "First Term",
      "Second Term",
      "Third Term",
      "WAEC Syllabus"
    ].includes(term)
  ) {
    throw new Error("Select a valid term.");
  }

  if (level === "WAEC" && term !== "WAEC Syllabus") {
    throw new Error(
      "Choose WAEC Syllabus for WAEC preparation."
    );
  }

  if (level !== "WAEC" && term === "WAEC Syllabus") {
    throw new Error(
      "Select a school term for SS1, SS2 or SS3."
    );
  }

  if (action === "getLesson") {
    if (!topic || topic.length > 200) {
      throw new Error("Select a valid topic.");
    }
  }

  return {
    action,
    level,
    term,
    subject,
    topic
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed."
    });
  }

  try {
    const body = req.body || {};

    if (
      Buffer.byteLength(JSON.stringify(body)) > 12000
    ) {
      return res.status(413).json({
        error: "The request is too large."
      });
    }

    const {
      action,
      level,
      term,
      subject,
      topic
    } = validateRequest(body);

    const contentType =
      action === "getCurriculum"
        ? "curriculum"
        : "lesson";

    const cacheKey = makeCacheKey(
      level,
      term,
      subject,
      action === "getLesson" ? topic : ""
    );

    // 1. Check the database before using the AI.
    const existing = await getSavedContent(cacheKey);

    if (existing) {
      return res.status(200).json({
        success: true,
        cached: true,
        content: existing.content,
        sources: existing.sources || []
      });
    }

    // 2. Generate only the missing content.
    let prompt;

    if (action === "getCurriculum") {
      prompt = `
Research the online scheme of work for:

Class: ${level}
Term: ${term}
Subject: ${subject}

Find the relevant Nigerian secondary-school curriculum topics.
Organise them into a useful weekly plan.

Include as many weeks as the evidence supports, normally
around 12 for a school term.

Do not claim that a specific topic officially belongs to a
specific week unless a source confirms that allocation.

If exact weekly allocations are unavailable, label the
weekly arrangement as a proposed study plan.

Return the required curriculum JSON structure.
`;
    } else {
      prompt = `
Prepare a detailed study lesson for:

Class: ${level}
Term: ${term}
Subject: ${subject}
Topic: ${topic}

Research the topic online. Explain it step by step using
appropriate examples and worked solutions where relevant.

Include learning objectives, a clear introduction, detailed
sections, a summary, practice questions and useful sources.

Generate this lesson only. Do not generate another curriculum.

Return the required lesson JSON structure.
`;
    }

    const content = await generateContent(prompt);

    if (
      contentType === "curriculum" &&
      (
        !Array.isArray(content.topics) ||
        content.topics.length === 0
      )
    ) {
      throw new Error(
        "No curriculum topics were returned."
      );
    }

    if (
      contentType === "lesson" &&
      (
        !content.title ||
        !Array.isArray(content.sections)
      )
    ) {
      throw new Error(
        "The generated lesson is incomplete."
      );
    }

    const sources = Array.isArray(content.sources)
      ? content.sources
      : [];

    // 3. Save the result for future requests.
    const saved = await saveContent({
      cache_key: cacheKey,
      content_type: contentType,
      level,
      term,
      subject,
      topic: action === "getLesson" ? topic : "",
      content,
      sources,
      updated_at: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      cached: false,
      content: saved.content || content,
      sources: saved.sources || sources
    });

  } catch (error) {
    console.error(
      "KRON curriculum error:",
      error
    );

    return res.status(500).json({
      error:
        error.message ||
        "KRON could not process the request."
    });
  }
}
