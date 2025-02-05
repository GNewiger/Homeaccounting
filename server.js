const { Pool } = require('pg');
const { createServer } = require('node:http');
const fs = require('fs');

const hostname = process.env.HOMEACCOUNTING_HOSTNAME;
const port = process.env.HOMEACCOUNTING_PORT;
const dbPassword = process.env.DATABASE_PASSWORD;
const allowTests = process.env.ALLOW_TESTS;

var connectionString =`postgresql://postgres:${dbPassword}@${hostname}:5432/homeaccounting`;
const pool = new Pool({
    connectionString,
})


const clientHtml = fs.readFileSync('./res/client.html');
const clientJs = fs.readFileSync('./res/client.js');
const clientCss = fs.readFileSync('./res/client.css');
const unitTestSql = fs.readFileSync('./sql-scripts/unit_test.sql');

const server = createServer((req, res) => {
  if (req.url === '/'){
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.end(clientHtml.toString());
    return;
  }
  if (req.url === '/client.js'){
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/javascript');
    res.end(clientJs.toString());
    return;
  }
  if (req.url === '/client.css'){
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/css');
    res.end(clientCss.toString());
    return;
  }
  if (req.url === '/create-konto'){
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
            
        pool.query("CALL create_konto($1, $2);", [body, null], (err, pgRes) => {
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
        const retrieveLatestSaldosQuery = `with latest as
			(
				select max(point_in_time) as point_in_time, konto from saldo group by konto
			),
            latest_saldos as 
			(
				select konto as id, soll_in_cents, haben_in_cents from saldo join latest using (konto, point_in_time)
			)
            select k.id, k.name, s.haben_in_cents, s.soll_in_cents from konto k join latest_saldos s using (id);`;
        pool.query(retrieveLatestSaldosQuery, (queryErr, pgRes) => {
            if (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Fehler in der Datenbank', detail: err.message }));
                release();
                return;
            }
            pgRes.rows.forEach(row=>{
                konten.push({id: row.id, name: row.name, soll_in_cents: row.soll_in_cents, haben_in_cents: row.haben_in_cents});
            });
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(konten));
        });
        release();
        return;
    });
  }
  if (req.url === '/unit-test'){
    if(!(allowTests === 'true')){
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end();
        return;
    }
    pool.connect((err, client, release) => {
        if (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Fehler in der Datenbank', detail: err.message }));
            return;
        }
        pool.query(unitTestSql.toString(), (queryErr, pgRes) => {
            if (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Datenbankverbindung fehlgeschlagen', detail: err.message }));
                release();
                return;
            }
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(pgRes.rows));
        });
        release();
        return;
    });
  }
  
  if (req.url === '/buchen'){
    let bodyChunks = [];
    req.on('data', (chunk) => {
        bodyChunks.push(chunk);
    });
    req.on('end', () => {
        const body = JSON.parse(Buffer.concat(bodyChunks));
        pool.connect((err, client, release) => {
        if (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Fehler in der Datenbank', detail: err.message }));
            return;
        }
        if (!body.target1.id){
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end('Es muss mindestens ein Zielkonto angegeben sein. Sie müssen bei Zielkonto 1 beginnen.');
            return;
        }
        if (!body.target2.id){
            //ignore target2 and target3
            pool.query(`CALL buchen($1::smallint, $2, current_timestamp::timestamp, $3::varchar,
	                row($4, $5, $6)::target_konto_split);
	    `, [body.source.id, body.sourceKontoHaben, body.source.description,
            body.target1.id, body.target1.amount, body.target1.description], (err, pgRes) => {
                if (err) {
                    res.statusCode = 400;
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
            return;
        }
        if (!body.target3.id){
            //ignore target3
            pool.query(`CALL buchen($1::smallint, $2, current_timestamp::timestamp, $3::varchar,
	                row($4, $5, $6)::target_konto_split,
	                row($7, $8, $9)::target_konto_split);
	    `, [body.source.id, body.sourceKontoHaben, body.source.description,
            body.target1.id, body.target1.amount, body.target1.description,
            body.target2.id, body.target2.amount, body.target2.description,
            body.target3.id, body.target3.amount, body.target3.description], (err, pgRes) => {
                if (err) {
                    res.statusCode = 400;
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
            return;
        }
        
        pool.query(`CALL buchen($1::smallint, $2, current_timestamp::timestamp, $3::varchar,
                row($4, $5, $6)::target_konto_split,
                row($7, $8, $9)::target_konto_split,
                row($10, $11, $12)::target_konto_split);
    `, [body.source.id, body.sourceKontoHaben, body.source.description,
        body.target1.id, body.target1.amount, body.target1.description,
        body.target2.id, body.target2.amount, body.target2.description,
        body.target3.id, body.target3.amount, body.target3.description], (err, pgRes) => {
            if (err) {
                res.statusCode = 400;
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
    });
  }
});

server.listen(port, hostname, () => {
  console.log(`Server listening on http://${hostname}:${port}`);
});
