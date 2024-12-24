const { Pool } = require('pg');
const { createServer } = require('node:http');
const fs = require('fs');

const hostname = process.env.HOMEACCOUNTING_HOSTNAME;
const port = process.env.HOMEACCOUNTING_PORT;
const dbPassword = process.env.DATABASE_PASSWORD;

var connectionString =`postgresql://postgres:${dbPassword}@${hostname}:5432/homeaccounting`;
const pool = new Pool({
    connectionString,
})


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
    res.setHeader('Content-Type', 'text/javascript');
    res.end(kontenlisteJs.toString());
    return;
  }
  if (req.url === '/createKonto'){
    let body = '';
    req.on('data', (chunk) => {
        body += chunk;
    });
    pool.connect((err, client, release) => {
        if (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Datenbankverbindung fehlgeschlagen', detail: err.message }));
            return;
        }
            
        pool.query("CALL create_konto($1, $2)", [body,null], (err, pgRes) => {
            if (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end();
            } else {
                console.log('Konto erfolgreich erstellt!');
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, data: pgRes.rows[0] }));
            }    
            release();
        });
    });
    return;
  }
  if (req.url === '/konten'){
    var konten = [];
    pool.connect((err, client, release) => {
        if (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Datenbankverbindung fehlgeschlagen', detail: err.message }));
            return;
        }
        pool.query("select * from konto", (queryErr, pgRes) => {
            if (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end();
                return;
            }
            pgRes.rows.forEach(row=>{
                konten.push({id: row.id, name: row.name});
            });
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(konten));
        });
        release();
    });
    return;
  }
});

server.listen(port, hostname, () => {
  console.log(`Server listening on http://${hostname}:${port}`);
});
