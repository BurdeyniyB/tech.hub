const { Sequelize } = require("sequelize");

module.exports = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    dialect: "postgres",
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    // Render's managed Postgres presents a self-signed cert chain (no public CA
    // bundle is published) — rejectUnauthorized: true fails with
    // SELF_SIGNED_CERT_IN_CHAIN unless the exact server cert is pinned via
    // DB_CA_CERT (PEM). Set DB_CA_CERT once deployed to fully verify the
    // connection instead of falling back to unverified TLS.
    dialectOptions:
      process.env.DB_SSL === "true"
        ? {
            ssl: process.env.DB_CA_CERT
              ? { require: true, rejectUnauthorized: true, ca: process.env.DB_CA_CERT }
              : { require: true, rejectUnauthorized: false },
          }
        : {},
  }
);
