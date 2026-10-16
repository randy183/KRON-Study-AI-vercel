export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Use GET for this test."
    });
  }

  const targets = [
    "https://lmis.nerdcportals.com.ng/sss_1",
    "https://lmis.nerdcportals.com.ng/sss_2",
    "https://lmis.nerdcportals.com.ng/sss_3"
  ];

  const results = [];

  for (const url of targets) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(15000),
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      });

      const html = await response.text();

      const title =
        html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
          ?.replace(/<[^>]*>/g, "")
          .replace(/\s+/g, " ")
          .trim() || "";

      results.push({
        requestedUrl: url,
        finalUrl: response.url,
        status: response.status,
        contentType: response.headers.get("content-type"),
        pageLength: html.length,
        title,
        hasLoginForm: /type=["']password["']/i.test(html),
        hasPdfLink: /\.pdf(?:[?#"']|$)/i.test(html),
        preview: html.slice(0, 250)
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
