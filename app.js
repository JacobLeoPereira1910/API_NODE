const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const exphbs = require('hbs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql');
const bcrypt = require('bcryptjs');
const fetch = require('node-fetch');
const cookieParser = require('cookie-parser');
const publicDir = path.join(__dirname, './public');

dotenv.config({ path: './.env' });

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(publicDir));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

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

const router = express.Router();

// Defina as rotas aqui

app.use('/', router);

router.get("/login", (req, res) => {
    res.render("login");
});

router.get("/register", (req, res) => {
    res.render("register");
});

router.get('/', (req, res) => {
    const sql = 'SELECT * FROM users';

    db.query(sql, (err, result) => {
        if (err) {
            console.log('Erro ao executar a consulta no banco de dados:', err);
            return res.status(500).json({ message: 'Erro ao executar a consulta no banco de dados' });
        }

        const users = result.map(item => item.user);
        res.json(users);
    });
});

router.post("/auth/register", async (req, res) => {
    const { name, email, password, password_confirm, user } = req.body;

    try {
        const result = await db.query('SELECT email FROM users WHERE email = ?', [email]);
        if (result.length > 0) {
            return res.render('register', {
                message: 'Esse email já está em uso'
            });
        } else if (password !== password_confirm) {
            return res.render('register', {
                message: 'Senha incorreta'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 8);
        await db.query('INSERT INTO users SET?', { name, email, password: hashedPassword, user });

        return res.render('register', {
            message: 'Usuário registrado com sucesso!'
        });
    } catch (error) {
        console.log('Erro ao registrar o usuário:', error);
        return res.status(500).json({ message: 'Erro ao registrar o usuário' });
    }
});


router.post('/access', async (req, res) => {
    const { user, password } = req.body;


    db.query('SELECT * FROM users WHERE user = ?', [user], async (err, result) => {
        if (result.length === 0) {
            return res.status(401).json({ message: 'Usuário inválido' });
        }

        const userData = result[0];
        if (!userData.password) {
            return res.status(401).json({ message: 'Senha não encontrada para o usuário' });
        }

        const passwordMatch = await bcrypt.compare(password, userData.password);
        if (!passwordMatch) {
            return res.status(401).json({ message: 'Senha incorreta' });
        }

        const payload = {
            userId: userData.id,
            email: userData.email,
            role: 'user'
        };

        const token = jwt.sign(payload, process.env.KEY, {
            expiresIn: '5m' // expira em 5 minutos
        });

        res.cookie('access_token', token, {
            httpOnly: true,
            secure: true, // Defina 'secure' como true para conexões HTTPS
            sameSite: 'lax', // Ajuste o atributo sameSite de acordo com seu caso de uso
            maxAge: 300000 // 5 minutos em milissegundos
        });

        // Send only the necessary data in the response, not the entire 'result' or 'userData' objects
        return res.status(200).json({ user: payload });

    });
});

router.get('/page', (req, res) => {
    const token = req.cookies.access_token;

    if (!token) {
        return res.status(401).json({ message: 'Token não fornecido' });
    }

    jwt.verify(token, process.env.KEY, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Token inválido' });
        }

        const { userId, email, role } = decoded;

        // Realize as operações necessárias para a rota protegida aqui

        console.log('Payload decodificado:', decoded);
        return res.status(200).json({ message: 'Rota protegida acessada com sucesso' });
    });
});

const port = 3000;
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
