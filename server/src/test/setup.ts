process.env.NODE_ENV = "test";
process.env.PORT = "4299";
process.env.JWT_SECRET = "test-secret-key-at-least-32-characters-long-abc";
process.env.DATABASE_URL = "postgres://localhost:5432/sigops_test";
process.env.REDIS_URL = "redis://localhost:6379";
process.env.LOG_LEVEL = "fatal";
