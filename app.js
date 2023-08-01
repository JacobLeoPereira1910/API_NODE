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
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: 5432, // porta padrão do PostgreSQL é 5432
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
    } else {
        console.log('Conexão bem-sucedida com o banco de dados PostgreSQL');
        // Execute suas consultas aqui, se necessário
        // Lembre-se de liberar o cliente após o uso
        release();
    }
});

db.connect((err) => {
    if (err) {
        console.log('Erro ao conectar ao banco de dados:', err);
    } else {
        console.log('Conexão bem-sucedida com o banco de dados');
    }
});

const router = express.Router();

app.use('/', router);



const authenticateUser = async (user, password, db) => {
    try {
        const queryResult = await new Promise((resolve, reject) => {
            db.query('SELECT * FROM users WHERE user = ?', [user], (err, result) => {
                if (err) reject(err);
                resolve(result);
            });
        });

        if (queryResult.length === 0) {
            return { success: false, message: 'Usuário inválido' };
        }

        const userData = queryResult[0];
        if (!userData.password) {
            return { success: false, message: 'Senha não encontrada para o usuário' };
        }

        const passwordMatch = await bcrypt.compare(password, userData.password);
        if (!passwordMatch) {
            return { success: false, message: 'Senha incorreta' };
        }

        const payload = {
            userId: userData.id,
            email: userData.email,
            role: 'user'
        };

        const token = jwt.sign(payload, process.env.KEY, {
            expiresIn: '5m' // expira em 5 minutos
        });

        return { success: true, token };
    } catch (error) {
        return { success: false, message: 'Erro ao autenticar o usuário' };
    }
};

const authenticate = async (req, res, next) => {
    const token = req.cookies.access_token;

    if (!token) {
        return res.redirect('/login'); // Redireciona para a página de login se o token não estiver presente
    }

    jwt.verify(token, process.env.KEY, (err, decoded) => {
        if (err) {
            return res.redirect('/login'); // Redireciona para a página de login se o token não for válido
        }

        // O token é válido, então podemos prosseguir para a próxima rota
        req.user = decoded;
        next();
    });
};

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


router.post('/accessos', async (req, res) => {
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
            secure: true, 
            sameSite: 'lax', 
            maxAge: 300000 
        });

        const authenticationResult = await authenticate(user, password, db);
    
        if (authenticationResult.success) {
            res.cookie('access_token', authenticationResult.token, {
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
                maxAge: 300000 // 5 minutos
            });
    
            // Redireciona para a página "home"
            return res.redirect('/home');
        } else {
            return res.status(401).json({ message: authenticationResult.message });
        }



        
        
        return res.status(200).json({ user: payload, token: token });

        

    });
});



router.get('/home', authenticate, (req, res) => {
    res.render('home'); // Renderiza a página "home" se o usuário estiver autenticado
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
            secure: true, 
            sameSite: 'lax', 
            maxAge: 300000 
        });

        // Redireciona para a página "home" após o login bem-sucedido
        return res.redirect('/home');
    });
});


router.post('/CentroCustosModel', (req, res) => {
    const { ccusto, uge } = req.body;

    if (uge) {
        pool.query(`SELECT id_origem, cd_ccusto, convert_from(convert_to(nm_ccusto, 'UTF8'), 'LATIN1') as custo, cd_uge, cd_municipio, tp_ccusto, latitude, longitude, status FROM vi_lista_ccusto WHERE cd_uge = '${uge}'`, (err, result) => {
            if (err) {
                console.error('Erro ao executar a consulta', err);
                return res.status(500).json({ error: 'Erro ao executar a consulta' });
            } else {
                return res.status(200).json({ result: result.rows });
            }
        });
    } else if (ccusto) {
        // Converter a lista de ccusto para uma lista de valores de texto
        const ccustoList = ccusto.map(custo => `'${custo}'`).join(',');

        pool.query(`SELECT id_origem, cd_ccusto, convert_from(convert_to(nm_ccusto, 'UTF8'), 'LATIN1') as custo, cd_uge, cd_municipio, tp_ccusto, latitude, longitude, status FROM vi_lista_ccusto WHERE cd_ccusto IN (${ccustoList})`, (err, result) => {
            if (err) {
                console.error('Erro ao executar a consulta', err);
                return res.status(500).json({ error: 'Erro ao executar a consulta' });
            } else {
                return res.status(200).json({ result: result.rows });
            }
        });
    } else {
        pool.query(`SELECT id_origem, cd_ccusto, convert_from(convert_to(nm_ccusto, 'UTF8'), 'LATIN1') as custo, cd_uge, cd_municipio, tp_ccusto, latitude, longitude, status FROM vi_lista_ccusto`, (err, result) => {
            if (err) {
                console.error('Erro ao executar a consulta', err);
                return res.status(500).json({ error: 'Erro ao executar a consulta' });
            } else {
                return res.status(200).json({ result: result.rows });
            }
        });
    }
});

router.post('/ConsultaVMensalRefeicaoServida', (req, res) => {
    const { ccusto, ano_mes_inicio, ano_mes_fim } = req.body;

    const ccustoList = ccusto.map(custo => `'${custo}'`).join(',');

    // Formatar as datas no formato correto (YYYY-MM-DD)
    const startDate = new Date(ano_mes_inicio.slice(0, 4), parseInt(ano_mes_inicio.slice(4)) - 1, 1).toISOString().substring(0, 10);
    const endDate = new Date(ano_mes_fim.slice(0, 4), parseInt(ano_mes_fim.slice(4)) - 1, 1).toISOString().substring(0, 10);

    if (ccusto) {
        pool.query(`
            SELECT 
                id_origem,
                cd_ccusto,
                date_actual,
                codigo_unidade,
                qtd_cafe,
                qtd_almoco,
                qtd_jantar,
                SUM(COALESCE(a.qtd_cafe, 0) + COALESCE(a.qtd_almoco, 0) + COALESCE(a.qtd_jantar, 0)) AS total_refeicoes
            FROM vi_fipe_refeicoes AS a
            WHERE date_actual >= $1 AND date_actual <= $2 AND cd_ccusto IN (${ccustoList})
            GROUP BY id_origem, cd_ccusto, date_actual, codigo_unidade, qtd_cafe, qtd_almoco, qtd_jantar
        `, [startDate, endDate], (err, result) => {
            if (err) {
                console.error('Erro ao executar a consulta', err);
                return res.status(500).json({ error: 'Erro ao executar a consulta' });
            } else {
                const response = result.rows.map(item => ({
                    "id_origem": item.id_origem,
                    "ano_mes": item.date_actual,
                    "cd_ccusto": item.cd_ccusto,
                    "quantitativo": item.total_refeicoes
                }));

                return res.status(200).json({ response });
            }
        });
    }
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
