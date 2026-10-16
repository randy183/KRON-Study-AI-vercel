export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Use GET for this test."
    });
  }

  const targets = [
    "http://www.nerdc.org.ng/eCurriculum",
    "https://www.nerdc.org.ng/eCurriculum",
    "https://nerdc.org.ng/CurriculumView.aspx"
  ];

  const results = [];

  for (const url of targets) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(12000)
      });

      const html = await response.text();

      const title =
        html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
          ?.replace(/<[^>]*>/g, "")
          .replace(/\s+/g, " ")
          .trim() || "";

      const formCount = (html.match(/<form\b/gi) || []).length;
      const selectCount = (html.match(/<select\b/gi) || []).length;

      results.push({
        requestedUrl: url,
        finalUrl: response.url,
        status: response.status,
        contentType: response.headers.get("content-type"),
        responseLength: html.length,
        title,
        formCount,
        selectCount,
        preview: html.slice(0, 150)
      });
    } catch (error) {
      results.push({
        requestedUrl: url,
        error: error.message
      });
    }
  }

  return res.status(200).json({ results });
}
