const Router = require("express");
const router = new Router();
const OpenAI = require("openai");
const checkRole = require("../middleware/checkRoleMiddleware");
const analyticsTools = require("../services/analyticsTools");

const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "getProductOrderStats",
      description: "Order count, units sold and revenue for products whose name matches a search term, within a date range",
      parameters: {
        type: "object",
        properties: {
          productName: { type: "string", description: "Full or partial product name to search for" },
          startDate: { type: "string", description: "YYYY-MM-DD" },
          endDate: { type: "string", description: "YYYY-MM-DD" },
        },
        required: ["productName", "startDate", "endDate"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getTopCustomers",
      description: "Ranks customers by quantity purchased, total spend, or order count within a date range",
      parameters: {
        type: "object",
        properties: {
          startDate: { type: "string", description: "YYYY-MM-DD" },
          endDate: { type: "string", description: "YYYY-MM-DD" },
          metric: { type: "string", enum: ["quantity", "revenue", "orderCount"] },
          limit: { type: "integer" },
        },
        required: ["startDate", "endDate", "metric"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getTopProducts",
      description: "Ranks products by units sold, revenue, or order count within a date range, optionally filtered by brand or type",
      parameters: {
        type: "object",
        properties: {
          startDate: { type: "string", description: "YYYY-MM-DD" },
          endDate: { type: "string", description: "YYYY-MM-DD" },
          metric: { type: "string", enum: ["quantity", "revenue", "orderCount"] },
          brandName: { type: "string" },
          typeName: { type: "string" },
          limit: { type: "integer" },
        },
        required: ["startDate", "endDate", "metric"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getRevenueSummary",
      description: "Total revenue, order count, unique buyers and average order value for an arbitrary date range",
      parameters: {
        type: "object",
        properties: {
          startDate: { type: "string", description: "YYYY-MM-DD" },
          endDate: { type: "string", description: "YYYY-MM-DD" },
        },
        required: ["startDate", "endDate"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getOrdersBreakdown",
      description: "Groups orders by a dimension (status, country, state, payment method, delivery method, or day) within a date range",
      parameters: {
        type: "object",
        properties: {
          startDate: { type: "string", description: "YYYY-MM-DD" },
          endDate: { type: "string", description: "YYYY-MM-DD" },
          groupBy: { type: "string", enum: ["status", "country", "state_province", "payment", "delivery_method", "day"] },
        },
        required: ["startDate", "endDate", "groupBy"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getCustomerOrderHistory",
      description: "Lists a specific customer's orders and purchased items, optionally within a date range",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string" },
          startDate: { type: "string", description: "YYYY-MM-DD" },
          endDate: { type: "string", description: "YYYY-MM-DD" },
          limit: { type: "integer" },
        },
        required: ["email"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getStockAlertDemand",
      description: "Lists out-of-stock products ranked by number of customers waiting for a restock alert",
      parameters: {
        type: "object",
        properties: { limit: { type: "integer" } },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getRatingsSummary",
      description: "Top or bottom rated products by average rating, with review counts",
      parameters: {
        type: "object",
        properties: {
          order: { type: "string", enum: ["highest", "lowest"] },
          minReviews: { type: "integer" },
          limit: { type: "integer" },
        },
        required: ["order"],
      },
    },
  },
];

const TOOL_IMPLEMENTATIONS = {
  getProductOrderStats: analyticsTools.getProductOrderStats,
  getTopCustomers: analyticsTools.getTopCustomers,
  getTopProducts: analyticsTools.getTopProducts,
  getRevenueSummary: analyticsTools.getRevenueSummary,
  getOrdersBreakdown: analyticsTools.getOrdersBreakdown,
  getCustomerOrderHistory: analyticsTools.getCustomerOrderHistory,
  getStockAlertDemand: analyticsTools.getStockAlertDemand,
  getRatingsSummary: analyticsTools.getRatingsSummary,
};

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
    const today = new Date().toISOString().slice(0, 10);

    const systemPrompt = `You are an AI business analyst for an electronics store admin panel.
Help the admin understand store performance, identify trends, and make data-driven decisions.
Be concise, specific, and actionable. Reference actual numbers when available.
Today's date is ${today}. When the admin asks about a relative period ("this month", "last week", "today"), compute the exact startDate/endDate (YYYY-MM-DD) yourself before calling a tool.
You have tools to query the live database for specific facts (product sales, top customers, order breakdowns, customer history, restock demand, ratings). Use them whenever the answer requires data more specific than the summary below — prefer calling a tool over guessing.
${stats ? buildStatsContext(stats) : ""}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-10),
      { role: "user", content: message },
    ];

    let reply = null;
    for (let round = 0; round < 4 && reply === null; round++) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        tools: TOOL_DEFINITIONS,
        tool_choice: "auto",
        max_tokens: 600,
      });

      const choice = response.choices[0].message;

      if (!choice.tool_calls?.length) {
        reply = choice.content;
        break;
      }

      messages.push(choice);

      for (const call of choice.tool_calls) {
        const impl = TOOL_IMPLEMENTATIONS[call.function.name];
        let result;
        try {
          const args = JSON.parse(call.function.arguments || "{}");
          result = impl ? await impl(args) : { error: "Unknown tool" };
        } catch (err) {
          result = { error: err.message };
        }
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
    }

    res.json({ reply: reply || "Sorry, I couldn't come up with an answer. Try rephrasing your question." });
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
