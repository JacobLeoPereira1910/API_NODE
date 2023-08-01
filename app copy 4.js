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

router.post('/access', async (req, res) => {
    const { user, password } = req.body;

    const authenticationResult = await authenticateUser(user, password, db);

    if (authenticationResult.success) {
        res.cookie('access_token', authenticationResult.token, {
            httpOnly: true,
            secure: true, 
            sameSite: 'lax', 
            maxAge: 300000 // 5 minutos
        });


        return res.status(200).json({ user: { userId: payload.userId, email: payload.email, role: payload.role } });
    } else {
        return res.status(401).json({ message: authenticationResult.message });
    }
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

router.post('/ConsultaVMensalRefeicao', (req, res) => {
    const { ccusto, ano_mes_inicio, ano_mes_fim } = req.body;

    const ccustoList = ccusto.map(custo => `'${custo}'`).join(',');

    const data_inicio = new Date(`${ano_mes_inicio}-01`);
    const data_fim = new Date(`${ano_mes_fim}-01`);

    const data_ini = data_inicio.toISOString().substring(0, 10)
    const data_f = data_fim.toISOString().substring(0, 10)

    console.log(
        ccusto,
        data_inicio.toISOString().substring(0, 10),
        data_fim.toISOString().substring(0, 10)
    );


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
        `, [data_inicio, data_fim], (err, result) => {
            if (err) {
                console.error('Erro ao executar a consulta', err);
                return res.status(500).json({ error: 'Erro ao executar a consulta' });
            } else {

                result.fields.forEach((data, index) => {
                    console.log(`Meu indice`, data)
                    const item = {
                        "id_origem": data.id_origem,
                        "ano_mes": data.ano_mes,
                        "cd_ccusto": data.cd_ccusto,
                        "quantitativo": data.quantitativo
                    };
                    console.log(`item`, item);
                })

                // const response = result.rows.map(item => ({
                //     "id_origem": item.id_origem,
                //     "ano_mes": item.date_actual,
                //     "cd_ccusto": item.cd_ccusto,
                //     "quantitativo": item.total_refeicoes
                // }));
        
                // console.log(response);

            }
        });
    }
});

router.post('/ssssss', (req, res) => {
    const { ccusto, ano_mes_inicio, ano_mes_fim } = req.body;
    const data_inicio = new Date(`${ano_mes_inicio}-01`);
    const data_fim = new Date(`${ano_mes_fim}-01`);

    console.log(ccusto, data_inicio, data_fim);

    const ccustoList = ccusto.map(custo => `'${custo}'`).join(',');

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
        `, [data_inicio, data_fim], (err, result) => {
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

                return res.status(200).json({ result });
            }
        });
    }
});

router.post('/ConsultaVMensalRefeicao', (req, res) => {
    const { ccusto, ano_mes_inicio, ano_mes_fim } = req.body;
    const data_inicio = new Date(`${ano_mes_inicio}-01`);
    const data_fim = new Date(`${ano_mes_fim}-01`);

    console.log(ccusto, data_inicio, data_fim);

    const ccustoList = ccusto.map(custo => `'${custo}'`).join(',');

    const formatDate = (ano_mes) => {
        const year = ano_mes.slice(0, 4);
        const month = ano_mes.slice(4);
        const date = new Date(`${year}-${month}-01`);
        return date.toISOString().substring(0, 10);
    };

    // Converter as datas para o formato "YYYY-MM-DD"
    const startDate = formatDate(ano_mes_inicio);
    const endDate = formatDate(ano_mes_fim);

    let filter = null;
    if (ccusto.includes("000000002")) {
        filter = "bom_prato";
    }

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

            return res.status(200).json({ result: response });

        }
    });
});


router.get('/zi', (req, res) => {
    const token = req.cookies.access_token;

    if (!token) {
        return res.status(401).json({ message: 'Token não fornecido' });
    }

    jwt.verify(token, process.env.KEY, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Token inválido' });
        }

        const { userId, email, role } = decoded;

        console.log('Payload decodificado:', decoded);

        pool.query("SELECT id_origem, cd_ccusto, convert_from(convert_to(nm_ccusto, 'UTF8'), 'LATIN1') as custo, cd_uge, cd_municipio, tp_ccusto, latitude, longitude, status FROM vi_lista_ccusto", (err, result) => {
            if (err) {
                console.error('Erro ao executar a consulta', err);
            } else {
                return res.status(200).json({ result });
            }
        });

    });
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
