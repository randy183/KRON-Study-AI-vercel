export default async function handler(req, res) {
if (req.method !== "GET") {
return res.status(405).json({ error: "Use GET for this test." });
}

const url =
"https://www.nerdc.gov.ng/content_manager/national_curriculum_brief.html";

try {
const response = await fetch(url, {
redirect: "follow",
signal: AbortSignal.timeout(15000)
});

const html = await response.text();

const text = html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/\s+/g, " ")
  .trim();

const terms = [
  "senior secondary",
  "SS1",
  "SS2",
  "SS3",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "download",
  ".pdf",
  ".docx"
];

const matches = {};

for (const term of terms) {
  const found = [];
  const lowerText = text.toLowerCase();
  const lowerTerm = term.toLowerCase();
  let position = 0;

  while (
    (position = lowerText.indexOf(lowerTerm, position)) !== -1 &&
    found.length < 3
  ) {
    found.push(
      text.slice(
        Math.max(0, position - 140),
        Math.min(text.length, position + term.length + 220)
      )
    );

    position += lowerTerm.length;
  }

  matches[term] = found;
}

return res.status(200).json({
  success: response.ok,
  status: response.status,
  pageLength: html.length,
  extractedTextLength: text.length,
  matches
});

} catch (error) {
return res.status(200).json({
success: false,
error: error.message
});
}
}
