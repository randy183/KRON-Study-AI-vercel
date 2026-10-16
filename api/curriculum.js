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
        error: "The AI service is not configured."
      });
    }

    const { level, subject, week } = req.body || {};

    const validLevels = ["SS1", "SS2", "SS3", "WAEC"];

    if (!validLevels.includes(level)) {
      return res.status(400).json({
        error: "Please select a valid class level."
      });
    }

    if (
      typeof subject !== "string" ||
      !subject.trim() ||
      subject.trim().length > 100
    ) {
      return res.status(400).json({
        error: "Please select a valid subject."
      });
    }

    if (
      !Number.isInteger(week) ||
      week < 1 ||
      week > 12
    ) {
      return res.status(400).json({
        error: "Please select a week from 1 to 12."
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

              content: `You are KRON Study AI's curriculum research assistant.

Your task is to research Nigerian secondary school curriculum topics.

OFFICIAL SOURCES:
Prioritise the Nigerian Educational Research and Development Council (NERDC).

Relevant official domains:
- nerdc.gov.ng
- nerdc.org.ng

RESEARCH RULES:

1. Use the enabled web-search tool to search official NERDC sources.
2. Prefer official curriculum documents and pages over third-party summaries.
3. Do not invent curriculum topics, quotations, document titles, or source links.
4. Distinguish verified curriculum information from your own suggested study schedule.
5. Do not claim to have verified a topic unless search results support it.
6. If the official curriculum cannot be found or accessed, explain that limitation.
7. Organise verified topics into a proposed weekly learning plan when appropriate.
8. Do not claim NERDC officially assigns a topic to a particular week unless a source confirms it.
9. Include clickable source URLs in your response.
10. Use clear English appropriate for Nigerian secondary school students.
11. If sources disagree or the curriculum version is unclear, explain that uncertainty.
12. Do not ask the student to provide an API key or account password.

Return a useful, concise curriculum research report.`
            },

            {
              role: "user",

              content: `Research the official Nigerian curriculum for:

Class level: ${level}
Subject: ${subject.trim()}
Requested study week: ${week} of 12

Search the official NERDC domains first.

Identify relevant curriculum topics supported by the search results. Explain how these topics could fit into this proposed study week.

Clearly separate verified curriculum information from the proposed weekly arrangement.

Include the title and URL of each useful official source. If you cannot verify suitable topics, say so instead of guessing.`
            }
          ],

          tools: [
            {
              type: "openrouter:web_search",

              parameters: {
                engine: "parallel",
                mode: "basic",
                max_results: 5,
                max_uses: 1,
                allowed_domains: [
                  "nerdc.gov.ng",
                  "nerdc.org.ng"
                ]
              }
            }
          ],

          max_tool_calls: 1,
          temperature: 0.2,
          max_tokens: 1400
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
        error:
          "Curriculum research is unavailable right now. Please try again."
      });
    }

    const message = data.choices?.[0]?.message;
    const answer = message?.content;

    if (!answer || typeof answer !== "string") {
      return res.status(502).json({
        error:
          "No curriculum report was returned. Please try again."
      });
    }

    return res.status(200).json({
      answer: answer.trim(),
      searchEnabled: true,
      sourcePolicy: "Official NERDC domains prioritised"
    });

  } catch (error) {
    console.error(
      "KRON Curriculum backend error:",
      error
    );

    return res.status(500).json({
      error:
        "Something went wrong while researching the curriculum."
    });
  }
        }
