const { Op } = require("sequelize");
const sequelize = require("../db");
const { Order } = require("../models/models");

function resolveDateRange(startDate, endDate) {
  const start = startDate ? new Date(startDate) : new Date(0);
  start.setHours(0, 0, 0, 0);
  const end = endDate ? new Date(endDate) : new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function clampLimit(limit, def, max) {
  const n = parseInt(limit, 10);
  if (!Number.isFinite(n) || n <= 0) return def;
  return Math.min(n, max);
}

const METRIC_COLUMNS = { quantity: "quantity", revenue: "revenue", orderCount: "orderCount" };
function metricColumn(metric) {
  const col = METRIC_COLUMNS[metric];
  if (!col) throw new Error(`Invalid metric: ${metric}`);
  return col;
}

async function getProductOrderStats({ productName, startDate, endDate }) {
  const { start, end } = resolveDateRange(startDate, endDate);
  const matches = await sequelize.query(
    `SELECT d.id, d.name,
            COUNT(DISTINCT o.id)::int AS "orderCount",
            COALESCE(SUM(od.quantity), 0)::int AS "unitsSold",
            COALESCE(SUM(od.quantity * d.price), 0)::float AS revenue
     FROM devices d
     JOIN order_devices od ON od."deviceId" = d.id
     JOIN orders o ON o.id = od."orderId"
                   AND o.status != 'cancelled'
                   AND o."createdAt" BETWEEN :start AND :end
     WHERE d.name ILIKE :productName
     GROUP BY d.id, d.name
     ORDER BY "unitsSold" DESC
     LIMIT 20`,
    { replacements: { start, end, productName: `%${productName}%` }, type: sequelize.QueryTypes.SELECT }
  );
  return { matches };
}

async function getTopCustomers({ startDate, endDate, metric, limit }) {
  const { start, end } = resolveDateRange(startDate, endDate);
  const col = metricColumn(metric);
  const limitNum = clampLimit(limit, 5, 20);

  const rows = await sequelize.query(
    `SELECT o.email, o.first_name, o.last_name,
            COUNT(DISTINCT o.id)::int AS "orderCount",
            COALESCE(SUM(od.quantity), 0)::int AS quantity,
            COALESCE(SUM(od.quantity * d.price), 0)::float AS revenue
     FROM orders o
     JOIN order_devices od ON od."orderId" = o.id
     JOIN devices d ON d.id = od."deviceId"
     WHERE o.status != 'cancelled'
       AND o."createdAt" BETWEEN :start AND :end
     GROUP BY o.email, o.first_name, o.last_name
     ORDER BY "${col}" DESC
     LIMIT :limit`,
    { replacements: { start, end, limit: limitNum }, type: sequelize.QueryTypes.SELECT }
  );
  return { rows };
}

async function getTopProducts({ startDate, endDate, metric, brandName, typeName, limit }) {
  const { start, end } = resolveDateRange(startDate, endDate);
  const col = metricColumn(metric);
  const limitNum = clampLimit(limit, 5, 20);

  const conditions = [];
  const replacements = { start, end, limit: limitNum };
  if (brandName) {
    conditions.push(`b.name ILIKE :brandName`);
    replacements.brandName = `%${brandName}%`;
  }
  if (typeName) {
    conditions.push(`t.name ILIKE :typeName`);
    replacements.typeName = `%${typeName}%`;
  }
  const whereExtra = conditions.length ? `AND ${conditions.join(" AND ")}` : "";

  const rows = await sequelize.query(
    `SELECT d.id, d.name, b.name AS brand, t.name AS type,
            COUNT(DISTINCT o.id)::int AS "orderCount",
            COALESCE(SUM(od.quantity), 0)::int AS quantity,
            COALESCE(SUM(od.quantity * d.price), 0)::float AS revenue
     FROM devices d
     LEFT JOIN brands b ON b.id = d."brandId"
     LEFT JOIN types t ON t.id = d."typeId"
     LEFT JOIN order_devices od ON od."deviceId" = d.id
     LEFT JOIN orders o ON o.id = od."orderId"
                        AND o.status != 'cancelled'
                        AND o."createdAt" BETWEEN :start AND :end
     WHERE 1=1 ${whereExtra}
     GROUP BY d.id, d.name, b.name, t.name
     HAVING COALESCE(SUM(od.quantity), 0) > 0
     ORDER BY "${col}" DESC
     LIMIT :limit`,
    { replacements, type: sequelize.QueryTypes.SELECT }
  );
  return { rows };
}

async function getRevenueSummary({ startDate, endDate }) {
  const { start, end } = resolveDateRange(startDate, endDate);
  const range = { [Op.between]: [start, end] };

  const [totalOrders, totalRevenue, uniqueBuyers] = await Promise.all([
    Order.count({ where: { status: { [Op.ne]: "cancelled" }, createdAt: range } }),
    Order.sum("total", { where: { status: { [Op.ne]: "cancelled" }, total: { [Op.not]: null }, createdAt: range } }),
    Order.count({ distinct: true, col: "userId", where: { status: { [Op.ne]: "cancelled" }, createdAt: range } }),
  ]);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    totalOrders,
    totalRevenue: totalRevenue || 0,
    uniqueBuyers,
    avgOrderValue: totalOrders > 0 ? (totalRevenue || 0) / totalOrders : 0,
  };
}

const GROUP_BY_COLUMNS = {
  status: "status",
  country: "country",
  state_province: "state_province",
  payment: "payment",
  delivery_method: "delivery_method",
};

async function getOrdersBreakdown({ startDate, endDate, groupBy }) {
  const { start, end } = resolveDateRange(startDate, endDate);

  if (groupBy === "day") {
    const rows = await sequelize.query(
      `SELECT DATE("createdAt") AS key,
              COUNT(id)::int AS count,
              COALESCE(SUM(total), 0)::float AS revenue
       FROM orders
       WHERE "createdAt" BETWEEN :start AND :end
         AND status != 'cancelled'
       GROUP BY DATE("createdAt")
       ORDER BY DATE("createdAt") ASC`,
      { replacements: { start, end }, type: sequelize.QueryTypes.SELECT }
    );
    return { rows };
  }

  const column = GROUP_BY_COLUMNS[groupBy];
  if (!column) throw new Error(`Invalid groupBy: ${groupBy}`);

  const excludeCancelled = groupBy !== "status" ? `AND status != 'cancelled'` : "";

  const rows = await sequelize.query(
    `SELECT "${column}" AS key,
            COUNT(id)::int AS count,
            COALESCE(SUM(total), 0)::float AS revenue
     FROM orders
     WHERE "createdAt" BETWEEN :start AND :end
       ${excludeCancelled}
     GROUP BY "${column}"
     ORDER BY count DESC
     LIMIT 20`,
    { replacements: { start, end }, type: sequelize.QueryTypes.SELECT }
  );
  return { rows };
}

async function getCustomerOrderHistory({ email, startDate, endDate, limit }) {
  const limitNum = clampLimit(limit, 10, 30);
  const conditions = [`o.email ILIKE :email`];
  const replacements = { email, limit: limitNum };

  if (startDate || endDate) {
    const { start, end } = resolveDateRange(startDate, endDate);
    conditions.push(`o."createdAt" BETWEEN :start AND :end`);
    replacements.start = start;
    replacements.end = end;
  }

  const orders = await sequelize.query(
    `SELECT o.id, o.order_number, o."createdAt", o.status, o.total,
            json_agg(json_build_object('name', d.name, 'quantity', od.quantity, 'price', d.price)) AS items
     FROM orders o
     JOIN order_devices od ON od."orderId" = o.id
     JOIN devices d ON d.id = od."deviceId"
     WHERE ${conditions.join(" AND ")}
     GROUP BY o.id, o.order_number, o."createdAt", o.status, o.total
     ORDER BY o."createdAt" DESC
     LIMIT :limit`,
    { replacements, type: sequelize.QueryTypes.SELECT }
  );
  return { orders };
}

async function getStockAlertDemand({ limit }) {
  const limitNum = clampLimit(limit, 10, 30);
  const rows = await sequelize.query(
    `SELECT d.id, d.name, d.price, COUNT(sa.id)::int AS "waitingCount"
     FROM stock_alerts sa
     JOIN devices d ON d.id = sa."deviceId"
     WHERE d."inStock" = false
     GROUP BY d.id, d.name, d.price
     ORDER BY "waitingCount" DESC
     LIMIT :limit`,
    { replacements: { limit: limitNum }, type: sequelize.QueryTypes.SELECT }
  );
  return { rows };
}

async function getRatingsSummary({ order, minReviews, limit }) {
  const limitNum = clampLimit(limit, 5, 20);
  const minReviewsNum = Number(minReviews) > 0 ? Number(minReviews) : 3;
  const direction = order === "lowest" ? "ASC" : "DESC";

  const rows = await sequelize.query(
    `SELECT d.id, d.name,
            ROUND(AVG(r.rating)::numeric, 2)::float AS "avgRating",
            COUNT(r.id)::int AS "reviewCount"
     FROM devices d
     JOIN ratings r ON r."deviceId" = d.id
     GROUP BY d.id, d.name
     HAVING COUNT(r.id) >= :minReviews
     ORDER BY "avgRating" ${direction}
     LIMIT :limit`,
    { replacements: { minReviews: minReviewsNum, limit: limitNum }, type: sequelize.QueryTypes.SELECT }
  );
  return { rows };
}

module.exports = {
  getProductOrderStats,
  getTopCustomers,
  getTopProducts,
  getRevenueSummary,
  getOrdersBreakdown,
  getCustomerOrderHistory,
  getStockAlertDemand,
  getRatingsSummary,
};
