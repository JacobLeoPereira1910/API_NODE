const express = require('express');
const path = require("path");
const dotenv = require('dotenv');
const exphbs = require('hbs');
const jwt = require("jsonwebtoken");
const mysql = require("mysql");
const bcrypt = require("bcryptjs");
const fetch = require('node-fetch');
const cookieParser = require('cookie-parser');


dotenv.config({ path: './.env' });

const app = express();
app.use(cookieParser());


// Configurações do Express

const publicDir = path.join(__dirname, './public');
app.use(express.json());
app.use(express.static(publicDir));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Configuração do banco de dados (MySQL)
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'dados'
});

db.connect((err) => {
    if (err) {
        console.log('Erro ao conectar ao banco de dados:', err);
    } else {
        console.log('Conexão bem-sucedida com o banco de dados');
    }
});

// Rota de acesso (login)

app.post("/acc", (req, res) => {
    const { user, password } = req.body;

    // Execute a consulta ao banco de dados para verificar o login
    db.query('SELECT * FROM users WHERE user = ? AND password = ?', [user, password], (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ message: 'Erro ao executar a consulta no banco de dados' });
        }

        res.json(result);
    });
});

// Rota '/aa' removida pois é idêntica à rota '/acc'

app.get('/', (req, res) => {
    const sql = 'SELECT * FROM users';

    db.query(sql, (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Erro ao executar a consulta no banco de dados' });
        }
      
        // Mapeia a matriz de objetos 'result' e cria uma nova matriz apenas com os valores do campo 'user'
        const users = result.map(item => item.user);

        // Retorna a nova matriz contendo apenas os valores do campo 'user'
        res.json(users);
    });
});

const router = express.Router();

router.get("/", (req, res) => {
    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({ message: "Token not provided" });
    }

    jwt.verify(token, process.env.KEY, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: "Invalid token" });
        }

        // O token é válido, você pode acessar o payload decodificado na variável 'decoded'
        // Exemplo de uso do payload
        const userId = decoded.userId;
        const userEmail = decoded.email;
        const userRole = decoded.role;

        // Realize as operações necessárias para a rota protegida aqui

        return res.status(200).json({ message: "Protected route accessed successfully" });
    });
});

router.get("/getPayload", (req, res) => {
    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({ message: "Token not provided" });
    }

    jwt.verify(token, process.env.KEY, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: "Invalid token" });
        }

        // O payload está contido na variável 'decoded'
        return res.status(200).json({ payload: decoded });
    });
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/auth/register", (req, res) => {
    const { name, email, password, password_confirm, user } = req.body;

    db.query('SELECT email FROM users WHERE email = ?', [email], async (error, result) => {
        if (error) {
            console.log(error);
        }

        if (result.length > 0) {
            return res.render('register', {
                message: 'Esse email já está em uso'
            });
        } else if (password !== password_confirm) {
            return res.render('register', {
                message: 'Senha incorreta'
            });
        }

        let hashedPassword = await bcrypt.hash(password, 8);

        console.log(hashedPassword);

        db.query('INSERT INTO users SET?', { name: name, email: email, password: hashedPassword, user: user }, (err, result) => {
            if (error) {
                console.log(error);
            } else {
                return res.render('register', {
                    message: 'Usuário registrado com sucesso!'
                });
            }
        });
    });
});

app.get('/data', (req, res, next) => {
  const sql = 'SELECT * FROM users'; // substitua "tabela" pelo nome da tabela que você deseja consultar
  
  db.query(sql, (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Erro ao executar a consulta no banco de dados' });
    }
    
    res.json(result);
  });
});

app.post('/access', (req, res) => {
    const { user, password } = req.body;

    // Execute a consulta ao banco de dados para verificar o login
    db.query('SELECT * FROM users WHERE user = ?', [user], async (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ message: 'Erro ao executar a consulta no banco de dados' });
        }

        // Verifique se o usuário existe
        if (result.length === 0) {
            return res.status(401).json({ message: 'Usuário inválido' });
        }

        const user = result[0];

        // Verifique se a senha está correta
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ message: 'Senha incorreta' });
        }

        const payload = {
            userId: user.id,
            email: user.email,
            role: 'user'
        };
        const token = jwt.sign(payload, process.env.KEY, {
            expiresIn: 300 // expires in 5min
        });
    
        // Salvar o token em um cookie
        res.cookie('access_token', token, {
            httpOnly: true,
            maxAge: 300000 // 5 minutos em milissegundos
        });
    
        // Retornar os dados do usuário no formato JSON
        return res.status(200).json({ user });        
    });
});


app.get('/', (req, res) => {
    // Recupere o token do cookie 'access_token'
    const token = req.cookies.access_token;

    // Use o token conforme necessário (por exemplo, envie-o com solicitações subsequentes para autenticar)
    console.log(token);
});

app.get('/page', (req, res) => {
    // Recupere o token do cookie 'access_token'
    const token = req.cookies.access_token;

    if (!token) {
        return res.status(401).json({ message: 'Token not provided' });
    }

    // Verificar e decodificar o token
    jwt.verify(token, process.env.KEY, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        // O payload decodificado está contido na variável 'decoded'
        // Exemplo de uso do payload
        const userId = decoded.userId;
        const userEmail = decoded.email;
        const userRole = decoded.role;

        console.log('Payload decodificado:', decoded);

        // Realize as operações necessárias para a rota protegida aqui

        return res.status(200).json({ message: 'Protected route accessed successfully' });
    });
});


const serverAddress = 'http://localhost:3000'; 

app.get('/pagi', async (req, res) => {
    try {
        const url = `${serverAddress}/access`; // Adicione o caminho correto após o serverAddress
        const response = await fetch(url);

        if (!response.ok) {
            return res.status(response.status).json({ message: `Erro ao requisitar a página. Status: ${response.status}` });
        }

        const pageContent = await response.text();
        return res.status(200).json({ content: pageContent });
    } catch (error) {
        console.error('Erro na requisição:', error);
        return res.status(500).json({ message: 'Erro interno na requisição' });
    }
});

app.use('/', router);

const port = 3000;
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
