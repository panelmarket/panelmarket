import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================================================
   ÜRÜNLER
========================================================= */

const products = [
  {
    id: "admin-panel",
    name: "Profesyonel Admin Paneli",
    category: "Admin Paneli",
    description: "Modern ve güçlü yönetim paneli.",
    price: 1499,
    oldPrice: 1999,
    badge: "ÇOK SATAN",
    delivery: "Hemen",
    update: "1 Yıl",
    support: "30 Gün"
  },
  {
    id: "ecommerce-panel",
    name: "E-Ticaret Yönetim Paneli",
    category: "E-Ticaret",
    description: "E-ticaret sitenizi tek panelden yönetin.",
    price: 2799,
    oldPrice: 3499,
    badge: "%20 İNDİRİM",
    delivery: "Hemen",
    update: "1 Yıl",
    support: "60 Gün"
  },
  {
    id: "company-panel",
    name: "Firma Yönetim Paneli",
    category: "İşletme",
    description: "Firmalar için profesyonel yönetim sistemi.",
    price: 1799,
    oldPrice: null,
    badge: "",
    delivery: "Hemen",
    update: "6 Ay",
    support: "30 Gün"
  },
  {
    id: "finance-panel",
    name: "Finans & Muhasebe Paneli",
    category: "Finans",
    description: "Finans ve muhasebe işlemlerini yönetin.",
    price: 2999,
    oldPrice: null,
    badge: "YENİ",
    delivery: "24 Saat",
    update: "1 Yıl",
    support: "60 Gün"
  },
  {
    id: "support-panel",
    name: "Müşteri Destek Paneli",
    category: "Destek",
    description: "Müşteri destek süreçlerinizi yönetin.",
    price: 1899,
    oldPrice: 2199,
    badge: "",
    delivery: "Hemen",
    update: "1 Yıl",
    support: "90 Gün"
  },
  {
    id: "stock-panel",
    name: "Stok & Sipariş Paneli",
    category: "İşletme",
    description: "Stok ve siparişlerinizi kolayca yönetin.",
    price: 1999,
    oldPrice: null,
    badge: "",
    delivery: "Hemen",
    update: "1 Yıl",
    support: "30 Gün"
  }
];

/* =========================================================
   LİSANSLAR
========================================================= */

const licenses = {
  "1-site": {
    name: "1 Site",
    multiplier: 1
  },

  "3-site": {
    name: "3 Site",
    multiplier: 1.667
  },

  "unlimited": {
    name: "Sınırsız Site",
    multiplier: 3.334
  }
};

/* =========================================================
   KULLANICILAR
========================================================= */

/*
  Şimdilik RAM üzerinde çalışıyor.

  Server yeniden başlatılırsa kullanıcılar sıfırlanır.
  Kalıcı veritabanı sonraki aşamada eklenebilir.
*/

const users = [];

const sessions = new Map();

/* =========================================================
   DEMO HESAP
========================================================= */

const demoUser = {
  id: "demo-user",
  name: "Demo Kullanıcı",
  email: "demo@panelmarket.com",
  passwordHash: null,
  passwordSalt: null,
  balance: 5000,
  transactions: [],
  createdAt: new Date().toISOString()
};

users.push(demoUser);

/* =========================================================
   SİPARİŞLER
========================================================= */

const orders = [];

/* =========================================================
   YARDIMCI FONKSİYONLAR
========================================================= */

function findProduct(id) {
  return products.find(p => p.id === id);
}

function findUserByEmail(email) {
  return users.find(
    user => user.email.toLowerCase() === String(email).toLowerCase()
  );
}

function findUserById(id) {
  return users.find(user => user.id === id);
}

function calculatePrice(product, licenseId) {
  const license = licenses[licenseId];

  if (!license) {
    throw new Error("Geçersiz lisans.");
  }

  return Math.round(product.price * license.multiplier * 100) / 100;
}

function createOrderNumber() {
  return (
    "PM-" +
    new Date().getFullYear() +
    "-" +
    crypto.randomBytes(4).toString("hex").toUpperCase()
  );
}

function createLicenseKey() {
  return (
    "PMK-" +
    crypto.randomBytes(12).toString("hex").toUpperCase()
  );
}

function createToken() {
  return crypto.randomBytes(32).toString("hex");
}

/* =========================================================
   ŞİFRE HASH
========================================================= */

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(
    password,
    salt,
    64
  ).toString("hex");

  return {
    hash,
    salt
  };
}

function verifyPassword(password, user) {
  if (!user.passwordHash || !user.passwordSalt) {
    return false;
  }

  const result = crypto.scryptSync(
    password,
    user.passwordSalt,
    64
  );

  const stored = Buffer.from(user.passwordHash, "hex");

  if (result.length !== stored.length) {
    return false;
  }

  return crypto.timingSafeEqual(result, stored);
}

/* =========================================================
   COOKIE OKUMA
========================================================= */

function getCookies(req) {
  const header = req.headers.cookie;

  if (!header) {
    return {};
  }

  const cookies = {};

  header.split(";").forEach(item => {
    const index = item.indexOf("=");

    if (index === -1) {
      return;
    }

    const key = item.slice(0, index).trim();
    const value = item.slice(index + 1).trim();

    cookies[key] = decodeURIComponent(value);
  });

  return cookies;
}

/* =========================================================
   OTURUM BUL
========================================================= */

function getCurrentUser(req) {
  const authorization = req.headers.authorization || "";

  let token = "";

  if (authorization.startsWith("Bearer ")) {
    token = authorization.slice(7).trim();
  }

  if (!token) {
    const cookies = getCookies(req);
    token = cookies.panelmarket_token || "";
  }

  if (!token) {
    return null;
  }

  const userId = sessions.get(token);

  if (!userId) {
    return null;
  }

  return findUserById(userId) || null;
}

/* =========================================================
   AUTH MIDDLEWARE
========================================================= */

function requireAuth(req, res, next) {
  const user = getCurrentUser(req);

  if (!user) {
    return res.status(401).json({
      error: "Oturum gerekli.",
      loginRequired: true
    });
  }

  req.user = user;
  next();
}

/* =========================================================
   API - ÜRÜNLER
========================================================= */

app.get("/api/products", (req, res) => {
  res.json(products);
});

app.get("/api/products/:id", (req, res) => {
  const product = findProduct(req.params.id);

  if (!product) {
    return res.status(404).json({
      error: "Ürün bulunamadı."
    });
  }

  const prices = {};

  for (const [id, license] of Object.entries(licenses)) {
    prices[id] = {
      name: license.name,
      price: calculatePrice(product, id)
    };
  }

  res.json({
    ...product,
    licenses: prices
  });
});

/* =========================================================
   API - KAYIT
========================================================= */

app.post("/api/register", (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!name) {
      return res.status(400).json({
        error: "Ad soyad alanı zorunludur."
      });
    }

    if (!email) {
      return res.status(400).json({
        error: "E-posta adresi zorunludur."
      });
    }

    if (!email.includes("@")) {
      return res.status(400).json({
        error: "Geçerli bir e-posta adresi girin."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: "Şifre en az 8 karakter olmalıdır."
      });
    }

    if (!/[A-Za-z]/.test(password)) {
      return res.status(400).json({
        error: "Şifre en az bir harf içermelidir."
      });
    }

    if (!/[0-9]/.test(password)) {
      return res.status(400).json({
        error: "Şifre en az bir rakam içermelidir."
      });
    }

    if (findUserByEmail(email)) {
      return res.status(409).json({
        error: "Bu e-posta adresi zaten kayıtlı."
      });
    }

    const passwordData = hashPassword(password);

    const user = {
      id: crypto.randomUUID(),
      name,
      email,
      passwordHash: passwordData.hash,
      passwordSalt: passwordData.salt,
      balance: 0,
      transactions: [],
      createdAt: new Date().toISOString()
    };

    users.push(user);

    const token = createToken();

    sessions.set(token, user.id);

    res.setHeader(
      "Set-Cookie",
      `panelmarket_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax`
    );

    res.status(201).json({
      success: true,

      token,

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        balance: user.balance
      }
    });

  } catch (error) {
    res.status(500).json({
      error: "Kayıt sırasında bir hata oluştu."
    });
  }
});

/* =========================================================
   API - GİRİŞ
========================================================= */

app.post("/api/login", (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        error: "E-posta ve şifre zorunludur."
      });
    }

    const user = findUserByEmail(email);

    if (!user) {
      return res.status(401).json({
        error: "E-posta veya şifre hatalı."
      });
    }

    /*
      Demo hesabın eski sistemle uyumlu olması için
      ilk girişte şifre atanabilir.
    */

    if (user === demoUser && !user.passwordHash) {
      /*
        Demo hesap:
        demo@panelmarket.com
        Şifre: 12345678
      */

      if (password !== "12345678") {
        return res.status(401).json({
          error: "E-posta veya şifre hatalı."
        });
      }

      const passwordData = hashPassword(password);

      user.passwordHash = passwordData.hash;
      user.passwordSalt = passwordData.salt;
    }

    if (!verifyPassword(password, user)) {
      return res.status(401).json({
        error: "E-posta veya şifre hatalı."
      });
    }

    const token = createToken();

    sessions.set(token, user.id);

    res.setHeader(
      "Set-Cookie",
      `panelmarket_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax`
    );

    res.json({
      success: true,

      token,

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        balance: user.balance
      }
    });

  } catch (error) {
    res.status(500).json({
      error: "Giriş sırasında bir hata oluştu."
    });
  }
});

/* =========================================================
   API - ÇIKIŞ
========================================================= */

app.post("/api/logout", (req, res) => {
  const cookies = getCookies(req);
  const token = cookies.panelmarket_token;

  if (token) {
    sessions.delete(token);
  }

  res.setHeader(
    "Set-Cookie",
    "panelmarket_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax"
  );

  res.json({
    success: true
  });
});

/* =========================================================
   API - OTURUM KONTROL
========================================================= */

app.get("/api/auth/me", requireAuth, (req, res) => {
  const user = req.user;

  res.json({
    authenticated: true,

    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      balance: user.balance
    }
  });
});

/* =========================================================
   API - HESAP
========================================================= */

app.get("/api/account", requireAuth, (req, res) => {
  const user = req.user;

  const userOrders = orders.filter(
    order => order.userId === user.id
  );

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    balance: user.balance,
    orderCount: userOrders.length
  });
});

/* =========================================================
   API - BAKİYE YÜKLE
========================================================= */

app.post("/api/wallet/topup", requireAuth, (req, res) => {
  const user = req.user;

  const amount = Number(req.body.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({
      error: "Geçerli bir bakiye miktarı girin."
    });
  }

  if (amount > 1000000) {
    return res.status(400).json({
      error: "Tek işlemde en fazla 1.000.000 TL yüklenebilir."
    });
  }

  user.balance =
    Math.round((user.balance + amount) * 100) / 100;

  user.transactions.unshift({
    id: crypto.randomUUID(),
    type: "credit",
    amount,
    note: "Bakiye yükleme",
    date: new Date().toISOString()
  });

  res.json({
    success: true,
    balance: user.balance
  });
});

/* =========================================================
   API - SİPARİŞ OLUŞTUR
========================================================= */

app.post("/api/orders", requireAuth, (req, res) => {
  try {
    const user = req.user;

    const productId = String(req.body.productId || "");
    const licenseId = String(req.body.licenseId || "");

    const product = findProduct(productId);

    if (!product) {
      return res.status(404).json({
        error: "Ürün bulunamadı."
      });
    }

    if (!licenses[licenseId]) {
      return res.status(400).json({
        error: "Lisans seçimi geçersiz."
      });
    }

    const total = calculatePrice(
      product,
      licenseId
    );

    if (user.balance < total) {
      return res.status(400).json({
        error: "Yetersiz bakiye."
      });
    }

    user.balance =
      Math.round((user.balance - total) * 100) / 100;

    const order = {
      id: crypto.randomUUID(),

      userId: user.id,

      orderNumber: createOrderNumber(),

      productId: product.id,

      productName: product.name,

      licenseId,

      licenseName: licenses[licenseId].name,

      amount: total,

      status: "Ödeme Alındı",

      deliveryStatus: "Teslim Edilebilir",

      licenseKey: createLicenseKey(),

      createdAt: new Date().toISOString()
    };

    orders.unshift(order);

    user.transactions.unshift({
      id: crypto.randomUUID(),
      type: "debit",
      amount: total,
      note: `${product.name} satın alımı`,
      date: new Date().toISOString()
    });

    res.json({
      success: true,
      order,
      balance: user.balance
    });

  } catch (error) {
    res.status(500).json({
      error: error.message || "Sipariş oluşturulamadı."
    });
  }
});

/* =========================================================
   API - KULLANICININ SİPARİŞLERİ
========================================================= */

app.get("/api/orders", requireAuth, (req, res) => {
  const userOrders = orders.filter(
    order => order.userId === req.user.id
  );

  res.json(userOrders);
});

/* =========================================================
   API - TEK SİPARİŞ
========================================================= */

app.get("/api/orders/:id", requireAuth, (req, res) => {
  const order =
    orders.find(
      o =>
        o.userId === req.user.id &&
        o.id === req.params.id
    ) ||
    orders.find(
      o =>
        o.userId === req.user.id &&
        o.orderNumber === req.params.id
    );

  if (!order) {
    return res.status(404).json({
      error: "Sipariş bulunamadı."
    });
  }

  res.json(order);
});

/* =========================================================
   API - İŞLEM GEÇMİŞİ
========================================================= */

app.get(
  "/api/account/transactions",
  requireAuth,
  (req, res) => {
    res.json(req.user.transactions);
  }
);

/* =========================================================
   API - HESAP BİLGİSİ GÜNCELLE
========================================================= */

app.put("/api/account", requireAuth, (req, res) => {
  const user = req.user;

  const name = String(
    req.body.name || ""
  ).trim();

  if (name) {
    user.name = name;
  }

  res.json({
    success: true,

    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      balance: user.balance
    }
  });
});

/* =========================================================
   API - ŞİFRE DEĞİŞTİR
========================================================= */

app.post(
  "/api/account/password",
  requireAuth,
  (req, res) => {
    const user = req.user;

    const oldPassword =
      String(req.body.oldPassword || "");

    const newPassword =
      String(req.body.newPassword || "");

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        error: "Eski ve yeni şifre zorunludur."
      });
    }

    if (!verifyPassword(oldPassword, user)) {
      return res.status(401).json({
        error: "Mevcut şifre hatalı."
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: "Yeni şifre en az 8 karakter olmalıdır."
      });
    }

    const passwordData =
      hashPassword(newPassword);

    user.passwordHash =
      passwordData.hash;

    user.passwordSalt =
      passwordData.salt;

    res.json({
      success: true,
      message: "Şifre değiştirildi."
    });
  }
);

/* =========================================================
   SAĞLIK
========================================================= */

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "PanelMarket"
  });
});

/* =========================================================
   STATİK DOSYALAR
========================================================= */

app.use(
  express.static(__dirname, {
    extensions: ["html"]
  })
);

/* =========================================================
   SAYFA YÖNLENDİRMELERİ
========================================================= */

const pages = [
  "index",
  "urun",
  "sepet",
  "odeme",
  "siparislerim",
  "hesabim",
  "teslimat",
  "login",
  "register"
];

for (const page of pages) {
  app.get(`/${page}.html`, (req, res) => {
    res.sendFile(
      path.join(__dirname, `${page}.html`)
    );
  });
}

app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "index.html")
  );
});

/* =========================================================
   404
========================================================= */

app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({
      error: "API adresi bulunamadı."
    });
  }

  res.status(404).send(`
<!doctype html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>PanelMarket - 404</title>

<style>

*{
  box-sizing:border-box;
}

body{
  margin:0;
  min-height:100vh;
  display:grid;
  place-items:center;
  background:#070a0f;
  color:#fff;
  font-family:Inter,Arial,sans-serif;
}

.box{
  width:min(500px,92%);
  text-align:center;
  padding:45px;
  border:1px solid #1d2835;
  border-radius:22px;
  background:#0d131b;
  box-shadow:0 25px 80px rgba(0,0,0,.35);
}

h1{
  margin:0 0 12px;
}

p{
  color:#8995a7;
}

a{
  display:inline-block;
  margin-top:20px;
  padding:13px 22px;
  border-radius:10px;
  background:#1677ff;
  color:#fff;
  text-decoration:none;
  font-weight:800;
}

</style>
</head>

<body>

<div class="box">

<h1>Sayfa bulunamadı</h1>

<p>
Aradığınız PanelMarket sayfası mevcut değil.
</p>

<a href="/">
Ana Sayfaya Dön
</a>

</div>

</body>
</html>
  `);
});

/* =========================================================
   SERVER
========================================================= */

app.listen(PORT, () => {

  console.log("");

  console.log("=================================");
  console.log(" PanelMarket çalışıyor");
  console.log(` http://localhost:${PORT}`);
  console.log("=================================");

  console.log("");

});