require("dotenv-safe").config();
const jwt = require('jsonwebtoken');
const express = require('express');
const mysql = require("mysql")
const dotenv = require('dotenv')
const app = express();
dotenv.config({ path: './.env'})

// const db = mysql.createConnection({
//   host: 'localhost', // ou o endereço do servidor de banco de dados
//   user: 'root', // nome de usuário do banco de dados
//   password: '', // senha do banco de dados
//   database: 'dados' // nome do banco de dados
// });


app.get('/data', (req, res, next) => {
  const sql = 'SELECT * FROM users'; // substitua "tabela" pelo nome da tabela que você deseja consultar
  
  db.query(sql, (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Erro ao executar a consulta no banco de dados' });
    }
    
    res.json(result);
  });
});



//authentication
app.post('/login', (req, res, next) => {
  //esse teste abaixo deve ser feito no seu banco de dados
  const sql = 'SELECT * FROM users'; // substitua "tabela" pelo nome da tabela que você deseja consultar
  
  db.query(sql, (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Erro ao executar a consulta no banco de dados' });
    }
    
    res.json(result);
  });
  
})




