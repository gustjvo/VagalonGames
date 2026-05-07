require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const dns = require('dns');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI
const JWT_SECRET = process.env.JWT_SECRET;
dns.setServers(['8.8.8.8', '8.8.4.4']);

// ─── Middlewares ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: '*', // Aceita o seu site na porta 5173
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Upload Config ────────────────────────────────────────────────────────────
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ─── MongoDB Schemas ──────────────────────────────────────────────────────────
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB conectado'))
  .catch(err => console.error('❌ Erro MongoDB:', err));


const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  cpf: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['cliente', 'admin'], default: 'cliente' },
  avatar: { type: String, default: '' },
  address: {
    street: String,
    number: String,
    complement: String,
    neighborhood: String,
    city: String,
    state: String,
    cep: String,
  },
  createdAt: { type: Date, default: Date.now },
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number, default: 0 },
  category: { type: String, required: true, enum: ['console', 'jogo', 'acessorio', 'pc', 'cadeira', 'periférico', 'outros'] },
  image: { type: String, default: '' },
  images: [String],
  stock: { type: Number, required: true, default: 0 },
  rating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  featured: { type: Boolean, default: false },
  badge: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: String,
    price: Number,
    quantity: { type: Number, required: true, min: 1 },
    image: String,
  }],
  total: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['pix', 'cartao', 'boleto'], required: true },
  paymentDetails: {
    cardNumber: String,
    cardName: String,
    cardExpiry: String,
    installments: Number,
  },
  status: { type: String, enum: ['pendente', 'pago', 'enviado', 'entregue', 'cancelado'], default: 'pendente' },
  address: {
    street: String,
    number: String,
    complement: String,
    neighborhood: String,
    city: String,
    state: String,
    cep: String,
  },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);

// ─── Middleware Auth ──────────────────────────────────────────────────────────
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token não fornecido' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'Usuário não encontrado' });
    next();
  } catch {
    res.status(401).json({ message: 'Token inválido' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Acesso negado' });
  next();
};

// ─── Seed Admin ───────────────────────────────────────────────────────────────
const seedAdmin = async () => {
  const exists = await User.findOne({ cpf: '000.000.000-00' });
  if (!exists) {
    const hashed = await bcrypt.hash('admin123', 10);
    await User.create({ name: 'Administrador', cpf: '000.000.000-00', password: hashed, role: 'admin' });
    console.log('✅ Admin criado: CPF=000.000.000-00 | SENHA=admin123');
  }
};
mongoose.connection.once('open', seedAdmin);

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, cpf, password, address } = req.body;
    if (!name || !cpf || !password) return res.status(400).json({ message: 'Campos obrigatórios faltando' });
    const exists = await User.findOne({ cpf });
    if (exists) return res.status(400).json({ message: 'CPF já cadastrado' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, cpf, password: hashed, address: address || {} });
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { _id: user._id, name: user.name, cpf: user.cpf, role: user.role, avatar: user.avatar, address: user.address } });
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor', error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { cpf, password } = req.body;
    if (!cpf || !password) return res.status(400).json({ message: 'CPF e senha obrigatórios' });
    const user = await User.findOne({ cpf });
    if (!user) return res.status(400).json({ message: 'CPF ou senha inválidos' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'CPF ou senha inválidos' });
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { _id: user._id, name: user.name, cpf: user.cpf, role: user.role, avatar: user.avatar, address: user.address } });
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor', error: err.message });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json(req.user);
});

// ─── USER ROUTES ──────────────────────────────────────────────────────────────
app.put('/api/users/profile', authMiddleware, async (req, res) => {
  try {
    const { name, address, avatar } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (address) updates.address = address;
    if (avatar !== undefined) updates.avatar = avatar;
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao atualizar perfil', error: err.message });
  }
});

app.put('/api/users/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Senhas obrigatórias' });
    const user = await User.findById(req.user._id);
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ message: 'Senha atual incorreta' });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Senha alterada com sucesso' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao alterar senha', error: err.message });
  }
});

app.post('/api/users/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Nenhum arquivo enviado' });
    const avatarUrl = `/uploads/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(req.user._id, { avatar: avatarUrl }, { new: true }).select('-password');
    res.json({ avatar: avatarUrl, user });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao enviar avatar', error: err.message });
  }
});

// ─── PRODUCT ROUTES ───────────────────────────────────────────────────────────
app.get('/api/products', async (req, res) => {
  try {
    const { category, search, sort, limit = 20, page = 1 } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (search) filter.name = { $regex: search, $options: 'i' };
    const sortObj = sort === 'price_asc' ? { price: 1 } : sort === 'price_desc' ? { price: -1 } : sort === 'rating' ? { rating: -1 } : { createdAt: -1 };
    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      Product.find(filter).sort(sortObj).skip(skip).limit(Number(limit)),
      Product.countDocuments(filter),
    ]);
    res.json({ products, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar produtos', error: err.message });
  }
});

app.get('/api/products/featured', async (req, res) => {
  try {
    const products = await Product.find({ featured: true }).limit(10);
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Erro', error: err.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Produto não encontrado' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Erro', error: err.message });
  }
});

app.post('/api/products', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao criar produto', error: err.message });
  }
});

app.put('/api/products/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ message: 'Produto não encontrado' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao atualizar produto', error: err.message });
  }
});

app.delete('/api/products/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Produto não encontrado' });
    res.json({ message: 'Produto removido' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao remover produto', error: err.message });
  }
});

app.post('/api/products/image', authMiddleware, adminMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Arquivo não enviado' });
    res.json({ url: `/uploads/${req.file.filename}` });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao enviar imagem', error: err.message });
  }
});

// Seed de produtos iniciais
const seedProducts = async () => {
  const count = await Product.countDocuments();
  if (count === 0) {
    await Product.insertMany([
      { name: 'PlayStation 5', description: 'Console de última geração com SSD ultra-rápido e ray tracing nativo.', price: 3999.99, originalPrice: 4999.99, category: 'console', stock: 15, rating: 4.9, ratingCount: 312, featured: true, badge: 'Mais Vendido', image: 'https://i.imgur.com/KJJYi2M.png' },
      { name: 'Xbox Series X', description: 'O Xbox mais poderoso já fabricado. 12 teraflops de poder gráfico.', price: 3799.99, originalPrice: 4599.99, category: 'console', stock: 8, rating: 4.8, ratingCount: 198, featured: true, badge: 'Oferta', image: 'https://i.imgur.com/4kJT2aX.png' },
      { name: 'Nintendo Switch OLED', description: 'Tela OLED vibrante de 7 polegadas. Jogue em casa ou em qualquer lugar.', price: 2299.99, originalPrice: 2699.99, category: 'console', stock: 22, rating: 4.7, ratingCount: 445, featured: true, badge: 'Novo', image: 'https://i.imgur.com/Ry0P7nT.png' },
      { name: 'God of War Ragnarök', description: 'A saga épica de Kratos e Atreus continua nos reinos nórdicos.', price: 349.99, originalPrice: 449.99, category: 'jogo', stock: 50, rating: 4.9, ratingCount: 876, featured: true, badge: 'Top', image: 'https://i.imgur.com/LtFbIuN.png' },
      { name: 'Headset Gamer HyperX Cloud II', description: 'Áudio surround 7.1 virtual, almofadas de memória, microfone destacável.', price: 499.99, originalPrice: 649.99, category: 'acessorio', stock: 30, rating: 4.6, ratingCount: 234, featured: false, badge: '', image: 'https://i.imgur.com/HzD5dCk.png' },
      { name: 'Cadeira Gamer ThunderX3', description: 'Ergonomia premium, suporte lombar ajustável, apoio de braço 4D.', price: 1899.99, originalPrice: 2299.99, category: 'cadeira', stock: 12, rating: 4.5, ratingCount: 167, featured: true, badge: 'Promoção', image: 'https://i.imgur.com/xCXdUWo.png' },
      { name: 'Monitor Gamer 144Hz 27"', description: 'Painel IPS, 1ms de resposta, G-Sync Compatible, HDR400.', price: 1499.99, originalPrice: 1899.99, category: 'periférico', stock: 7, rating: 4.7, ratingCount: 89, featured: false, badge: '', image: 'https://i.imgur.com/mHEcaxt.png' },
      { name: 'Controle PS5 DualSense', description: 'Feedback háptico e gatilhos adaptáveis para imersão total.', price: 449.99, originalPrice: 549.99, category: 'acessorio', stock: 40, rating: 4.8, ratingCount: 521, featured: false, badge: '', image: 'https://i.imgur.com/G1XO4CJ.png' },
    ]);
    console.log('✅ Produtos de exemplo criados');
  }
};
mongoose.connection.once('open', seedProducts);

// ─── ORDER ROUTES ─────────────────────────────────────────────────────────────
app.post('/api/orders', authMiddleware, async (req, res) => {
  try {
    const { items, paymentMethod, paymentDetails, address } = req.body;
    if (!items?.length) return res.status(400).json({ message: 'Carrinho vazio' });
    if (!paymentMethod) return res.status(400).json({ message: 'Forma de pagamento obrigatória' });

    // Validate stock and calculate total
    let total = 0;
    const orderItems = [];
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) return res.status(400).json({ message: `Produto não encontrado: ${item.productId}` });
      if (product.stock < item.quantity) return res.status(400).json({ message: `Estoque insuficiente para: ${product.name}` });
      total += product.price * item.quantity;
      orderItems.push({ product: product._id, name: product.name, price: product.price, quantity: item.quantity, image: product.image });
    }

    // Deduct stock
    for (const item of items) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
    }

    const deliveryAddress = address || req.user.address;
    const order = await Order.create({ user: req.user._id, items: orderItems, total, paymentMethod, paymentDetails: paymentDetails || {}, address: deliveryAddress });
    const populated = await order.populate('user', 'name cpf');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao criar pedido', error: err.message });
  }
});

app.get('/api/orders/my', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).populate('user', 'name cpf');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Erro', error: err.message });
  }
});

app.get('/api/orders', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).populate('user', 'name cpf email');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Erro', error: err.message });
  }
});

app.put('/api/orders/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true }).populate('user', 'name cpf');
    if (!order) return res.status(404).json({ message: 'Pedido não encontrado' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Erro', error: err.message });
  }
});

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────
app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Erro', error: err.message });
  }
});

app.get('/api/admin/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [totalUsers, totalProducts, totalOrders, revenue] = await Promise.all([
      User.countDocuments({ role: 'cliente' }),
      Product.countDocuments(),
      Order.countDocuments(),
      Order.aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }]),
    ]);
    res.json({ totalUsers, totalProducts, totalOrders, revenue: revenue[0]?.total || 0 });
  } catch (err) {
    res.status(500).json({ message: 'Erro', error: err.message });
  }
});

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Procure a linha app.listen(PORT, ...) e mude para:
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando em http://127.0.0.1:${PORT}`);
});

module.exports = app;