const { createServer } = require('node:http');
const fs = require('fs');

const hostname = process.env.HOMEACCOUNTING_HOSTNAME;
const port = process.env.HOMEACCOUNTING_PORT;

const kontenlisteHtml = fs.readFileSync('./res/kontenliste.html');
const kontenlisteJs = fs.readFileSync('./res/kontenliste.js');

const server = createServer((req, res) => {
  if (req.url === '/'){
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.end(kontenlisteHtml.toString());
    return;
  }
  if (req.url === '/kontenliste.js'){
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/htmlkl');
    res.end(kontenlisteJs.toString());
    return;
  }
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain');
  res.end('');
});

server.listen(port, hostname, () => {
  console.log(`Server listening on http://${hostname}:${port}`);
});
