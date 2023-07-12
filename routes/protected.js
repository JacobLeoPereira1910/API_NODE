const express = require('express');
const mysql = require("mysql");
const path = require("path");
const dotenv = require('dotenv');
const exphbs = require('hbs');
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");


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

module.exports = router;
