const { Sequelize } = require("sequelize");

module.exports = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    dialect: "postgres",
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    // Certificate verification is always on. If the provider's cert isn't in
    // Node's trust store (e.g. self-signed), set DB_CA_CERT (PEM) to pin it —
    // never disable rejectUnauthorized, that allows a MITM to read credentials
    // and query data in transit.
    dialectOptions:
      process.env.DB_SSL === "true"
        ? {
            ssl: {
              require: true,
              rejectUnauthorized: true,
              ca: process.env.DB_CA_CERT || undefined,
            },
          }
        : {},
  }
);
