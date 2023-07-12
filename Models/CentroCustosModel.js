const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config(); // Carrega as variáveis de ambiente do arquivo .env

const secretKey = process.env.SECRET_KEY;
const app = express();
const port = 3000;


// Rota para gerar um token JWT
app.get('/login', (req, res) => {
  // Dados do usuário
  const user = {
    id: 123,
    username: 'john_doe'
  };

  // Gerar o token JWT
  const token = jwt.sign(user, secretKey);

  res.json({
    token: token
  });
});

// Rota protegida que requer um token válido
app.get('/protected', authenticateToken, (req, res) => {
  res.json({
    message: 'Acesso permitido!'
  });
});

// Função para verificar se o token é válido
function authenticateToken(req, res, next) {
  const token = req.headers['authorization'];

  if (token == null) {
    return res.sendStatus(401); // Não autorizado
  }

  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      return res.sendStatus(403); // Proibido
    }

    req.user = user;
    next();
  });
}

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor iniciado na porta ${port}`);
});
