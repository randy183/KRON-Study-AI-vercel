export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Use GET for this test."
    });
  }

  try {
    const baseUrl =
      "https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html";

    const response = await fetch(baseUrl);

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        status: response.status,
        error: "NERDC returned an unsuccessful response."
      });
    }

    const html = await response.text();

    const links = [];
    const anchorPattern =
      /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

    let match;

    while ((match = anchorPattern.exec(html)) !== null) {
      const href = match[1].trim();

      const text = match[2]
        .replace(/<[^>]*>/g, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&nbsp;/gi, " ")
        .replace(/&#39;/gi, "'")
        .replace(/&quot;/gi, '"')
        .replace(/\s+/g, " ")
        .trim();

      if (!href || href.startsWith("javascript:")) {
        continue;
      }

      let absoluteUrl;

      try {
        absoluteUrl = new URL(href, baseUrl);
      } catch {
        continue;
      }

      const hostname = absoluteUrl.hostname.toLowerCase();

      if (
        hostname !== "nerdc.gov.ng" &&
        hostname !== "www.nerdc.gov.ng" &&
        hostname !== "nerdc.org.ng" &&
        hostname !== "www.nerdc.org.ng"
      ) {
        continue;
      }

      if (!links.some(link => link.url === absoluteUrl.href)) {
        links.push({
          title: text || absoluteUrl.pathname.split("/").pop() || "Curriculum resource",
          url: absoluteUrl.href
        });
      }
    }

    const relevantLinks = links.filter(link =>
      /curriculum|senior|secondary|subject|syllabus|science|mathematics|english|biology|chemistry|physics|economics|government|agricultur|accounting|commerce|geography|waec|ss[1-3]|download|pdf/i
        .test(link.title + " " + link.url)
    );

    return res.status(200).json({
      success: true,
      status: response.status,
      pageTitle:
        html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
          ?.replace(/\s+/g, " ")
          .trim() || "NERDC Curriculum",
      totalOfficialLinksFound: links.length,
      relevantLinksFound: relevantLinks.length,
      links: relevantLinks.slice(0, 50)
    });

  } catch (error) {
    console.error("NERDC link extraction failed:", error);

    return res.status(502).json({
      success: false,
      error: "Could not retrieve or inspect NERDC links."
    });
  }
    }
