export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Use GET for this test."
    });
  }

  const targets = [
    "https://lmis.nerdcportals.com.ng/sss_1/necurrdc/1.pdf",
    "https://lmis.nerdcportals.com.ng/sss_1/necurrdc/2.pdf",
    "https://lmis.nerdcportals.com.ng/sss_1/necurrdc/6.pdf",
    "https://lmis.nerdcportals.com.ng/sss_1/necurrdc/7.pdf",
    "https://lmis.nerdcportals.com.ng/sss_1/necurrdc/8.pdf",
    "https://lmis.nerdcportals.com.ng/sss_1/necurrdc/32.pdf"
  ];

  const results = [];

  for (const url of targets) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Range: "bytes=0-15",
          "User-Agent": "Mozilla/5.0"
        },
        redirect: "follow",
        signal: AbortSignal.timeout(12000)
      });

      const buffer = await response.arrayBuffer();
      const bytes = Array.from(new Uint8Array(buffer).slice(0, 8));

      results.push({
        url,
        status: response.status,
        contentType: response.headers.get("content-type"),
        contentLength: response.headers.get("content-length"),
        contentRange: response.headers.get("content-range"),
        bytesReceived: buffer.byteLength,
        firstBytes: bytes,
        looksLikePdf:
          bytes[0] === 37 &&
          bytes[1] === 80 &&
          bytes[2] === 68 &&
          bytes[3] === 70 &&
          bytes[4] === 45
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
