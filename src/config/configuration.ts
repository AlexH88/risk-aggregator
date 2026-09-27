export default () => ({
  port: parseInt(String(process.env.PORT), 10) || 3000,
  database: { url: process.env.DATABASE_URL },
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(String(process.env.REDIS_PORT), 10),
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || '').split(','),
    clientId: process.env.KAFKA_CLIENT_ID,
  },
  graylog: {
    host: process.env.GRAYLOG_HOST,
    port: parseInt(String(process.env.GRAYLOG_PORT), 10),
  },
});