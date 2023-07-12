const { Pool } = require('pg');

// Função para obter o endereço IP do servidor
function getServerAddress() {
  return process.env.SERVER_ADDR || '127.0.0.1'; // Endereço padrão é localhost
}

// Configuração da conexão com o banco de dados
const ip = getServerAddress();
let acesso;

if (ip === '172.32.101.22') {
  acesso = '172.32.101.24'; // Produção - SEDS
} else if (ip === '172.32.100.22') {
  acesso = '172.32.100.24'; // Produção - KSB
} else {
  acesso = '127.0.0.1'; // Local - Desenvolvimento
}

const pool = new Pool({
  user: 'postgres',
  host: '172.32.100.24',
  database: 'bp_analytics',
  password: '',
});

// Exemplo de consulta ao banco de dados
pool.query('SELECT * FROM vi_lista_ccusto', (err, res) => {
  if (err) {
    console.error('Erro ao executar a consulta:', err);
  } else {
    console.log('Resultado da consulta:', res.rows[0]);
  }
  
  // Fechando a conexão
  pool.end();
});
