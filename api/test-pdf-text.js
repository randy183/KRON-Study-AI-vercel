import pdf from "pdf-parse";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Use GET for this test."
    });
  }

  const pdfUrl =
    "https://lmis.nerdcportals.com.ng/sss_1/necurrdc/2.pdf";

  try {
    const response = await fetch(pdfUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(25000),
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    if (!response.ok) {
      return res.status(502).json({
        error: "Could not retrieve the official curriculum PDF.",
        upstreamStatus: response.status
      });
    }

    const contentType =
      response.headers.get("content-type") || "";

    if (!contentType.toLowerCase().includes("application/pdf")) {
      return res.status(502).json({
        error: "The source did not return a PDF.",
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
        error: "The downloaded file is not a valid PDF."
      });
    }

    const data = await pdf(buffer);

    return res.status(200).json({
      success: true,
      source: pdfUrl,
      document: "NERDC SS1 Mathematics Curriculum",
      pages: data.numpages,
      extractedCharacters: data.text.length,
      textPreview: data.text.slice(0, 6500)
    });
  } catch (error) {
    console.error("PDF extraction failed:", error);

    return res.status(500).json({
      success: false,
      error: "PDF extraction failed.",
      details: error.message
    });
  }
}
