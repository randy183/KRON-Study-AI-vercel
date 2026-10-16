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
  if (typeof req.body === "string") {
    try {
      input = JSON.parse(req.body);
    } catch {
      return res.status(400).json({
        success: false,
        error: "Request body must contain valid JSON."
      });
    }
  } else {
    input = req.body || {};
  }
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
    error: "Choose SS1, SS2, or SS3.",
    availableLevels: Object.keys(CURRICULUM_FOLDERS)
  });
}

if (!Number.isInteger(week) || week < 1 || week > 12) {
  return res.status(400).json({
    success: false,
    error: "Week must be a whole number from 1 to 12."
  });
}

const pdfFile = SUBJECTS[subject];

if (!pdfFile) {
  return res.status(400).json({
    success: false,
    error: "This subject has not been configured yet.",
    availableSubjects: Object.keys(SUBJECTS)
  });
}

const folder = CURRICULUM_FOLDERS[level];

const pdfUrl =
  "https://lmis.nerdcportals.com.ng/" +
  folder +
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
    level,
    subject,
    source: pdfUrl,
    upstreamStatus: response.status,
    note:
      "The PDF may be missing from this folder or the source may be unavailable."
  });
}

const contentType =
  response.headers.get("content-type") || "";

if (!contentType.toLowerCase().includes("application/pdf")) {
  return res.status(502).json({
    success: false,
    error: "The source did not return a PDF.",
    level,
    subject,
    source: pdfUrl,
    contentType
  });
}

const buffer = Buffer.from(
  await response.arrayBuffer()
);

if (
  buffer.length < 5 ||
  buffer.subarray(0, 5).toString() !== "%PDF-"
) {
  return res.status(502).json({
    success: false,
    error: "The downloaded file is not a valid PDF.",
    level,
    subject,
    source: pdfUrl
  });
}

const document = await pdf(buffer);

const text = document.text
  .replace(/[ \t]+/g, " ")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

if (!text || text.length < 100) {
  return res.status(502).json({
    success: false,
    error: "The PDF was retrieved, but too little text was extracted.",
    level,
    subject,
    source: pdfUrl,
    pages: document.numpages,
    extractedCharacters: text.length
  });
}

return res.status(200).json({
  success: true,
  level,
  subject,
  requestedWeek: week,
  document: "NERDC Senior Secondary Curriculum",
  source: pdfUrl,
  pages: document.numpages,
  extractedCharacters: text.length,
  note:
    "This endpoint extracts the source document. It does not yet identify weekly topics or create an official week-by-week schedule.",
  textPreview: text.slice(0, 8000)
});

} catch (error) {
console.error("Curriculum extraction failed:", error);

return res.status(500).json({
  success: false,
  error: "Curriculum extraction failed.",
  details: error.message || "Unknown server error."
});

}
}
