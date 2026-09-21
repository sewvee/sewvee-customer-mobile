const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://postgres:postgres@localhost:5432/sewvee' });
(async () => {
  await client.connect();
  const res = await client.query("SELECT * FROM customers WHERE mobile = '9999999999'");
  console.log('Dummy customers:', res.rows.length);
  const res2 = await client.query("SELECT * FROM customers WHERE mobile = '7777777777'");
  console.log('Fresh customers (7777):', res2.rows.length);
  await client.end();
})();
