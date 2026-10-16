export default async function handler(req, res) {
if (req.method !== "GET") {
return res.status(405).json({
error: "Use GET for this test."
});
}

const baseUrl =
"https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html";

try {
const response = await fetch(baseUrl, {
redirect: "follow",
signal: AbortSignal.timeout(15000)
});

if (!response.ok) {
  return res.status(200).json({
    success: false,
    status: response.status,
    message: "NERDC homepage could not be retrieved."
  });
}

const html = await response.text();

const links = [];
const pattern =
  /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

let match;

while ((match = pattern.exec(html)) !== null) {
  const href = match[1].trim();
  const title = match[2]
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

  if (!href || href.startsWith("#") || href.startsWith("javascript:")) {
    continue;
  }

  let url;

  try {
    url = new URL(href, baseUrl);
  } catch {
    continue;
  }

  if (
    !["nerdc.gov.ng", "www.nerdc.gov.ng", "nerdc.org.ng", "www.nerdc.org.ng"]
      .includes(url.hostname.toLowerCase())
  ) {
    continue;
  }

  const combined = (title + " " + url.pathname).toLowerCase();

  const relevant =
    /\.(pdf|doc|docx|xls|xlsx|zip)(?:$|\/)/i.test(url.pathname) ||
    /curriculum|syllabus|senior secondary|subject|education|download|document|scheme of work/.test(combined);

  if (relevant) {
    links.push({
      title: title || "(No link title)",
      url: url.href
    });
  }
}

const uniqueLinks = [
  ...new Map(links.map(link => [link.url, link])).values()
];

return res.status(200).json({
  success: true,
  homepageStatus: response.status,
  homepageLength: html.length,
  relevantLinkCount: uniqueLinks.length,
  links: uniqueLinks.slice(0, 40)
});

} catch (error) {
return res.status(200).json({
success: false,
error: error.message
});
}
}
