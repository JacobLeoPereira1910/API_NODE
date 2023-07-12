const express = require('express');
const mysql = require("mysql");
const path = require("path");
const dotenv = require('dotenv');
const exphbs = require('hbs');
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

dotenv.config({ path: './.env' });

const app = express();

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'dados'
});

const publicDir = path.join(__dirname, './public');

app.use(express.static(publicDir));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

db.connect((error) => {
    if (error) {
        console.log(error);
    } else {
        console.log("MySQL connected!");
    }
});

app.get("/", (req, res) => {
    res.render("index");
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/data", (req, res) => {
    const { name, password } = req.body;

    // Execute a consulta ao banco de dados para verificar o login
    db.query('SELECT * FROM users WHERE name = ? AND password = ?', [name, password], (err, result) => {
        const sql = 'SELECT * FROM users'; // substitua "tabela" pelo nome da tabela que você deseja consultar

        db.query(sql, (err, result) => {
            if (err) {
                return res.status(500).json({ message: 'Erro ao executar a consulta no banco de dados' });
            }

            res.json(result);
        });
    });
});


app.post("/", (req, res) => {
    const { name, password } = req.body;

    // Execute a consulta ao banco de dados para verificar o login
    db.query('SELECT * FROM users WHERE name = ? AND password = ?', [name, password], (err, result) => {
        const sql = 'SELECT * FROM users'; // substitua "tabela" pelo nome da tabela que você deseja consultar

        db.query(sql, (err, result) => {
            if (err) {
                return res.status(500).json({ message: 'Erro ao executar a consulta no banco de dados' });
            }

            res.json(result);
        });
    });
});


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
            return res.status(200).json({ message: 'Login successful' });
        } else {
            // Login inválido
            return res.status(401).json({ message: 'Invalid login' });
        }
    });
});




app.post("/auth/register", (req, res) => {
    const { name, email, password, password_confirm } = req.body;

    db.query('SELECT email FROM users WHERE email = ?', [email], async (err, result) => {
        if (err) {
            console.log(err);
        }

        if (result.length > 0) {
            return res.render('register', {
                message: 'This email is already in use'
            });
        } else if (password !== password_confirm) {
            return res.render('register', {
                message: 'Password Didn\'t Match!'
            });
        }

        let hashedPassword = await bcrypt.hash(password, 8);

        console.log(hashedPassword);

        db.query('INSERT INTO users SET ?', { name: name, email: email, password: hashedPassword }, (err, result) => {
            if (err) {
                console.log(err);
            } else {
                return res.render('register', {
                    message: 'User registered!'
                });
            }
        });
    });
});

app.listen(5000, () => {
    console.log("Server started on port 5000");
});
