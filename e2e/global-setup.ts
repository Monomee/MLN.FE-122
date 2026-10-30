import { preview } from 'vite';

export default async function setup() {
  if (process.env.PLAYWRIGHT_BASE_URL) return;
  // Close the HTTP server directly; Windows sandboxes can block process-tree teardown.
  const server = await preview({
    configLoader: 'runner',
    preview: { host: '127.0.0.1', port: 5173, strictPort: true },
  });
  return async () => {
    await new Promise<void>((resolve, reject) => {
      server.httpServer.close(error => error ? reject(error) : resolve());
      if ('closeAllConnections' in server.httpServer) server.httpServer.closeAllConnections();
    });
  };
}
