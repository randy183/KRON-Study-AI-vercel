import pdf from "pdf-parse";

const SUBJECTS = {
"Mathematics": "2.pdf",
"English Language": "1.pdf",
"Chemistry": "7.pdf",
"Physics": "8.pdf",
"Biology": "6.pdf"
};

const CURRICULUM_FOLDERS = {
SS1: "sss_1",
SS2: "sss_2",
SS3: "sss_3"
};

function cleanText(text) {
return text
.replace(/\r/g, "\n")
.replace(/[ \t]+/g, " ")
.replace(/\n[ \t]+/g, "\n")
.replace(/\n{3,}/g, "\n\n")
.trim();
}

function extractTopicSections(text) {
const headings = [
"Overview",
"Scope and Sequence",
"Scope and Sequence of Content",
"Content",
"Learning Outcomes",
"Learning Objectives",
"Performance Objectives",
"Curriculum Content",
"Specific Objectives"
];

const lines = text
.split("\n")
.map(line => line.trim())
.filter(Boolean);

const sections = [];
const seen = new Set();

for (let i = 0; i < lines.length; i++) {
const line = lines[i];
const normalized = line
.replace(/[:.]+$/, "")
.trim()
.toLowerCase();

const matchedHeading = headings.find(
  heading => heading.toLowerCase() === normalized
);

if (!matchedHeading) continue;

const collected = [];
const limit = Math.min(lines.length, i + 45);

for (let j = i + 1; j < limit; j++) {
  const current = lines[j];

  if (
    headings.some(
      heading =>
        heading.toLowerCase() ===
        current.replace(/[:.]+$/, "").trim().toLowerCase()
    )
  ) {
    break;
  }

  collected.push(current);
}

const sectionText = collected.join("\n").trim();
const key = sectionText.toLowerCase();

if (sectionText.length > 80 && !seen.has(key)) {
  seen.add(key);

  sections.push({
    heading: matchedHeading,
    text: sectionText.slice(0, 5000)
  });
}

}

return sections.slice(0, 12);
}

export default async function handler(req, res) {
if (req.method !== "GET" && req.method !== "POST") {
return res.status(405).json({
success: false,
error: "Use GET or POST."
});
}

try {
let input = {};

if (req.method === "POST") {
  input = typeof req.body === "string"
    ? JSON.parse(req.body)
    : req.body || {};
} else {
  input = req.query || {};
}

const level = String(input.level || "SS1")
  .trim()
  .toUpperCase();

const subject = String(input.subject || "Mathematics")
  .trim();

const week = Number(input.week || 1);

if (!CURRICULUM_FOLDERS[level]) {
  return res.status(400).json({
    success: false,
    error: "Choose SS1, SS2, or SS3."
  });
}

if (!Number.isInteger(week) || week < 1 || week > 12) {
  return res.status(400).json({
    success: false,
    error: "Week must be between 1 and 12."
  });
}

const pdfFile = SUBJECTS[subject];

if (!pdfFile) {
  return res.status(400).json({
    success: false,
    error: "Subject is not configured.",
    availableSubjects: Object.keys(SUBJECTS)
  });
}

const pdfUrl =
  "https://lmis.nerdcportals.com.ng/" +
  CURRICULUM_FOLDERS[level] +
  "/necurrdc/" +
  pdfFile;

const response = await fetch(pdfUrl, {
  redirect: "follow",
  signal: AbortSignal.timeout(25000),
  headers: {
    "User-Agent": "Mozilla/5.0"
  }
});

if (!response.ok) {
  return res.status(502).json({
    success: false,
    error: "Could not retrieve the curriculum PDF.",
    source: pdfUrl,
    upstreamStatus: response.status
  });
}

const contentType =
  response.headers.get("content-type") || "";

if (!contentType.toLowerCase().includes("application/pdf")) {
  return res.status(502).json({
    success: false,
    error: "The source did not return a PDF.",
    source: pdfUrl,
    contentType
  });
}

const buffer = Buffer.from(
  await response.arrayBuffer()
);

if (buffer.subarray(0, 5).toString() !== "%PDF-") {
  return res.status(502).json({
    success: false,
    error: "Invalid PDF file."
  });
}

const document = await pdf(buffer);
const text = cleanText(document.text);
const topicSections = extractTopicSections(text);

return res.status(200).json({
  success: true,
  level,
  subject,
  requestedWeek: week,
  source: pdfUrl,
  pages: document.numpages,
  extractedCharacters: text.length,
  topicSectionsFound: topicSections.length,
  topicSections,
  note: topicSections.length
    ? "These are extracted curriculum sections. They have not yet been verified as a week-by-week plan."
    : "No matching headings were detected. The PDF's actual structure needs inspection before topics can be extracted reliably."
});

} catch (error) {
console.error("Topic extraction failed:", error);

return res.status(500).json({
  success: false,
  error: "Topic extraction failed.",
  details: error.message || "Unknown error."
});

}
  }
