import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";

// ─── API ──────────────────────────────────────────────────────────────────────
const API = "http://localhost:5000/api";
const apiFetch = async (url, options = {}) => {
  const token = localStorage.getItem("vg_token");
  const res = await fetch(`${API}${url}`, {
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro na requisição");
  return data;
};

// ─── Context ──────────────────────────────────────────────────────────────────
const AppContext = createContext(null);
const useApp = () => useContext(AppContext);

// ─── Toast ────────────────────────────────────────────────────────────────────
let toastFn = null;
const Toast = ({ toasts }) => (
  <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10 }}>
    {toasts.map(t => (
      <div key={t.id} style={{ background: t.type === "error" ? "#ff4d6d" : t.type === "success" ? "#00e5a0" : "#00c3ff", color: "#0a0a0f", padding: "12px 20px", borderRadius: 8, fontWeight: 700, fontSize: 14, minWidth: 260, boxShadow: "0 4px 20px rgba(0,0,0,0.5)", animation: "slideIn 0.3s ease" }}>
        {t.message}
      </div>
    ))}
  </div>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatBRL = v => v?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatCPF = v => v.replace(/\D/g, "").replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
const formatDate = d => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const getInitials = name => name?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() || "U";

// ─── Icons (SVG inline) ───────────────────────────────────────────────────────
const Icon = ({ name, size = 20, color = "currentColor" }) => {
  const icons = {
    cart: <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/>,
    user: <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    menu: <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    minus: <line x1="5" y1="12" x2="19" y2="12"/>,
    trash: <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></>,
    star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
    gamepad: <><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4M8 10v4M15 11h.01M18 11h.01"/></>,
    home: <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    package: <><path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>,
    history: <><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></>,
    chevronLeft: <polyline points="15 18 9 12 15 6"/>,
    chevronRight: <polyline points="9 18 15 12 9 6"/>,
    map: <><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></>,
    mail: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
    phone: <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.07 10.9 19.79 19.79 0 011 2.18 2 2 0 013 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z"/>,
    instagram: <><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
    zap: <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
    award: <><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></>,
    truck: <><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    eyeOff: <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/></>,
    pix: <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>,
    credit: <><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></>,
    file: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
    edit: <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    camera: <><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></>,
    logout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    check: <polyline points="20 6 9 17 4 12"/>,
    arrowRight: <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    headphones: <><path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
};

// ─── STYLES (CSS-in-JS via style tag) ─────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Exo+2:wght@300;400;500;600;700;800&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #080810;
      --bg2: #0d0d1a;
      --bg3: #12121f;
      --card: #0f0f1e;
      --border: rgba(0,195,255,0.12);
      --border2: rgba(0,195,255,0.25);
      --cyan: #00c3ff;
      --cyan2: #00e5a0;
      --purple: #8b5cf6;
      --pink: #ff4d6d;
      --text: #e8eaf6;
      --text2: #8892b0;
      --text3: #4a5568;
      --yellow: #ffd700;
      --radius: 12px;
      --shadow: 0 4px 30px rgba(0,0,0,0.5);
    }
    html { scroll-behavior: smooth; }
    body { background: var(--bg); color: var(--text); font-family: 'Exo 2', sans-serif; min-height: 100vh; overflow-x: hidden; }
    ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: var(--bg2); } ::-webkit-scrollbar-thumb { background: var(--cyan); border-radius: 3px; }
    a { color: inherit; text-decoration: none; }
    input, select, textarea { font-family: inherit; }
    button { font-family: 'Rajdhani', sans-serif; font-weight: 600; cursor: pointer; border: none; outline: none; }
    @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
    @keyframes fadeUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
    @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.5;} }
    @keyframes spin { to{transform:rotate(360deg);} }
    @keyframes glow { 0%,100%{box-shadow:0 0 5px var(--cyan);} 50%{box-shadow:0 0 20px var(--cyan),0 0 40px var(--cyan);} }
    @keyframes scan { 0%{top:-10%;} 100%{top:110%;} }
    @keyframes float { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-8px);} }
    .fadeUp { animation: fadeUp 0.5s ease forwards; }
    .grid-bg {
      background-image: linear-gradient(rgba(0,195,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,195,255,0.03) 1px, transparent 1px);
      background-size: 40px 40px;
    }
    .neon-border { border: 1px solid var(--border2); box-shadow: 0 0 10px rgba(0,195,255,0.1), inset 0 0 10px rgba(0,195,255,0.03); }
    .btn { display:inline-flex; align-items:center; gap:8px; padding:10px 20px; border-radius:8px; font-size:15px; transition:all 0.2s; }
    .btn-primary { background:linear-gradient(135deg,var(--cyan),var(--purple)); color:#fff; }
    .btn-primary:hover { opacity:0.9; transform:translateY(-1px); box-shadow:0 4px 20px rgba(0,195,255,0.3); }
    .btn-outline { background:transparent; border:1px solid var(--border2); color:var(--cyan); }
    .btn-outline:hover { background:rgba(0,195,255,0.1); }
    .btn-danger { background:var(--pink); color:#fff; }
    .btn-danger:hover { opacity:0.9; }
    .card { background:var(--card); border-radius:var(--radius); border:1px solid var(--border); transition:all 0.3s; }
    .card:hover { border-color:var(--border2); }
    .badge { padding:2px 8px; border-radius:4px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; }
    .inp { background:rgba(255,255,255,0.04); border:1px solid var(--border); border-radius:8px; color:var(--text); padding:10px 14px; width:100%; transition:border 0.2s; font-size:14px; }
    .inp:focus { outline:none; border-color:var(--cyan); box-shadow:0 0 0 2px rgba(0,195,255,0.1); }
    .inp::placeholder { color:var(--text3); }
    .spinner { width:32px;height:32px;border:3px solid var(--border);border-top:3px solid var(--cyan);border-radius:50%;animation:spin 0.8s linear infinite; }
    select.inp option { background:var(--bg3); }
  `}</style>
);

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [page, setPage] = useState("home");
  const [toasts, setToasts] = useState([]);
  const [authModal, setAuthModal] = useState(null); // 'login' | 'register'
  const [loading, setLoading] = useState(true);
  const [mobileMenu, setMobileMenu] = useState(false);

  const addToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);

  useEffect(() => {
    toastFn = addToast;
    const token = localStorage.getItem("vg_token");
    if (token) {
      apiFetch("/auth/me").then(u => { setUser(u); setLoading(false); }).catch(() => { localStorage.removeItem("vg_token"); setLoading(false); });
    } else setLoading(false);
    const saved = localStorage.getItem("vg_cart");
    if (saved) { try { setCart(JSON.parse(saved)); } catch {} }
  }, [addToast]);

  const saveCart = (c) => { setCart(c); localStorage.setItem("vg_cart", JSON.stringify(c)); };

  const addToCart = useCallback((product, qty = 1) => {
    setCart(prev => {
      const exists = prev.find(i => i.productId === product._id);
      const next = exists
        ? prev.map(i => i.productId === product._id ? { ...i, quantity: i.quantity + qty } : i)
        : [...prev, { productId: product._id, name: product.name, price: product.price, image: product.image, quantity: qty }];
      localStorage.setItem("vg_cart", JSON.stringify(next));
      return next;
    });
    addToast(`${product.name} adicionado ao carrinho!`);
  }, [addToast]);

  const removeFromCart = useCallback((id) => {
    setCart(prev => { const n = prev.filter(i => i.productId !== id); localStorage.setItem("vg_cart", JSON.stringify(n)); return n; });
  }, []);

  const updateQty = useCallback((id, qty) => {
    if (qty < 1) return;
    setCart(prev => { const n = prev.map(i => i.productId === id ? { ...i, quantity: qty } : i); localStorage.setItem("vg_cart", JSON.stringify(n)); return n; });
  }, []);

  const logout = () => { localStorage.removeItem("vg_token"); setUser(null); setPage("home"); addToast("Até logo!", "success"); };

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  if (loading) return (
    <>
      <GlobalStyles />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 20 }}>
        <Icon name="gamepad" size={48} color="var(--cyan)" />
        <div className="spinner" />
        <p style={{ color: "var(--cyan)", fontFamily: "Rajdhani", letterSpacing: 2 }}>VAGALON GAMES</p>
      </div>
    </>
  );

  const ctx = { user, setUser, cart, cartCount, cartTotal, addToCart, removeFromCart, updateQty, saveCart, setPage, addToast, setAuthModal };

  return (
    <AppContext.Provider value={ctx}>
      <GlobalStyles />
      <Toast toasts={toasts} />
      <Header page={page} setPage={setPage} cartCount={cartCount} user={user} logout={logout} setAuthModal={setAuthModal} mobileMenu={mobileMenu} setMobileMenu={setMobileMenu} />
      <main style={{ minHeight: "100vh", paddingTop: 70 }}>
        {page === "home" && <HomePage />}
        {page === "produtos" && <ProductsPage />}
        {page === "carrinho" && <CartPage />}
        {page === "checkout" && <CheckoutPage />}
        {page === "perfil" && user && <ProfilePage />}
        {page === "historico" && user && <OrderHistoryPage />}
        {page === "admin" && user?.role === "admin" && <AdminPage />}
      </main>
      <Footer setPage={setPage} />
      {authModal && <AuthModal mode={authModal} setMode={setAuthModal} onClose={() => setAuthModal(null)} />}
    </AppContext.Provider>
  );
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
function Header({ page, setPage, cartCount, user, logout, setAuthModal, mobileMenu, setMobileMenu }) {
  const [search, setSearch] = useState("");
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => { const fn = () => setScrolled(window.scrollY > 10); window.addEventListener("scroll", fn); return () => window.removeEventListener("scroll", fn); }, []);

  const nav = [
    { id: "home", label: "Início" },
    { id: "produtos", label: "Produtos" },
  ];

  return (
    <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, height: 70, background: scrolled ? "rgba(8,8,16,0.97)" : "rgba(8,8,16,0.85)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${scrolled ? "var(--border2)" : "var(--border)"}`, transition: "all 0.3s" }}>
      <div style={{ maxWidth: 1300, margin: "0 auto", padding: "0 20px", height: "100%", display: "flex", alignItems: "center", gap: 20 }}>
        {/* Logo */}
        <button onClick={() => setPage("home")} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", color: "var(--text)", flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,var(--cyan),var(--purple))", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", animation: "glow 3s infinite" }}>
            <Icon name="gamepad" size={20} color="#fff" />
          </div>
          <span style={{ fontFamily: "Rajdhani", fontWeight: 700, fontSize: 20, background: "linear-gradient(135deg,var(--cyan),var(--purple))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>VAGALON</span>
          <span style={{ fontFamily: "Rajdhani", fontWeight: 700, fontSize: 20, color: "var(--text2)" }}>GAMES</span>
        </button>

        {/* Search */}
        <div style={{ flex: 1, maxWidth: 500, position: "relative" }}>
      
          <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.4 }}>
            <Icon name="search" size={16} color="var(--cyan)" />
          </div>
        </div>

        {/* Nav Desktop */}
        <nav style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {nav.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)}
              style={{ padding: "8px 14px", background: page === n.id ? "rgba(0,195,255,0.1)" : "none", border: page === n.id ? "1px solid var(--border2)" : "1px solid transparent", borderRadius: 8, color: page === n.id ? "var(--cyan)" : "var(--text2)", fontSize: 14, fontFamily: "Rajdhani", fontWeight: 600, transition: "all 0.2s" }}>
              {n.label}
            </button>
          ))}
        </nav>

        {/* Cart */}
        <button onClick={() => setPage("carrinho")} style={{ position: "relative", background: "rgba(0,195,255,0.08)", border: "1px solid var(--border)", borderRadius: 10, padding: 10, color: "var(--text)", transition: "all 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "var(--cyan)"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
          <Icon name="cart" size={20} color={cartCount > 0 ? "var(--cyan)" : "var(--text2)"} />
          {cartCount > 0 && (
            <span style={{ position: "absolute", top: -6, right: -6, background: "var(--pink)", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{cartCount}</span>
          )}
        </button>

        {/* User */}
        {user ? (
          <div style={{ position: "relative" }}>
            <UserMenu user={user} setPage={setPage} logout={logout} />
          </div>
        ) : (
          <button onClick={() => setAuthModal("login")} className="btn btn-primary" style={{ padding: "8px 16px", fontSize: 13 }}>
            <Icon name="user" size={16} color="#fff" /> Entrar
          </button>
        )}
      </div>
    </header>
  );
}

function UserMenu({ user, setPage, logout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => { const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener("mousedown", fn); return () => document.removeEventListener("mousedown", fn); }, []);

  const items = [
    ...(user.role === "admin" ? [{ label: "Painel Admin", icon: "shield", page: "admin" }] : []),
    { label: "Meu Perfil", icon: "user", page: "perfil" },
    { label: "Histórico", icon: "history", page: "historico" },
  ];

  return (
    <div ref={ref}>
      <button onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(0,195,255,0.05)", border: "1px solid var(--border)", borderRadius: 10, padding: "6px 12px", color: "var(--text)", cursor: "pointer" }}>
        {user.avatar
          ? <img src={user.avatar.startsWith("/uploads") ? `http://localhost:5000${user.avatar}` : user.avatar} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
          : <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,var(--cyan),var(--purple))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>{getInitials(user.name)}</div>
        }
        <span style={{ fontFamily: "Rajdhani", fontWeight: 600, fontSize: 14 }}>{user.name.split(" ")[0]}</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 10, overflow: "hidden", minWidth: 180, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", zIndex: 100 }}>
          {items.map(item => (
            <button key={item.page} onClick={() => { setPage(item.page); setOpen(false); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "none", color: "var(--text)", fontSize: 14, borderBottom: "1px solid var(--border)", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(0,195,255,0.07)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              <Icon name={item.icon} size={16} color="var(--cyan)" /> {item.label}
            </button>
          ))}
          <button onClick={() => { logout(); setOpen(false); }}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "none", color: "var(--pink)", fontSize: 14, cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,77,109,0.07)"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}>
            <Icon name="logout" size={16} color="var(--pink)" /> Sair
          </button>
        </div>
      )}
    </div>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
function HomePage() {
  const { setPage } = useApp();
  return (
    <div>
      <HeroCarousel />

      <FeaturedProducts />
      <BannerSection />
      <AllProductsSection />
      <MapSection />
      <ContactSection />
    </div>
  );
}

function HeroCarousel() {
  const { setPage } = useApp();
  const slides = [
    { id: 1, title: "PlayStation 5", sub: "A próxima geração chegou", tag: "Últimas unidades", color: "#00c3ff", gradient: "linear-gradient(135deg,#00c3ff22,#8b5cf622)", cta: "Ver PS5", image: "https://gmedia.playstation.com/is/image/SIEPDC/ps5-product-thumbnail-01-en-14sep21?$facebook$" },
    { id: 2, title: "Xbox Series X", sub: "12 Teraflops de poder puro", tag: "Oferta Imperdível", color: "#00e5a0", gradient: "linear-gradient(135deg,#00e5a022,#00c3ff22)", cta: "Ver Xbox", image: "https://cms-assets.xboxservices.com/assets/bc/40/bc40fdf3-85a6-4c36-af92-dca2d36fc7e5.png?n=642227_Hero-Gallery-0_A1_857x676.png" },
    { id: 3, title: "Mega Liquidação", sub: "Até 40% OFF em jogos selecionados", tag: "Promoção Relâmpago", color: "#ffd700", gradient: "linear-gradient(135deg,#ffd70022,#ff4d6d22)", cta: "Ver Ofertas" },
  ];
  const [current, setCurrent] = useState(0);
  useEffect(() => { const t = setInterval(() => setCurrent(p => (p + 1) % slides.length), 5000); return () => clearInterval(t); }, []);

  const s = slides[current];
  return (
    <div style={{ position: "relative", height: "70vh", maxHeight: 600, overflow: "hidden", background: s.gradient, transition: "background 0.8s ease" }} className="grid-bg">
      {/* Scan line effect */}
      <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${s.color},transparent)`, animation: "scan 4s linear infinite", zIndex: 1, opacity: 0.3 }} />

      <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", alignItems: "center", maxWidth: 1300, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ animation: "fadeUp 0.5s ease", flex: 1, maxWidth: "45%" }}>
          <span className="badge" style={{ background: s.color, color: "#0a0a0f", marginBottom: 16, display: "inline-block" }}>{s.tag}</span>
          <h1 style={{ fontFamily: "Rajdhani", fontSize: "clamp(3rem,7vw,5.5rem)", fontWeight: 700, lineHeight: 1.1, color: "#fff", textShadow: `0 0 40px ${s.color}50`, marginBottom: 16 }}>{s.title}</h1>
          <p style={{ fontSize: "clamp(1rem,2vw,1.3rem)", color: "var(--text2)", marginBottom: 32, maxWidth: 500 }}>{s.sub}</p>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => setPage("produtos")} className="btn" style={{ background: s.color, color: "#0a0a0f", fontWeight: 700, fontSize: 16 }}>{s.cta} <Icon name="arrowRight" size={18} color="#0a0a0f" /></button>
            <button onClick={() => setPage("produtos")} className="btn btn-outline" style={{ fontSize: 16 }}>Ver Catálogo</button>
          </div>
        </div>
        {/* Slide image or decorative */}
        {s.image ? (
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "52%", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", overflow: "hidden" }}>
            <img src={s.image} alt={s.title} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", animation: "float 4s ease-in-out infinite", mixBlendMode: "multiply", filter: `drop-shadow(0 0 30px ${s.color}50)` }} />
          </div>
        ) : (
          <div style={{ position: "absolute", right: "5%", top: "50%", transform: "translateY(-50%)", opacity: 0.08, fontSize: 300, fontFamily: "Rajdhani", fontWeight: 900, color: s.color, userSelect: "none", lineHeight: 1 }}>VG</div>
        )}
      </div>

      {/* Dots */}
      <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8, zIndex: 10 }}>
        {slides.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)} style={{ width: i === current ? 28 : 8, height: 8, borderRadius: 4, background: i === current ? s.color : "rgba(255,255,255,0.2)", border: "none", transition: "all 0.3s", cursor: "pointer" }} />
        ))}
      </div>

      {/* Nav Arrows */}
      <button onClick={() => setCurrent(p => (p - 1 + slides.length) % slides.length)}
        style={{ position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.4)", border: "1px solid var(--border)", borderRadius: "50%", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 10 }}>
        <Icon name="chevronLeft" size={20} color="var(--text)" />
      </button>
      <button onClick={() => setCurrent(p => (p + 1) % slides.length)}
        style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.4)", border: "1px solid var(--border)", borderRadius: "50%", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 10 }}>
        <Icon name="chevronRight" size={20} color="var(--text)" />
      </button>
    </div>
  );
}

function CategoriesBar() {
  const { setPage } = useApp();
  const cats = [
    { id: "console", label: "Consoles", icon: "gamepad", color: "#00c3ff" },
    { id: "jogo", label: "Jogos", icon: "star", color: "#8b5cf6" },
    { id: "acessorio", label: "Acessórios", icon: "headphones", color: "#00e5a0" },
    { id: "pc", label: "PC Gamer", icon: "zap", color: "#ffd700" },
    { id: "cadeira", label: "Cadeiras", icon: "award", color: "#ff4d6d" },
    { id: "periférico", label: "Periféricos", icon: "settings", color: "#00c3ff" },
  ];
  return (
    <div style={{ background: "var(--bg2)", borderBottom: "1px solid var(--border)", padding: "16px 0" }}>
      <div style={{ maxWidth: 1300, margin: "0 auto", padding: "0 20px", display: "flex", gap: 12, overflowX: "auto" }}>
        {cats.map(c => (
          <button key={c.id} onClick={() => setPage("produtos")}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 20px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text2)", minWidth: 90, cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = c.color; e.currentTarget.style.color = c.color; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text2)"; }}>
            <Icon name={c.icon} size={22} color="currentColor" />
            <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", fontFamily: "Rajdhani" }}>{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function FeaturedProducts() {
  const { addToCart, setPage, user, setAuthModal } = useApp();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiFetch("/products/featured").then(setProducts).catch(() => {}).finally(() => setLoading(false)); }, []);

  const handleCart = (p) => {
    if (!user) { setAuthModal("login"); return; }
    addToCart(p);
  };

  return (
    <section style={{ padding: "60px 20px", maxWidth: 1300, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <p style={{ color: "var(--cyan)", fontFamily: "Rajdhani", fontSize: 13, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>Destaques</p>
          <h2 style={{ fontFamily: "Rajdhani", fontSize: "clamp(1.5rem,3vw,2.2rem)", fontWeight: 700 }}>Produtos em Destaque</h2>
        </div>
        <button onClick={() => setPage("produtos")} className="btn btn-outline" style={{ fontSize: 13 }}>Ver todos <Icon name="arrowRight" size={16} /></button>
      </div>
      {loading ? <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><div className="spinner" /></div> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 20 }}>
          {products.map((p, i) => <ProductCard key={p._id} product={p} onAddToCart={() => handleCart(p)} delay={i * 60} />)}
        </div>
      )}
    </section>
  );
}

function ProductCard({ product: p, onAddToCart, delay = 0 }) {
  const discount = p.originalPrice > p.price ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", overflow: "hidden", animation: `fadeUp 0.5s ease ${delay}ms both` }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,195,255,0.15)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
      <div style={{ position: "relative", background: "var(--bg2)", height: 200, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {p.image ? <img src={p.image} alt={p.name} style={{ maxWidth: "80%", maxHeight: "80%", objectFit: "contain", animation: "float 3s ease-in-out infinite" }} onError={e => e.currentTarget.style.display = "none"} />
          : <Icon name="package" size={64} color="var(--text3)" />}
        {p.badge && <span className="badge" style={{ position: "absolute", top: 10, left: 10, background: "var(--cyan)", color: "#0a0a0f" }}>{p.badge}</span>}
        {discount > 0 && <span className="badge" style={{ position: "absolute", top: 10, right: 10, background: "var(--pink)", color: "#fff" }}>-{discount}%</span>}
      </div>
      <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ fontSize: 12, color: "var(--cyan)", textTransform: "uppercase", letterSpacing: 1, fontFamily: "Rajdhani" }}>{p.category}</p>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>{p.name}</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {[1,2,3,4,5].map(s => <Icon key={s} name="star" size={12} color={s <= Math.round(p.rating) ? "#ffd700" : "var(--text3)"} />)}
          <span style={{ fontSize: 11, color: "var(--text3)", marginLeft: 4 }}>({p.ratingCount})</span>
        </div>
        <div style={{ marginTop: "auto" }}>
          {p.originalPrice > p.price && <p style={{ fontSize: 12, color: "var(--text3)", textDecoration: "line-through" }}>{formatBRL(p.originalPrice)}</p>}
          <p style={{ fontSize: 22, fontWeight: 700, color: "var(--cyan)", fontFamily: "Rajdhani" }}>{formatBRL(p.price)}</p>
          <p style={{ fontSize: 11, color: "var(--text3)" }}>ou 12x de {formatBRL(p.price / 12)}</p>
        </div>
        <button onClick={onAddToCart} className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 8, fontSize: 14 }}
          disabled={p.stock === 0}>
          {p.stock === 0 ? "Esgotado" : <><Icon name="cart" size={16} color="#fff" /> Adicionar</>}
        </button>
      </div>
    </div>
  );
}

function BannerSection() {
  const { setPage } = useApp();
  const banners = [
    { icon: "truck", title: "Frete Grátis", sub: "Em pedidos acima de R$ 299", color: "var(--cyan)" },
    { icon: "shield", title: "Garantia Total", sub: "12 meses de garantia oficial", color: "var(--cyan2)" },
    { icon: "zap", title: "Entrega Rápida", sub: "Receba em até 3 dias úteis", color: "var(--yellow)" },
    { icon: "headphones", title: "Suporte 24/7", sub: "Atendimento especializado", color: "var(--purple)" },
  ];
  return (
    <div style={{ background: "var(--bg2)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "32px 20px" }}>
      <div style={{ maxWidth: 1300, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 20 }}>
        {banners.map((b, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${b.color}18`, border: `1px solid ${b.color}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name={b.icon} size={22} color={b.color} />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontFamily: "Rajdhani", fontSize: 16 }}>{b.title}</p>
              <p style={{ fontSize: 12, color: "var(--text2)", marginTop: 2 }}>{b.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AllProductsSection() {
  const { addToCart, user, setAuthModal } = useApp();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiFetch("/products?limit=8").then(d => setProducts(d.products)).catch(() => {}).finally(() => setLoading(false)); }, []);

  const handleCart = (p) => { if (!user) { setAuthModal("login"); return; } addToCart(p); };
  return (
    <section style={{ padding: "60px 20px", maxWidth: 1300, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <p style={{ color: "var(--cyan)", fontFamily: "Rajdhani", fontSize: 13, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>Catálogo</p>
        <h2 style={{ fontFamily: "Rajdhani", fontSize: "clamp(1.5rem,3vw,2.2rem)", fontWeight: 700 }}>Nossos Produtos</h2>
      </div>
      {loading ? <div style={{ display: "flex", justifyContent: "center" }}><div className="spinner" /></div> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 20 }}>
          {products.map((p, i) => <ProductCard key={p._id} product={p} onAddToCart={() => handleCart(p)} delay={i * 40} />)}
        </div>
      )}
    </section>
  );
}

function MapSection() {
  return (
    <section style={{ padding: "60px 20px", maxWidth: 1300, margin: "0 auto" }} id="mapa">
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <p style={{ color: "var(--cyan)", fontFamily: "Rajdhani", fontSize: 13, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>Onde Estamos</p>
        <h2 style={{ fontFamily: "Rajdhani", fontSize: "clamp(1.5rem,3vw,2.2rem)", fontWeight: 700 }}>Nossa Loja</h2>
        <p style={{ color: "var(--text2)", marginTop: 8 }}>Visite-nos presencialmente e veja nossos produtos de perto</p>
      </div>
      <div className="card" style={{ overflow: "hidden", border: "1px solid var(--border2)" }}>
        <div style={{ background: "var(--bg2)", padding: "16px 20px", display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[["map", "Rua dos Gamers, 42 - Centro, Recife - PE"], ["phone", "(81) 9 9999-9999"], ["mail", "contato@vagalongames.com.br"]].map(([icon, text]) => (
            <span key={text} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text2)" }}>
              <Icon name={icon} size={16} color="var(--cyan)" />{text}
            </span>
          ))}
        </div>
        <iframe
          title="Localização Vagalon Games"
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d124830.43744988263!2d-34.9535!3d-8.0538!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x7ab18fcb3ad7f7b%3A0x11c55d64a8e86e5e!2sRecife%2C%20PE!5e0!3m2!1spt-BR!2sbr!4v1700000000000!5m2!1spt-BR!2sbr"
          width="100%" height="380" style={{ border: "none", display: "block" }} allowFullScreen loading="lazy"
        />
      </div>
    </section>
  );
}

function ContactSection() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);
  const handleSubmit = (e) => { e.preventDefault(); setSent(true); setTimeout(() => setSent(false), 3000); setForm({ name: "", email: "", message: "" }); };
  return (
    <section style={{ padding: "60px 20px 80px", background: "var(--bg2)", borderTop: "1px solid var(--border)" }} id="contato">
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <p style={{ color: "var(--cyan)", fontFamily: "Rajdhani", fontSize: 13, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>Fale Conosco</p>
          <h2 style={{ fontFamily: "Rajdhani", fontSize: "clamp(1.5rem,3vw,2.2rem)", fontWeight: 700 }}>Entre em Contato</h2>
          <p style={{ color: "var(--text2)", marginTop: 8 }}>Estamos aqui para ajudar com qualquer dúvida</p>
        </div>
        {sent ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--cyan2)" }}>
            <Icon name="check" size={48} color="var(--cyan2)" />
            <p style={{ marginTop: 16, fontFamily: "Rajdhani", fontSize: 20, fontWeight: 700 }}>Mensagem enviada!</p>
            <p style={{ color: "var(--text2)", marginTop: 8 }}>Retornaremos em breve.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div><label style={{ fontSize: 13, color: "var(--text2)", display: "block", marginBottom: 6 }}>Nome</label>
                <input className="inp" required placeholder="Seu nome" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div><label style={{ fontSize: 13, color: "var(--text2)", display: "block", marginBottom: 6 }}>E-mail</label>
                <input className="inp" type="email" required placeholder="seu@email.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
            </div>
            <div><label style={{ fontSize: 13, color: "var(--text2)", display: "block", marginBottom: 6 }}>Mensagem</label>
              <textarea className="inp" required rows={5} placeholder="Como podemos ajudar?" value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} style={{ resize: "vertical" }} /></div>
            <button type="submit" className="btn btn-primary" style={{ justifyContent: "center", fontSize: 15 }}>
              <Icon name="mail" size={18} color="#fff" /> Enviar Mensagem
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

// ─── PRODUCTS PAGE ────────────────────────────────────────────────────────────
function ProductsPage() {
  const { addToCart, user, setAuthModal, addToast } = useApp();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 16, page, ...(category && { category }), ...(search && { search }), ...(sort && { sort }) });
      const d = await apiFetch(`/products?${params}`);
      setProducts(d.products); setTotal(d.total);
    } catch { addToast("Erro ao carregar produtos", "error"); }
    finally { setLoading(false); }
  }, [page, category, search, sort]);

  useEffect(() => { fetch_(); }, [fetch_]);
  const handleCart = (p) => { if (!user) { setAuthModal("login"); return; } addToCart(p); };
  const pages = Math.ceil(total / 16);

  return (
    <div style={{ maxWidth: 1300, margin: "0 auto", padding: "40px 20px" }}>
      <h1 style={{ fontFamily: "Rajdhani", fontSize: "2rem", fontWeight: 700, marginBottom: 24 }}>Todos os Produtos</h1>
      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap" }}>
        <input className="inp" placeholder="Buscar..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ flex: 1, minWidth: 200 }} />
        <select className="inp" value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} style={{ width: 160 }}>
          <option value="">Todas Categorias</option>
          {["console","jogo","acessorio","pc","cadeira","periférico","outros"].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="inp" value={sort} onChange={e => { setSort(e.target.value); setPage(1); }} style={{ width: 160 }}>
          <option value="">Ordenar por</option>
          <option value="price_asc">Menor Preço</option>
          <option value="price_desc">Maior Preço</option>
          <option value="rating">Mais Avaliados</option>
        </select>
      </div>
      <p style={{ color: "var(--text2)", fontSize: 13, marginBottom: 20 }}>{total} produto(s) encontrado(s)</p>
      {loading ? <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 20, marginBottom: 32 }}>
            {products.map((p, i) => <ProductCard key={p._id} product={p} onAddToCart={() => handleCart(p)} delay={i * 30} />)}
            {products.length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 60, color: "var(--text2)" }}>Nenhum produto encontrado.</div>}
          </div>
          {pages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
              {Array.from({ length: pages }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setPage(n)} className="btn" style={{ background: n === page ? "var(--cyan)" : "var(--card)", color: n === page ? "#0a0a0f" : "var(--text2)", border: "1px solid var(--border)", padding: "8px 14px" }}>{n}</button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── CART PAGE ────────────────────────────────────────────────────────────────
function CartPage() {
  const { cart, removeFromCart, updateQty, cartTotal, setPage, user, setAuthModal } = useApp();
  if (cart.length === 0) return (
    <div style={{ maxWidth: 800, margin: "80px auto", padding: "0 20px", textAlign: "center" }}>
      <Icon name="cart" size={80} color="var(--text3)" />
      <h2 style={{ fontFamily: "Rajdhani", fontSize: "2rem", marginTop: 24, marginBottom: 12 }}>Carrinho Vazio</h2>
      <p style={{ color: "var(--text2)", marginBottom: 32 }}>Adicione produtos para continuar com a compra.</p>
      <button onClick={() => setPage("produtos")} className="btn btn-primary" style={{ fontSize: 16, padding: "12px 32px" }}>Ver Produtos</button>
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px" }}>
      <h1 style={{ fontFamily: "Rajdhani", fontSize: "2rem", fontWeight: 700, marginBottom: 32 }}>Meu Carrinho</h1>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {cart.map(item => (
            <div key={item.productId} className="card" style={{ display: "flex", gap: 16, padding: 16, alignItems: "center" }}>
              <div style={{ width: 80, height: 80, background: "var(--bg2)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {item.image ? <img src={item.image} alt={item.name} style={{ maxWidth: "90%", maxHeight: "90%", objectFit: "contain" }} onError={e => e.currentTarget.style.display = "none"} /> : <Icon name="package" size={32} color="var(--text3)" />}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, marginBottom: 4 }}>{item.name}</p>
                <p style={{ color: "var(--cyan)", fontFamily: "Rajdhani", fontSize: 18, fontWeight: 700 }}>{formatBRL(item.price)}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => updateQty(item.productId, item.quantity - 1)} style={{ width: 32, height: 32, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="minus" size={14} /></button>
                <span style={{ fontFamily: "Rajdhani", fontWeight: 700, fontSize: 16, minWidth: 24, textAlign: "center" }}>{item.quantity}</span>
                <button onClick={() => updateQty(item.productId, item.quantity + 1)} style={{ width: 32, height: 32, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="plus" size={14} /></button>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontFamily: "Rajdhani", fontWeight: 700, fontSize: 16 }}>{formatBRL(item.price * item.quantity)}</p>
                <button onClick={() => removeFromCart(item.productId)} style={{ background: "none", border: "none", color: "var(--pink)", cursor: "pointer", marginTop: 6, display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}><Icon name="trash" size={14} color="var(--pink)" /> Remover</button>
              </div>
            </div>
          ))}
        </div>
        <div className="card neon-border" style={{ padding: 24, position: "sticky", top: 90 }}>
          <h3 style={{ fontFamily: "Rajdhani", fontSize: "1.3rem", fontWeight: 700, marginBottom: 20 }}>Resumo do Pedido</h3>
          {cart.map(i => (
            <div key={i.productId} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text2)", marginBottom: 8 }}>
              <span>{i.name} x{i.quantity}</span><span>{formatBRL(i.price * i.quantity)}</span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--border)", marginTop: 16, paddingTop: 16, display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
            <span style={{ fontFamily: "Rajdhani", fontWeight: 700, fontSize: 18 }}>Total</span>
            <span style={{ fontFamily: "Rajdhani", fontWeight: 700, fontSize: 22, color: "var(--cyan)" }}>{formatBRL(cartTotal)}</span>
          </div>
          <button onClick={() => { if (!user) { setAuthModal("login"); } else { setPage("checkout"); } }} className="btn btn-primary" style={{ width: "100%", justifyContent: "center", fontSize: 16, padding: "14px" }}>
            {user ? "Finalizar Compra" : "Entrar para Comprar"}
          </button>
          <button onClick={() => setPage("produtos")} className="btn btn-outline" style={{ width: "100%", justifyContent: "center", marginTop: 10, fontSize: 14 }}>Continuar Comprando</button>
        </div>
      </div>
    </div>
  );
}

// ─── CHECKOUT PAGE ────────────────────────────────────────────────────────────
function CheckoutPage() {
  const { cart, cartTotal, user, saveCart, setPage, addToast } = useApp();
  const [payMethod, setPayMethod] = useState("pix");
  const [cardData, setCardData] = useState({ cardNumber: "", cardName: "", cardExpiry: "", cardCvv: "", installments: 1 });
  const [address, setAddress] = useState({ street: user?.address?.street || "", number: user?.address?.number || "", complement: user?.address?.complement || "", neighborhood: user?.address?.neighborhood || "", city: user?.address?.city || "", state: user?.address?.state || "", cep: user?.address?.cep || "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cart.length) { addToast("Carrinho vazio", "error"); return; }
    setLoading(true);
    try {
      await apiFetch("/orders", { method: "POST", body: JSON.stringify({ items: cart.map(i => ({ productId: i.productId, quantity: i.quantity })), paymentMethod: payMethod, paymentDetails: payMethod === "cartao" ? cardData : {}, address }) });
      saveCart([]);
      setDone(true);
    } catch (err) { addToast(err.message, "error"); }
    finally { setLoading(false); }
  };

  if (done) return (
    <div style={{ maxWidth: 600, margin: "80px auto", padding: "0 20px", textAlign: "center" }}>
      <div style={{ width: 80, height: 80, background: "rgba(0,229,160,0.15)", border: "2px solid var(--cyan2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
        <Icon name="check" size={40} color="var(--cyan2)" />
      </div>
      <h2 style={{ fontFamily: "Rajdhani", fontSize: "2.5rem", fontWeight: 700, marginBottom: 12, color: "var(--cyan2)" }}>Pedido Realizado!</h2>
      <p style={{ color: "var(--text2)", marginBottom: 32, fontSize: 16 }}>Seu pedido foi confirmado com sucesso. Você receberá atualizações em breve.</p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <button onClick={() => setPage("historico")} className="btn btn-outline" style={{ fontSize: 15 }}><Icon name="history" size={18} /> Ver Pedidos</button>
        <button onClick={() => setPage("home")} className="btn btn-primary" style={{ fontSize: 15 }}>Voltar ao Início</button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px" }}>
      <h1 style={{ fontFamily: "Rajdhani", fontSize: "2rem", fontWeight: 700, marginBottom: 32 }}>Finalizar Compra</h1>
      <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Address */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontFamily: "Rajdhani", fontSize: "1.2rem", fontWeight: 700, marginBottom: 20 }}>Endereço de Entrega</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[["cep", "CEP", "00000-000"], ["street", "Rua/Avenida", "Ex: Rua das Flores"], ["number", "Número", "Ex: 123"], ["complement", "Complemento", "Ex: Apto 4"], ["neighborhood", "Bairro", "Ex: Centro"], ["city", "Cidade", "Ex: Recife"], ["state", "Estado", "Ex: PE"]].map(([f, l, ph]) => (
                <div key={f} style={f === "street" || f === "neighborhood" ? { gridColumn: "1/-1" } : {}}>
                  <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 5 }}>{l}</label>
                  <input className="inp" required placeholder={ph} value={address[f]} onChange={e => setAddress(p => ({ ...p, [f]: e.target.value }))} />
                </div>
              ))}
            </div>
          </div>
          {/* Payment */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontFamily: "Rajdhani", fontSize: "1.2rem", fontWeight: 700, marginBottom: 20 }}>Forma de Pagamento</h3>
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              {[["pix", "PIX", "pix"], ["cartao", "Cartão", "credit"], ["boleto", "Boleto", "file"]].map(([val, lbl, icon]) => (
                <button key={val} type="button" onClick={() => setPayMethod(val)}
                  style={{ flex: 1, padding: "12px 8px", borderRadius: 8, border: `2px solid ${payMethod === val ? "var(--cyan)" : "var(--border)"}`, background: payMethod === val ? "rgba(0,195,255,0.1)" : "var(--bg2)", color: payMethod === val ? "var(--cyan)" : "var(--text2)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, fontFamily: "Rajdhani", fontWeight: 700, transition: "all 0.2s" }}>
                  <Icon name={icon} size={22} color={payMethod === val ? "var(--cyan)" : "var(--text2)"} />
                  {lbl}
                </button>
              ))}
            </div>
            {payMethod === "pix" && (
              <div style={{ background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 10, padding: 24, textAlign: "center" }}>
                <div style={{ width: 120, height: 120, background: "var(--bg3)", margin: "0 auto 16px", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "var(--text3)" }}>
                  <div style={{ fontFamily: "monospace", color: "var(--text2)", fontSize: 9, textAlign: "center", lineHeight: 1.5 }}>
                    ██████████████<br/>██ ▄▄▄▄▄▄▄ ██<br/>██ █ ▄ █ █ ██<br/>██ █▄▄▄█ █ ██<br/>██ ▄▄▄▄▄▄▄ ██<br/>██████████████
                  </div>
                </div>
                <p style={{ fontFamily: "Rajdhani", fontWeight: 700, fontSize: 16, color: "var(--cyan2)" }}>Pagamento via PIX</p>
                <p style={{ color: "var(--text2)", fontSize: 13, marginTop: 6 }}>Chave PIX: <strong style={{ color: "var(--text)" }}>00.000.000/0001-00</strong></p>
                <p style={{ color: "var(--text2)", fontSize: 12, marginTop: 4 }}>Aprovação em até 5 minutos</p>
              </div>
            )}
            {payMethod === "cartao" && (
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 5 }}>Número do Cartão</label>
                  <input className="inp" required placeholder="0000 0000 0000 0000" maxLength={19} value={cardData.cardNumber} onChange={e => setCardData(p => ({ ...p, cardNumber: e.target.value.replace(/\s/g, "").replace(/(.{4})/g, "$1 ").trim() }))} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 5 }}>Nome no Cartão</label>
                  <input className="inp" required placeholder="NOME SOBRENOME" value={cardData.cardName} onChange={e => setCardData(p => ({ ...p, cardName: e.target.value.toUpperCase() }))} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 5 }}>Validade</label>
                    <input className="inp" required placeholder="MM/AA" maxLength={5} value={cardData.cardExpiry} onChange={e => setCardData(p => ({ ...p, cardExpiry: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 5 }}>CVV</label>
                    <input className="inp" required placeholder="000" maxLength={4} value={cardData.cardCvv} onChange={e => setCardData(p => ({ ...p, cardCvv: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 5 }}>Parcelas</label>
                  <select className="inp" value={cardData.installments} onChange={e => setCardData(p => ({ ...p, installments: Number(e.target.value) }))}>
                    {[1,2,3,6,12].map(n => <option key={n} value={n}>{n}x de {formatBRL(cartTotal / n)}{n === 1 ? " (à vista)" : ""}</option>)}
                  </select>
                </div>
              </div>
            )}
            {payMethod === "boleto" && (
              <div style={{ background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 10, padding: 24, textAlign: "center" }}>
                <Icon name="file" size={48} color="var(--text2)" />
                <p style={{ fontFamily: "Rajdhani", fontWeight: 700, fontSize: 16, marginTop: 12 }}>Pagamento via Boleto</p>
                <p style={{ color: "var(--text2)", fontSize: 13, marginTop: 6 }}>O boleto será gerado após a confirmação do pedido.</p>
                <p style={{ color: "var(--text2)", fontSize: 12, marginTop: 4 }}>Vencimento: 3 dias úteis</p>
              </div>
            )}
          </div>
        </div>
        {/* Summary */}
        <div className="card neon-border" style={{ padding: 24, position: "sticky", top: 90 }}>
          <h3 style={{ fontFamily: "Rajdhani", fontSize: "1.2rem", fontWeight: 700, marginBottom: 16 }}>Resumo</h3>
          {cart.map(i => (
            <div key={i.productId} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text2)", marginBottom: 8 }}>
              <span>{i.name} x{i.quantity}</span><span>{formatBRL(i.price * i.quantity)}</span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--border)", marginTop: 12, paddingTop: 12, display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
            <span style={{ fontFamily: "Rajdhani", fontWeight: 700 }}>Total</span>
            <span style={{ fontFamily: "Rajdhani", fontWeight: 700, fontSize: 20, color: "var(--cyan)" }}>{formatBRL(cartTotal)}</span>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", fontSize: 16, padding: "14px" }} disabled={loading}>
            {loading ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : <><Icon name="lock" size={18} color="#fff" /> Confirmar Pedido</>}
          </button>
          <p style={{ fontSize: 11, color: "var(--text3)", textAlign: "center", marginTop: 10 }}>
            <Icon name="shield" size={12} color="var(--text3)" /> Compra 100% segura e criptografada
          </p>
        </div>
      </form>
    </div>
  );
}

// ─── ORDER HISTORY ────────────────────────────────────────────────────────────
function OrderHistoryPage() {
  const { addToast } = useApp();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiFetch("/orders/my").then(setOrders).catch(() => addToast("Erro ao carregar pedidos", "error")).finally(() => setLoading(false)); }, []);

  const statusColor = { pendente: "#ffd700", pago: "#00e5a0", enviado: "#00c3ff", entregue: "#8b5cf6", cancelado: "#ff4d6d" };
  const statusLabel = { pendente: "Pendente", pago: "Pago", enviado: "Enviado", entregue: "Entregue", cancelado: "Cancelado" };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px" }}>
      <h1 style={{ fontFamily: "Rajdhani", fontSize: "2rem", fontWeight: 700, marginBottom: 32 }}>Histórico de Compras</h1>
      {loading ? <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div> : orders.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text2)" }}>
          <Icon name="history" size={64} color="var(--text3)" />
          <p style={{ marginTop: 20, fontSize: 16 }}>Você ainda não realizou nenhum pedido.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {orders.map(order => (
            <div key={order._id} className="card" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <div>
                  <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>Pedido #{order._id.slice(-8).toUpperCase()}</p>
                  <p style={{ fontSize: 13, color: "var(--text2)" }}>{formatDate(order.createdAt)}</p>
                </div>
                <span className="badge" style={{ background: `${statusColor[order.status]}20`, color: statusColor[order.status], border: `1px solid ${statusColor[order.status]}40`, padding: "4px 12px" }}>
                  {statusLabel[order.status]}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {order.items.map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14 }}>
                    <div style={{ width: 40, height: 40, background: "var(--bg2)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {item.image ? <img src={item.image} alt={item.name} style={{ maxWidth: "90%", maxHeight: "90%", objectFit: "contain" }} onError={e => e.currentTarget.style.display = "none"} /> : <Icon name="package" size={20} color="var(--text3)" />}
                    </div>
                    <span style={{ flex: 1, color: "var(--text2)" }}>{item.name}</span>
                    <span style={{ color: "var(--text3)" }}>x{item.quantity}</span>
                    <span style={{ fontFamily: "Rajdhani", fontWeight: 600 }}>{formatBRL(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: 12, alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "var(--text2)" }}>Pagamento: {order.paymentMethod?.toUpperCase()}</span>
                <span style={{ fontFamily: "Rajdhani", fontWeight: 700, fontSize: 18, color: "var(--cyan)" }}>{formatBRL(order.total)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PROFILE PAGE ─────────────────────────────────────────────────────────────
function ProfilePage() {
  const { user, setUser, addToast } = useApp();
  const [tab, setTab] = useState("info");
  const [form, setForm] = useState({ name: user.name, address: user.address || {} });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [showPw, setShowPw] = useState({ cur: false, new: false });
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const saveProfile = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const updated = await apiFetch("/users/profile", { method: "PUT", body: JSON.stringify({ name: form.name, address: form.address }) });
      setUser(updated); addToast("Perfil atualizado!");
    } catch (err) { addToast(err.message, "error"); }
    finally { setLoading(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) { addToast("As senhas não coincidem", "error"); return; }
    if (pwForm.newPassword.length < 6) { addToast("Senha mínimo 6 caracteres", "error"); return; }
    setLoading(true);
    try {
      await apiFetch("/users/password", { method: "PUT", body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }) });
      addToast("Senha alterada com sucesso!"); setPwForm({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err) { addToast(err.message, "error"); }
    finally { setLoading(false); }
  };

  const uploadAvatar = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const fd = new FormData(); fd.append("avatar", file);
    const token = localStorage.getItem("vg_token");
    try {
      const res = await fetch(`${API}/users/avatar`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setUser(p => ({ ...p, avatar: data.avatar })); addToast("Foto atualizada!");
    } catch (err) { addToast(err.message, "error"); }
  };

  const tabs = [{ id: "info", label: "Informações", icon: "user" }, { id: "senha", label: "Senha", icon: "lock" }];

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px" }}>
      <h1 style={{ fontFamily: "Rajdhani", fontSize: "2rem", fontWeight: 700, marginBottom: 32 }}>Meu Perfil</h1>
      {/* Avatar */}
      <div className="card" style={{ padding: 24, display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
        <div style={{ position: "relative" }}>
          {user.avatar
            ? <img src={user.avatar.startsWith("/uploads") ? `http://localhost:5000${user.avatar}` : user.avatar} alt="" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--cyan)" }} />
            : <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg,var(--cyan),var(--purple))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, color: "#fff", border: "2px solid var(--cyan)" }}>{getInitials(user.name)}</div>
          }
          <button onClick={() => fileRef.current?.click()} style={{ position: "absolute", bottom: 0, right: 0, background: "var(--cyan)", border: "none", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Icon name="camera" size={12} color="#0a0a0f" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={uploadAvatar} style={{ display: "none" }} />
        </div>
        <div>
          <p style={{ fontFamily: "Rajdhani", fontWeight: 700, fontSize: 20 }}>{user.name}</p>
          <p style={{ color: "var(--text2)", fontSize: 14 }}>CPF: {formatCPF(user.cpf)}</p>
          <span className="badge" style={{ background: user.role === "admin" ? "rgba(139,92,246,0.2)" : "rgba(0,195,255,0.1)", color: user.role === "admin" ? "var(--purple)" : "var(--cyan)", marginTop: 6, display: "inline-block" }}>{user.role.toUpperCase()}</span>
        </div>
      </div>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className="btn" style={{ background: tab === t.id ? "rgba(0,195,255,0.1)" : "var(--card)", border: `1px solid ${tab === t.id ? "var(--cyan)" : "var(--border)"}`, color: tab === t.id ? "var(--cyan)" : "var(--text2)", fontSize: 14 }}>
            <Icon name={t.icon} size={16} color="currentColor" />{t.label}
          </button>
        ))}
      </div>
      {tab === "info" && (
        <div className="card" style={{ padding: 24 }}>
          <form onSubmit={saveProfile} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 6 }}>Nome Completo</label>
              <input className="inp" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <h4 style={{ fontFamily: "Rajdhani", fontWeight: 700, marginTop: 8, color: "var(--text2)", fontSize: 14, textTransform: "uppercase", letterSpacing: 1 }}>Endereço para Entrega</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[["cep", "CEP"], ["street", "Rua/Avenida"], ["number", "Número"], ["complement", "Complemento"], ["neighborhood", "Bairro"], ["city", "Cidade"], ["state", "Estado"]].map(([f, l]) => (
                <div key={f} style={f === "street" || f === "neighborhood" ? { gridColumn: "1/-1" } : {}}>
                  <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 5 }}>{l}</label>
                  <input className="inp" placeholder={l} value={form.address[f] || ""} onChange={e => setForm(p => ({ ...p, address: { ...p.address, [f]: e.target.value } }))} />
                </div>
              ))}
            </div>
            <button type="submit" className="btn btn-primary" style={{ justifyContent: "center" }} disabled={loading}>
              {loading ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : "Salvar Alterações"}
            </button>
          </form>
        </div>
      )}
      {tab === "senha" && (
        <div className="card" style={{ padding: 24 }}>
          <form onSubmit={changePassword} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[["currentPassword", "Senha Atual", "cur"], ["newPassword", "Nova Senha", "new"], ["confirm", "Confirmar Nova Senha", "new"]].map(([f, l, sw]) => (
              <div key={f} style={{ position: "relative" }}>
                <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 6 }}>{l}</label>
                <input className="inp" type={showPw[sw] ? "text" : "password"} required placeholder="••••••••" value={pwForm[f]} onChange={e => setPwForm(p => ({ ...p, [f]: e.target.value }))} style={{ paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPw(p => ({ ...p, [sw]: !p[sw] }))} style={{ position: "absolute", right: 12, top: "60%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}>
                  <Icon name={showPw[sw] ? "eyeOff" : "eye"} size={16} color="var(--text3)" />
                </button>
              </div>
            ))}
            <button type="submit" className="btn btn-primary" style={{ justifyContent: "center" }} disabled={loading}>
              {loading ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : "Alterar Senha"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN PAGE ───────────────────────────────────────────────────────────────
function AdminPage() {
  const { addToast } = useApp();
  const [tab, setTab] = useState("stats");
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [productForm, setProductForm] = useState({ name: "", description: "", price: "", originalPrice: "", category: "console", stock: "", featured: false, badge: "", image: "" });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "stats") { const s = await apiFetch("/admin/stats"); setStats(s); }
      else if (tab === "products") { const d = await apiFetch("/products?limit=100"); setProducts(d.products); }
      else if (tab === "orders") { const o = await apiFetch("/orders"); setOrders(o); }
      else if (tab === "users") { const u = await apiFetch("/admin/users"); setUsers(u); }
    } catch (err) { addToast(err.message, "error"); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { loadData(); }, [loadData]);

  const deleteProduct = async (id) => {
    if (!window.confirm("Remover produto?")) return;
    try { await apiFetch(`/products/${id}`, { method: "DELETE" }); addToast("Produto removido!"); loadData(); }
    catch (err) { addToast(err.message, "error"); }
  };

  const openEdit = (p) => { setEditProduct(p); setProductForm({ name: p.name, description: p.description, price: p.price, originalPrice: p.originalPrice || "", category: p.category, stock: p.stock, featured: p.featured, badge: p.badge || "", image: p.image || "" }); setShowForm(true); };
  const openNew = () => { setEditProduct(null); setProductForm({ name: "", description: "", price: "", originalPrice: "", category: "console", stock: "", featured: false, badge: "", image: "" }); setShowForm(true); };

  const saveProduct = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const body = { ...productForm, price: Number(productForm.price), originalPrice: Number(productForm.originalPrice) || 0, stock: Number(productForm.stock) };
      if (editProduct) await apiFetch(`/products/${editProduct._id}`, { method: "PUT", body: JSON.stringify(body) });
      else await apiFetch("/products", { method: "POST", body: JSON.stringify(body) });
      addToast(editProduct ? "Produto atualizado!" : "Produto criado!"); setShowForm(false); loadData();
    } catch (err) { addToast(err.message, "error"); }
    finally { setLoading(false); }
  };

  const updateOrderStatus = async (id, status) => {
    try { await apiFetch(`/orders/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }); addToast("Status atualizado!"); loadData(); }
    catch (err) { addToast(err.message, "error"); }
  };

  const statCards = stats ? [
    { label: "Clientes", value: stats.totalUsers, icon: "user", color: "var(--cyan)" },
    { label: "Produtos", value: stats.totalProducts, icon: "package", color: "var(--purple)" },
    { label: "Pedidos", value: stats.totalOrders, icon: "history", color: "var(--cyan2)" },
    { label: "Receita Total", value: formatBRL(stats.revenue), icon: "star", color: "var(--yellow)" },
  ] : [];

  const adminTabs = [{ id: "stats", label: "Dashboard", icon: "zap" }, { id: "products", label: "Produtos", icon: "package" }, { id: "orders", label: "Pedidos", icon: "history" }, { id: "users", label: "Usuários", icon: "user" }];

  return (
    <div style={{ maxWidth: 1300, margin: "0 auto", padding: "40px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
        <Icon name="shield" size={28} color="var(--purple)" />
        <h1 style={{ fontFamily: "Rajdhani", fontSize: "2rem", fontWeight: 700 }}>Painel Administrativo</h1>
      </div>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 32, borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
        {adminTabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className="btn"
            style={{ background: tab === t.id ? "rgba(139,92,246,0.15)" : "none", border: `1px solid ${tab === t.id ? "var(--purple)" : "transparent"}`, color: tab === t.id ? "var(--purple)" : "var(--text2)", fontSize: 14 }}>
            <Icon name={t.icon} size={16} color="currentColor" />{t.label}
          </button>
        ))}
      </div>
      {loading && !showForm && <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><div className="spinner" /></div>}
      {/* Stats */}
      {!loading && tab === "stats" && stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 20 }}>
          {statCards.map((c, i) => (
            <div key={i} className="card neon-border" style={{ padding: 24, textAlign: "center" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: `${c.color}18`, border: `1px solid ${c.color}40`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <Icon name={c.icon} size={24} color={c.color} />
              </div>
              <p style={{ fontFamily: "Rajdhani", fontWeight: 700, fontSize: 28, color: c.color }}>{c.value}</p>
              <p style={{ color: "var(--text2)", fontSize: 13 }}>{c.label}</p>
            </div>
          ))}
        </div>
      )}
      {/* Products */}
      {!loading && tab === "products" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
            <button onClick={openNew} className="btn btn-primary"><Icon name="plus" size={16} color="#fff" /> Novo Produto</button>
          </div>
          {showForm && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <div className="card" style={{ width: "100%", maxWidth: 640, maxHeight: "90vh", overflow: "auto", padding: 32 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                  <h3 style={{ fontFamily: "Rajdhani", fontSize: "1.3rem", fontWeight: 700 }}>{editProduct ? "Editar Produto" : "Novo Produto"}</h3>
                  <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: "var(--text2)", cursor: "pointer" }}><Icon name="x" size={20} /></button>
                </div>
                <form onSubmit={saveProduct} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[["name", "Nome", "text"], ["description", "Descrição", "text"], ["image", "URL da Imagem", "text"], ["price", "Preço (R$)", "number"], ["originalPrice", "Preço Original (R$)", "number"], ["stock", "Estoque", "number"], ["badge", "Badge (ex: Novo)", "text"]].map(([f, l, t]) => (
                    <div key={f}>
                      <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 5 }}>{l}</label>
                      <input className="inp" type={t} required={["name", "description", "price", "stock"].includes(f)} placeholder={l} value={productForm[f]} onChange={e => setProductForm(p => ({ ...p, [f]: e.target.value }))} min={t === "number" ? 0 : undefined} step={f === "price" || f === "originalPrice" ? "0.01" : undefined} />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 5 }}>Categoria</label>
                    <select className="inp" value={productForm.category} onChange={e => setProductForm(p => ({ ...p, category: e.target.value }))}>
                      {["console","jogo","acessorio","pc","cadeira","periférico","outros"].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14 }}>
                    <input type="checkbox" checked={productForm.featured} onChange={e => setProductForm(p => ({ ...p, featured: e.target.checked }))} />
                    Produto em Destaque
                  </label>
                  <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                    <button type="button" onClick={() => setShowForm(false)} className="btn btn-outline" style={{ flex: 1, justifyContent: "center" }}>Cancelar</button>
                    <button type="submit" className="btn btn-primary" style={{ flex: 2, justifyContent: "center" }} disabled={loading}>
                      {loading ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : (editProduct ? "Salvar" : "Criar Produto")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {products.map(p => (
              <div key={p._id} className="card" style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 50, height: 50, background: "var(--bg2)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {p.image ? <img src={p.image} alt={p.name} style={{ maxWidth: "90%", maxHeight: "90%", objectFit: "contain" }} onError={e => e.currentTarget.style.display = "none"} /> : <Icon name="package" size={24} color="var(--text3)" />}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</p>
                  <p style={{ fontSize: 12, color: "var(--text2)" }}>{p.category} • Estoque: {p.stock}</p>
                </div>
                <p style={{ fontFamily: "Rajdhani", fontWeight: 700, color: "var(--cyan)", fontSize: 16 }}>{formatBRL(p.price)}</p>
                {p.featured && <span className="badge" style={{ background: "rgba(0,195,255,0.1)", color: "var(--cyan)", border: "1px solid var(--border2)" }}>Destaque</span>}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => openEdit(p)} className="btn btn-outline" style={{ padding: "6px 12px", fontSize: 13 }}><Icon name="edit" size={14} /></button>
                  <button onClick={() => deleteProduct(p._id)} className="btn btn-danger" style={{ padding: "6px 12px", fontSize: 13 }}><Icon name="trash" size={14} color="#fff" /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {/* Orders */}
      {!loading && tab === "orders" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {orders.map(o => {
            const sc = { pendente: "#ffd700", pago: "#00e5a0", enviado: "#00c3ff", entregue: "#8b5cf6", cancelado: "#ff4d6d" };
            return (
              <div key={o._id} className="card" style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700 }}>#{o._id.slice(-8).toUpperCase()}</p>
                    <p style={{ fontSize: 12, color: "var(--text2)" }}>{o.user?.name} • CPF: {formatCPF(o.user?.cpf || "00000000000")}</p>
                    <p style={{ fontSize: 12, color: "var(--text3)" }}>{formatDate(o.createdAt)}</p>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontFamily: "Rajdhani", fontWeight: 700, fontSize: 18, color: "var(--cyan)" }}>{formatBRL(o.total)}</span>
                    <select className="inp" value={o.status} onChange={e => updateOrderStatus(o._id, e.target.value)} style={{ width: 130, padding: "6px 10px", fontSize: 13, color: sc[o.status], borderColor: sc[o.status] + "60" }}>
                      {["pendente","pago","enviado","entregue","cancelado"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: "var(--text2)" }}>
                  {o.items.map((item, i) => <span key={i}>{i > 0 && ", "}{item.name} x{item.quantity}</span>)}
                </div>
              </div>
            );
          })}
          {orders.length === 0 && <div style={{ textAlign: "center", padding: 60, color: "var(--text2)" }}>Nenhum pedido encontrado.</div>}
        </div>
      )}
      {/* Users */}
      {!loading && tab === "users" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {users.map(u => (
            <div key={u._id} className="card" style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,var(--cyan),var(--purple))", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", flexShrink: 0 }}>{getInitials(u.name)}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</p>
                <p style={{ fontSize: 12, color: "var(--text2)" }}>CPF: {formatCPF(u.cpf)}</p>
              </div>
              <span className="badge" style={{ background: u.role === "admin" ? "rgba(139,92,246,0.15)" : "rgba(0,195,255,0.1)", color: u.role === "admin" ? "var(--purple)" : "var(--cyan)" }}>{u.role}</span>
              <p style={{ fontSize: 12, color: "var(--text3)" }}>{formatDate(u.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AUTH MODAL ───────────────────────────────────────────────────────────────
function AuthModal({ mode, setMode, onClose }) {
  const { setUser, addToast } = useApp();
  const [form, setForm] = useState({ name: "", cpf: "", password: "", confirmPassword: "", address: { street: "", number: "", complement: "", neighborhood: "", city: "", state: "", cep: "" } });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [step, setStep] = useState(1);

  const handleCPF = (v) => {
    const n = v.replace(/\D/g, "").slice(0, 11);
    setForm(p => ({ ...p, cpf: n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4").replace(/(\d{3})(\d{3})(\d{3})$/, "$1.$2.$3") }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (mode === "register" && step === 1) { setStep(2); return; }
    if (mode === "register" && form.password !== form.confirmPassword) { addToast("Senhas não coincidem", "error"); return; }
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const body = mode === "login" ? { cpf: form.cpf, password: form.password } : { name: form.name, cpf: form.cpf, password: form.password, address: form.address };
      const data = await apiFetch(endpoint, { method: "POST", body: JSON.stringify(body) });
      localStorage.setItem("vg_token", data.token);
      setUser(data.user); addToast(`Bem-vindo, ${data.user.name}!`); onClose();
    } catch (err) { addToast(err.message, "error"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 5000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card" style={{ width: "100%", maxWidth: 460, maxHeight: "90vh", overflow: "auto", padding: 36, position: "relative", border: "1px solid var(--border2)" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "var(--text2)", cursor: "pointer" }}><Icon name="x" size={20} /></button>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, background: "linear-gradient(135deg,var(--cyan),var(--purple))", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", animation: "glow 3s infinite" }}>
            <Icon name="gamepad" size={26} color="#fff" />
          </div>
          <h2 style={{ fontFamily: "Rajdhani", fontSize: "1.6rem", fontWeight: 700 }}>{mode === "login" ? "Entrar" : step === 1 ? "Criar Conta" : "Endereço de Entrega"}</h2>
          {mode === "register" && step === 2 && <p style={{ color: "var(--text2)", fontSize: 13, marginTop: 6 }}>Informe seu endereço para entregas</p>}
        </div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {mode === "login" && (
            <>
              <div><label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 6 }}>CPF</label>
                <input className="inp" required placeholder="000.000.000-00" value={form.cpf} onChange={e => handleCPF(e.target.value)} /></div>
              <div style={{ position: "relative" }}>
                <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 6 }}>Senha</label>
                <input className="inp" type={showPw ? "text" : "password"} required placeholder="••••••••" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} style={{ paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: "60%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><Icon name={showPw ? "eyeOff" : "eye"} size={16} /></button>
              </div>
            </>
          )}
          {mode === "register" && step === 1 && (
            <>
              <div><label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 6 }}>Nome Completo</label>
                <input className="inp" required placeholder="Seu nome completo" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div><label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 6 }}>CPF</label>
                <input className="inp" required placeholder="000.000.000-00" value={form.cpf} onChange={e => handleCPF(e.target.value)} /></div>
              <div style={{ position: "relative" }}>
                <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 6 }}>Senha</label>
                <input className="inp" type={showPw ? "text" : "password"} required placeholder="Mínimo 6 caracteres" minLength={6} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} style={{ paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: "60%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><Icon name={showPw ? "eyeOff" : "eye"} size={16} /></button>
              </div>
              <div><label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 6 }}>Confirmar Senha</label>
                <input className="inp" type="password" required placeholder="Repita a senha" value={form.confirmPassword} onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))} /></div>
            </>
          )}
          {mode === "register" && step === 2 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[["cep", "CEP"], ["street", "Rua/Avenida"], ["number", "Número"], ["complement", "Complemento"], ["neighborhood", "Bairro"], ["city", "Cidade"], ["state", "Estado"]].map(([f, l]) => (
                <div key={f} style={f === "street" || f === "neighborhood" ? { gridColumn: "1/-1" } : {}}>
                  <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 5 }}>{l}</label>
                  <input className="inp" placeholder={l} value={form.address[f] || ""} onChange={e => setForm(p => ({ ...p, address: { ...p.address, [f]: e.target.value } }))} required={["street", "number", "city", "state", "cep"].includes(f)} />
                </div>
              ))}
            </div>
          )}
          <button type="submit" className="btn btn-primary" style={{ justifyContent: "center", padding: "14px", fontSize: 15, marginTop: 6 }} disabled={loading}>
            {loading ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : mode === "login" ? "Entrar" : step === 1 ? "Próximo →" : "Criar Conta"}
          </button>
          {mode === "register" && step === 2 && (
            <button type="button" onClick={() => setStep(1)} className="btn btn-outline" style={{ justifyContent: "center" }}>← Voltar</button>
          )}
        </form>
        <p style={{ textAlign: "center", marginTop: 20, color: "var(--text2)", fontSize: 14 }}>
          {mode === "login" ? "Não tem conta?" : "Já tem conta?"}
          <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setStep(1); }} style={{ background: "none", border: "none", color: "var(--cyan)", cursor: "pointer", marginLeft: 6, fontWeight: 600, fontSize: 14 }}>
            {mode === "login" ? "Cadastre-se" : "Entrar"}
          </button>
        </p>
        {mode === "login" && (
          <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(0,195,255,0.05)", border: "1px solid var(--border)", borderRadius: 8 }}>
            <p style={{ fontSize: 12, color: "var(--text2)", textAlign: "center" }}>
              🎮 <strong style={{ color: "var(--cyan)" }}>Admin:</strong> CPF <code>000.000.000-00</code> | Senha <code>admin123</code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────
function Footer({ setPage }) {
  return (
    <footer style={{ background: "var(--bg2)", borderTop: "1px solid var(--border)", padding: "48px 20px 24px" }}>
      <div style={{ maxWidth: 1300, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40, marginBottom: 40 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,var(--cyan),var(--purple))", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="gamepad" size={20} color="#fff" />
              </div>
              <span style={{ fontFamily: "Rajdhani", fontWeight: 700, fontSize: 20, background: "linear-gradient(135deg,var(--cyan),var(--purple))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>VAGALON GAMES</span>
            </div>
            <p style={{ color: "var(--text2)", fontSize: 14, lineHeight: 1.7, maxWidth: 280 }}>Sua loja gamer de confiança. Os melhores consoles, jogos e acessórios com os melhores preços.</p>
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              {["instagram", "mail", "phone"].map(i => (
                <button key={i} style={{ width: 36, height: 36, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "var(--cyan)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                  <Icon name={i} size={16} color="var(--text2)" />
                </button>
              ))}
            </div>
          </div>
          {[
            ["Loja", [["home", "Início"], ["produtos", "Produtos"], ["carrinho", "Carrinho"]]],
            ["Conta", [["perfil", "Meu Perfil"], ["historico", "Histórico"], ["perfil", "Configurações"]]],
            ["Suporte", [["", "FAQ"], ["", "Trocas e Devoluções"], ["", "Rastreamento"]]],
          ].map(([title, links]) => (
            <div key={title}>
              <p style={{ fontFamily: "Rajdhani", fontWeight: 700, fontSize: 16, marginBottom: 16, color: "var(--text)" }}>{title}</p>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {links.map(([page, label]) => (
                  <li key={label}>
                    <button onClick={() => page && setPage(page)} style={{ background: "none", border: "none", color: "var(--text2)", fontSize: 14, cursor: "pointer", padding: 0, transition: "color 0.2s" }}
                      onMouseEnter={e => e.currentTarget.style.color = "var(--cyan)"}
                      onMouseLeave={e => e.currentTarget.style.color = "var(--text2)"}>
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <p style={{ fontSize: 13, color: "var(--text3)" }}>© {new Date().getFullYear()} Vagalon Games. Todos os direitos reservados.</p>
          <p style={{ fontSize: 13, color: "var(--text3)" }}>CNPJ: 00.000.000/0001-00</p>
        </div>
      </div>
    </footer>
  );
}