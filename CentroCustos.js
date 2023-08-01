const http = require('http');
const express = require('express');
//require("dotenv-safe").config();
const app = express();


const bodyParser = require('body-parser');
app.use(bodyParser.json());

app.get('/', (req, res, next) => {
  res.json({ message: "Tudo ok por aqui!" });
})

app.get('/clientes', (req, res, next) => {
  console.log("Retornou todos clientes!");
  res.json([{ id: 1, nome: 'luiz' }]);
})


app.get('/data', (req, res, next) => {
  const sql = 'SELECT * FROM users'; // substitua "tabela" pelo nome da tabela que você deseja consultar
  
  db.query(sql, (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Erro ao executar a consulta no banco de dados' });
    }
    
    res.json(result);
  });
});

const server = http.createServer(app);
server.listen(3000);
console.log("Servidor escutando na porta 3000...")