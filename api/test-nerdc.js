export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Use GET for this test."
    });
  }

  const targets = [
    "https://lmis.nerdcportals.com.ng/s1_core",
    "https://lmis.nerdcportals.com.ng/s1_science",
    "https://lmis.nerdcportals.com.ng/s1_humanities",
    "https://lmis.nerdcportals.com.ng/s1_business",
    "https://lmis.nerdcportals.com.ng/viewer/sss_1/1",
    "https://lmis.nerdcportals.com.ng/viewer/sss_1/2"
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
        try {
          links.push({
            text: match[2]
              .replace(/<[^>]*>/g, " ")
              .replace(/\s+/g, " ")
              .trim(),
            url: new URL(match[1], response.url).href
          });
        } catch {}
      }

      const visibleText = html
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/\s+/g, " ")
        .trim();

      const pdfReferences = [
        ...new Set(
          [...html.matchAll(/["']([^"'<>]*\.pdf(?:\?[^"'<>]*)?)["']/gi)]
            .map(item => {
              try {
                return new URL(item[1], response.url).href;
              } catch {
                return null;
              }
            })
            .filter(Boolean)
        )
      ];

      results.push({
        url,
        status: response.status,
        contentType: response.headers.get("content-type"),
        pageLength: html.length,
        title,
        textPreview: visibleText.slice(0, 900),
        links: links.slice(0, 15),
        pdfReferences: pdfReferences.slice(0, 10)
      });
    } catch (error) {
      results.push({
        url,
        error: error.message
      });
    }
  }

  return res.status(200).json({ results });
}
