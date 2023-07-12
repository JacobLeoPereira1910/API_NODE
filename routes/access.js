const jwt = require("jsonwebtoken");

app.post("/access", (req, res) => {
  const { email, password } = req.body;

  // Execute a consulta ao banco de dados para verificar o login
  db.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, result) => {
      if (err) {
          console.log(err);
          return res.status(500).json({ message: 'Erro ao executar a consulta no banco de dados' });
      }

      // Verifique se o login foi bem-sucedido
      if (result.length > 0) {
          // Autenticação bem-sucedida, você pode gerar um token JWT aqui, se necessário
          const id = result[0].id; // supondo que o ID do usuário está na coluna 'id' da tabela 'users'
          const payload = {
              userId: id,
              email: email,
              role: 'user'
          };
          const token = jwt.sign(payload, process.env.KEY, {
              expiresIn: 300 // expires in 5min
          });
          // Redirecionar para a rota '/getPayload' com o token no cabeçalho Authorization
          res.setHeader('Authorization', `Bearer ${token}`);
          return res.redirect('/getPayload');
      } else {
          // Login inválido
          return res.status(401).json({ message: 'Invalid login' });
      }
  });
});
