const express = require('express');
const router = express.Router();
const mysql = require("mysql");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'dados'
});

router.post("/register", async (req, res) => {
    const { name, email, password, password_confirm } = req.body;

    // Execute a consulta ao banco de dados para verificar o email existente
    db.query('SELECT email FROM users WHERE email = ?', [email], async (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ message: 'Erro ao executar a consulta no banco de dados' });
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
                return res.status(500).json({ message: 'Erro ao executar a consulta no banco de dados' });
            }

            return res.render('register', {
                message: 'User registered!'
            });
        });
    });
});

router.post("/login", (req, res) => {
    const { email, password } = req.body;

    // Execute a consulta ao banco de dados para verificar o login
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ message: 'Erro ao executar a consulta no banco de dados' });
        }

        // Verifique se o usuário existe
        if (result.length === 0) {
            return res.status(401).json({ message: 'Invalid login' });
        }

        const user = result[0];

        // Verifique se a senha está correta
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ message: 'Invalid login' });
        }

        // Autenticação bem-sucedida, você pode gerar um token JWT aqui, se necessário
        const payload = {
            userId: user.id,
            email: user.email,
            role: 'user'
        };
        const token = jwt.sign(payload, process.env.KEY, {
            expiresIn: 300 // expires in 5min
        });

        return res.redirect('/getPayload').set('Authorization', `Bearer ${token}`);
    });
});

module.exports = router;
