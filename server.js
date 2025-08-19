'use strict';

// Minimal Express server for FFF Online
require('dotenv').config();
const express = require('express');

const PORT = process.env.PORT || 8080;
const ORIGIN = process.env.CORS_ORIGIN || '*';

const app = express();
app.disable('x-powered-by');

// basic CORS header
app.use((_, res, next) => { res.setHeader('Access-Control-Allow-Origin', ORIGIN); next(); });

// serve static files from project root (index.html, client script, etc.)
app.use(express.static('.'));

app.get('/health', (_, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
