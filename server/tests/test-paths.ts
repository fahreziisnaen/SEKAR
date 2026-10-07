import { tmpdir } from 'node:os';
import path from 'node:path';

/** Unggahan test ditulis ke folder sementara, bukan folder upload pengembangan. */
export const TEST_UPLOAD_DIR = path.join(tmpdir(), 'sekar-test-uploads');
