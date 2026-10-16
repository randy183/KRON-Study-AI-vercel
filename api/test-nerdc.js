export default async function handler(req, res) {
if (req.method !== "GET") {
return res.status(405).json({ error: "Use GET for this test." });
}

const targets = [
"https://www.nerdc.gov.ng/content_manager/national_curriculum_brief.html",
"https://www.nerdc.gov.ng/content_manager/cdc.html",
"https://www.nerdc.gov.ng/content_manager/cd.html"
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

  const links = [];
  const pattern =
    /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match;

  while ((match = pattern.exec(html)) !== null) {
    const href = match[1].trim();
    const text = match[2]
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/\s+/g, " ")
      .trim();

    if (!href || href.startsWith("#") || href.startsWith("javascript:")) {
      continue;
    }

    let resolved;

    try {
      resolved = new URL(href, url);
    } catch {
      continue;
    }

    if (
      !["nerdc.gov.ng", "www.nerdc.gov.ng", "nerdc.org.ng", "www.nerdc.org.ng"]
        .includes(resolved.hostname.toLowerCase())
    ) {
      continue;
    }

    if (
      /\.(pdf|doc|docx|xls|xlsx|zip)(?:$|[?#])/i.test(resolved.href) ||
      /curriculum|syllabus|senior secondary|subject|download|document|education/i.test(
        text + " " + resolved.pathname
      )
    ) {
      links.push({
        title: text || "(No link title)",
        url: resolved.href
      });
    }
  }

  results.push({
    url,
    status: response.status,
    title,
    pageLength: html.length,
    relevantLinkCount: links.length,
    links: links.slice(0, 20)
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
