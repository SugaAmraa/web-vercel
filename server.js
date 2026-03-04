import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCTS_FILE = path.join(__dirname, 'products.json');
const USERS_FILE    = path.join(__dirname, 'users.json');

// ── Helper ───────────────────────────────────────────────────
function readJSON(filePath) {
    try {
        const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (Array.isArray(raw)) return raw;
        return raw[Object.keys(raw)[0]]; // { "products": [...] } форматыг дэмжинэ
    } catch { return []; }
}

function writeJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function cors(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
}
// ─────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════
//  PORT 8080 — FRONT-END (index.html)
// ══════════════════════════════════════════════════════════════
const webApp = express();
webApp.use(express.static('.'));      // root — index.html, index.js
webApp.use(express.static('src'));   // src/ — styles, data
webApp.listen(8080, () =>
    console.log('🌐 Web         →  http://localhost:8080')
);

// ══════════════════════════════════════════════════════════════
//  PORT 3000 — PRODUCTS
// ══════════════════════════════════════════════════════════════
const productsApp = express();
productsApp.use(express.json());
productsApp.use(cors);

productsApp.get('/products', (req, res) => {
    res.json(readJSON(PRODUCTS_FILE));
});

productsApp.post('/products', (req, res) => {
    const { name, price } = req.body;
    if (!name || !price)
        return res.status(400).json({ message: 'Нэр болон үнэ шаардлагатай.' });
    const products = readJSON(PRODUCTS_FILE);
    const newProduct = { id: `p_${Date.now()}`, ...req.body };
    products.push(newProduct);
    writeJSON(PRODUCTS_FILE, products);
    console.log('✅ Бүтээгдэхүүн нэмэгдлээ:', newProduct.name);
    res.status(201).json(newProduct);
});

productsApp.delete('/products/:id', (req, res) => {
    const products = readJSON(PRODUCTS_FILE);
    const filtered = products.filter(p => String(p.id) !== req.params.id);
    if (filtered.length === products.length)
        return res.status(404).json({ message: 'Олдсонгүй.' });
    writeJSON(PRODUCTS_FILE, filtered);
    res.json({ message: 'Устгагдлаа.' });
});

productsApp.listen(3000, () =>
    console.log('🛒 Products  →  http://localhost:3000/products')
);

// ══════════════════════════════════════════════════════════════
//  PORT 3001 — USERS
// ══════════════════════════════════════════════════════════════
const usersApp = express();
usersApp.use(express.json());
usersApp.use(cors);

// GET /users — бүх хэрэглэгч (passwordHash нуугаад)
usersApp.get('/users', (req, res) => {
    const users = readJSON(USERS_FILE);
    res.json(users.map(({ passwordHash, ...rest }) => rest));
});

// POST /users/login — нэвтрэх шалгалт
usersApp.post('/users/login', (req, res) => {
    const { email, passwordHash } = req.body;
    const users = readJSON(USERS_FILE);
    const user = users.find(
        u => u.email?.toLowerCase() === email?.toLowerCase() &&
             u.passwordHash === passwordHash
    );
    if (!user) return res.status(401).json({ message: 'И-мэйл эсвэл нууц үг буруу.' });
    const { passwordHash: _, ...safe } = user;
    res.json(safe);
});

// POST /users — шинэ хэрэглэгч бүртгэх
usersApp.post('/users', (req, res) => {
    const { email, username } = req.body;
    if (!email || !username)
        return res.status(400).json({ message: 'И-мэйл болон username шаардлагатай.' });
    const users = readJSON(USERS_FILE);
    if (users.some(u => u.email?.toLowerCase() === email.toLowerCase()))
        return res.status(409).json({ message: 'И-мэйл аль хэдийн бүртгэлтэй.' });
    if (users.some(u => u.username?.toLowerCase() === username.toLowerCase()))
        return res.status(409).json({ message: 'Username аль хэдийн ашиглагдаж байна.' });
    const newUser = {
        id: `user_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
        ...req.body
    };
    users.push(newUser);
    writeJSON(USERS_FILE, users);
    console.log('✅ Хэрэглэгч бүртгэгдлээ:', newUser.username);
    const { passwordHash: _, ...safe } = newUser;
    res.status(201).json(safe);
});

// PATCH /users/:id — мэдээлэл засах
usersApp.patch('/users/:id', (req, res) => {
    const users = readJSON(USERS_FILE);
    const idx = users.findIndex(u => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Хэрэглэгч олдсонгүй.' });
    users[idx] = { ...users[idx], ...req.body };
    writeJSON(USERS_FILE, users);
    const { passwordHash: _, ...safe } = users[idx];
    res.json(safe);
});

usersApp.listen(3001, () =>
    console.log('👤 Users     →  http://localhost:3001/users')
);