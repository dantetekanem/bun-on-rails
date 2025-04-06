export default {
  development: {
    username: "postgres",
    password: "password",
    database: "bunrails_dev",
    host: "postgres.rpgmenace.orb.local",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    dialect: "postgres",
    logging: true,
  },
  test: {
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME
      ? `${process.env.DB_NAME}_test`
      : "bunrails_test",
    host: process.env.DB_HOST || "postgres.rpgmenace.orb.local",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    dialect: "postgres",
    logging: false,
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "5432", 10),
    dialect: "postgres",
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
}; 