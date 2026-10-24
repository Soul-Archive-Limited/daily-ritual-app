import type { D1Migration } from 'cloudflare:test';

declare global {
  namespace Cloudflare {
    interface Env {
      TEST_MIGRATIONS: D1Migration[];
      SESSION_SECRET: string;
    }
    interface GlobalProps {
      mainModule: typeof import('../src/index');
    }
  }
}
