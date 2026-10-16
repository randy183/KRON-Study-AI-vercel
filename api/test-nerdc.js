export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Use GET for this test."
    });
  }

  const targets = [
    "https://lmis.nerdcportals.com.ng/sss_1",
    "https://lmis.nerdcportals.com.ng/s1_core",
    "https://lmis.nerdcportals.com.ng/sss_1/necurrdc/viewer.html?file=4.pdf",
    "https://lmis.nerdcportals.com.ng/sss_1/necurrdc/viewer.html?file=6.pdf"
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

      const links = [];
      const pattern =
        /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

      let match;

      while ((match = pattern.exec(html)) !== null) {
        links.push({
          text: match[2]
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim(),
          url: new URL(match[1], response.url).href
        });
      }

      const visibleText = html
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      results.push({
        requestedUrl: url,
        finalUrl: response.url,
        status: response.status,
        contentType: response.headers.get("content-type"),
        pageLength: html.length,
        title,
        textPreview: visibleText.slice(0, 1800),
        links: links.slice(0, 25)
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
