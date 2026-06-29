const Router = require("express");
const router = new Router();
const OpenAI = require("openai");
const checkRole = require("../middleware/checkRoleMiddleware");

router.post("/search", async (req, res) => {
  try {
    const { message, types = [], brands = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const typesList = types.map((t) => `${t.id}: ${t.name}`).join(", ");
    const brandsList = brands.map((b) => `${b.id}: ${b.name}`).join(", ");

    const systemPrompt = `You are a shopping assistant for an electronics store.
The user will describe what product they are looking for.
Your job is to extract search filters from their description and return a JSON object.

Available product types: ${typesList || "none"}
Available brands: ${brandsList || "none"}

Return ONLY a JSON object with any of these fields that are relevant:
- "search": string - keywords for text search in product name/specs
- "minPrice": number - minimum price in USD
- "maxPrice": number - maximum price in USD
- "typeIds": array of numbers - IDs from the available types list that match
- "brandIds": array of numbers - IDs from the available brands list that match
- "minRating": number (1-5) - minimum rating
- "inStockOnly": boolean - only show in-stock items
- "onSaleOnly": boolean - only show items on sale
- "summary": string - a short friendly sentence explaining what you're searching for (in English)

Only include fields that the user actually mentioned or implied. Do not include empty arrays.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      response_format: { type: "json_object" },
      max_tokens: 300,
    });

    const filters = JSON.parse(response.choices[0].message.content);
    res.json(filters);
  } catch (err) {
    console.error("AI search error:", err.message);
    res.status(500).json({ error: "AI search failed" });
  }
});

router.post("/admin-chat", checkRole("ADMIN"), async (req, res) => {
  try {
    const { message, history = [], stats } = req.body;
    if (!message?.trim())
      return res.status(400).json({ error: "Message is required" });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = `You are an AI business analyst for an electronics store admin panel.
Help the admin understand store performance, identify trends, and make data-driven decisions.
Be concise, specific, and actionable. Reference actual numbers when available.
${stats ? buildStatsContext(stats) : ""}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...history.slice(-10),
        { role: "user", content: message },
      ],
      max_tokens: 600,
    });

    res.json({ reply: response.choices[0].message.content });
  } catch (err) {
    console.error("Admin AI chat error:", err.message);
    res.status(500).json({ error: "AI chat failed" });
  }
});

function buildStatsContext(stats) {
  const lines = ["Current dashboard data (last 30 days):"];
  const s = stats.summary || {};
  if (s.totalRevenue != null)
    lines.push(`- Revenue: $${Number(s.totalRevenue).toFixed(2)}`);
  if (s.totalOrders != null) lines.push(`- Orders: ${s.totalOrders}`);
  if (s.uniqueBuyers != null) lines.push(`- Unique buyers: ${s.uniqueBuyers}`);
  if (s.totalUsers != null) lines.push(`- Total users: ${s.totalUsers}`);
  if (s.avgOrderValue != null)
    lines.push(`- Avg order value: $${Number(s.avgOrderValue).toFixed(2)}`);
  if (stats.ordersByStatus?.length)
    lines.push(
      "- Order statuses: " +
        stats.ordersByStatus.map((x) => `${x.status}: ${x.count}`).join(", "),
    );
  if (stats.salesByType?.length)
    lines.push(
      "- Top categories: " +
        stats.salesByType
          .slice(0, 5)
          .map((x) => `${x.name} ($${Number(x.revenue).toFixed(0)})`)
          .join(", "),
    );
  if (stats.salesByBrand?.length)
    lines.push(
      "- Top brands: " +
        stats.salesByBrand
          .slice(0, 5)
          .map((x) => `${x.name} ($${Number(x.revenue).toFixed(0)})`)
          .join(", "),
    );
  if (stats.topProducts?.length)
    lines.push(
      "- Top products: " +
        stats.topProducts
          .slice(0, 5)
          .map((x) => `${x.name.split(",")[0]} (${x.totalQty} units)`)
          .join(", "),
    );
  if (stats.topCountries?.length)
    lines.push(
      "- Top countries: " +
        stats.topCountries
          .slice(0, 5)
          .map((x) => `${x.country}: ${x.count}`)
          .join(", "),
    );
  return lines.join("\n");
}

module.exports = router;
