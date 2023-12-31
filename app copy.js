const express = require('express');
const path = require("path");
const dotenv = require('dotenv');
const exphbs = require('hbs');
const jwt = require("jsonwebtoken");
const mysql = require("mysql");
const bcrypt = require("bcryptjs");


dotenv.config({ path: './.env' });

const app = express();

// Configurações do Express

const publicDir = path.join(__dirname, './public');

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

app.post("/acc", (req, res,) => {
    const { user, password } = req.body;

    // Execute a consulta ao banco de dados para verificar o login
    db.query('SELECT * FROM users WHERE user = ? AND password = ?', [user, password], (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ message: 'Erro ao executar a consulta no banco de dados' });
        }

        res.json(result);


        // Verifique se o login foi bem-sucedido
        // if (result.length > 0) {
        //     // Autenticação bem-sucedida, você pode gerar um token JWT aqui, se necessário
        //     const id = result[0].id; // supondo que o ID do usuário está na coluna 'id' da tabela 'users'
        //     const payload = {
        //         email: email,
        //         role: 'user'
        //     };
        //     const token = jwt.sign(payload, process.env.KEY, {
        //         expiresIn: 300 // expires in 5min
        //     });
        //     // Redirecionar para a rota '/getPayload' com o token no cabeçalho Authorization
        //     res.setHeader('Authorization', `Bearer ${token}`);
        //     return res.redirect('/getPayload');
        // } else {
        //     // Login inválido
        //     return res.status(401).json({ message: 'Dados de acesso incorretos! '});

        // }
    });
});

app.post("/aa", (req, res) => {
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


app.get('/', (req, res, next) => {
    const sql = 'SELECT * FROM users'; // substitua "tabela" pelo nome da tabela que você deseja consultar
    
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
    const token = req.headers.authorization; // Assume que o token JWT é enviado no cabeçalho Authorization

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
    res.render("login")
})

app.get("/register", (req, res) => {
    res.render("register")
})

app.get("/access", (req, res) => {
    const { user, password } = req.body;

    // Execute a consulta ao banco de dados para verificar o login
    db.query('SELECT * FROM users WHERE user = ?', [user], async (err, result) => {

        result.json({ message: result });
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

app.post("/auth/register", (req, res) => {
    const { name, email, password, password_confirm, user } = req.body

    db.query('SELECT email FROM users WHERE email = ?', [email], async (error, result) => {
        if (error) {
            console.log(error)
        }

        if (result.length > 0) {
            return res.render('register', {
                message: 'Esse email já está em uso'
            })
        } else if (password !== password_confirm) {
            return res.render('register', {
                message: 'Senha incorreta'
            })
        }

        let hashedPassword = await bcrypt.hash(password, 8)

        console.log(hashedPassword)

        db.query('INSERT INTO users SET?', { name: name, email: email, password: hashedPassword, user: user }, (err, result) => {
            if (error) {
                console.log(error)
            } else {
                return res.render('register', {
                    message: 'Usuário registrado com sucesso!'
                })
            }
        })
    })
})

// Defina as suas outras rotas aqui

app.use('/', router);

app.listen(5000, () => {
    console.log("Server started on port 5000");
});
