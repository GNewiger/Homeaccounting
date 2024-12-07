const { createServer } = require('node:http');

const hostname = process.env.HOMEACCOUNTING_HOSTNAME;
const port = process.env.HOMEACCOUNTING_PORT;

const server = createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello World');
});

server.listen(port, hostname, () => {
  console.log(`Server listening on http://${hostname}:${port}`);
});
