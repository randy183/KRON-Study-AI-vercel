import pdf from "pdf-parse";

const SUBJECTS = {
"Mathematics": "2.pdf",
"English Language": "1.pdf",
"Chemistry": "7.pdf",
"Physics": "8.pdf",
"Biology": "6.pdf"
};

export default async function handler(req, res) {
if (req.method !== "GET" && req.method !== "POST") {
return res.status(405).json({
success: false,
error: "Use GET or POST."
});
}

try {
const input = req.method === "POST"
? req.body
: req.query;

const level = String(input.level || "SS1").toUpperCase();
const subject = String(input.subject || "Mathematics");
const week = Number(input.week || 1);

if (!["SS1"].includes(level)) {
  return res.status(400).json({
    success: false,
    error: "This test currently supports SS1 only."
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
    error: "Subject is not configured yet.",
    availableSubjects: Object.keys(SUBJECTS)
  });
}

const pdfUrl =
  "https://lmis.nerdcportals.com.ng/sss_1/necurrdc/" +
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
    error: "Could not retrieve the NERDC PDF.",
    upstreamStatus: response.status
  });
}

const contentType =
  response.headers.get("content-type") || "";

if (!contentType.toLowerCase().includes("application/pdf")) {
  return res.status(502).json({
    success: false,
    error: "The source did not return a PDF.",
    contentType
  });
}

const buffer = Buffer.from(
  await response.arrayBuffer()
);

if (buffer.subarray(0, 5).toString() !== "%PDF-") {
  return res.status(502).json({
    success: false,
    error: "The downloaded file is not a valid PDF."
  });
}

const document = await pdf(buffer);

const text = document.text
  .replace(/[ \t]+/g, " ")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

const preview = text.slice(0, 8000);

return res.status(200).json({
  success: true,
  level,
  subject,
  requestedWeek: week,
  document: "NERDC Senior Secondary Curriculum",
  source: pdfUrl,
  pages: document.numpages,
  extractedCharacters: text.length,
  note: "These are extracted curriculum contents, not an official NERDC week-by-week schedule.",
  textPreview: preview
});

} catch (error) {
console.error("Curriculum extraction failed:", error);

return res.status(500).json({
  success: false,
  error: "Curriculum extraction failed.",
  details: error.message
});

}
  }
