// Test environment setup — sets env vars before any module loads
process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5431/sigops_test";
process.env.REDIS_URL = "redis://localhost:6371";
process.env.JWT_SECRET = "test-secret-minimum-32-characters-long-for-hs256";
process.env.PORT = "4299";
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "error";
