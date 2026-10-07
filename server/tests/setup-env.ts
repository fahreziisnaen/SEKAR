import { resolveTestDatabaseUrl } from './test-database-url.js';
import { TEST_UPLOAD_DIR } from './test-paths.js';

process.env.DATABASE_URL = resolveTestDatabaseUrl();
process.env.NODE_ENV = 'test';
process.env.COOKIE_SECURE = 'false';
process.env.UPLOAD_DIR = TEST_UPLOAD_DIR;
