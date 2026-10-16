export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Use GET for this test."
    });
  }

  try {
    const response = await fetch(
      "https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html"
    );

    const html = await response.text();

    return res.status(200).json({
      success: response.ok,
      status: response.status,
      contentType: response.headers.get("content-type"),
      pageTitleFound: html.toLowerCase().includes("<title"),
      responseLength: html.length,
      preview: html.slice(0, 200)
    });
  } catch (error) {
    console.error("NERDC retrieval test failed:", error);

    return res.status(502).json({
      success: false,
      error: "Could not retrieve the NERDC page.",
      details: error.message
    });
  }
}
