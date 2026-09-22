import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("=================================");
  console.error("SUPABASE AYARLARI EKSİK");
  console.error("SUPABASE_URL:", !!SUPABASE_URL);
  console.error(
    "SUPABASE_SERVICE_ROLE_KEY:",
    !!SUPABASE_SERVICE_ROLE_KEY
  );
  console.error("=================================");
  process.exit(1);
}

console.log("SUPABASE URL:", SUPABASE_URL);

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

/* =========================================================
   EXPRESS
========================================================= */

app.use(express.json({ limit: "2mb" }));
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

const licenses = {
  "1-site": {
    name: "1 Site",
    multiplier: 1
  },
  "3-site": {
    name: "3 Site",
    multiplier: 1.667
  },
  unlimited: {
    name: "Sınırsız Site",
    multiplier: 3.334
  }
};

/* =========================================================
   YARDIMCI FONKSİYONLAR
========================================================= */

function findProduct(id) {
  return products.find((p) => p.id === id);
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
   ADMIN / SESSION AYARLARI
========================================================= */

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const DEMO_ADMIN_EMAIL = "demo@panelmarket.com";
const DEMO_ADMIN_PASSWORD = "12345678";

/*
  SUPABASE users tablosundaki gerçek admin ID
*/
const DEMO_ADMIN_ID =
  "36002d6d-f4d4-4c4a-a03f-56076c6bf6eb";

/* =========================================================
   SECURE TOKEN
========================================================= */

function createSecureToken(userId) {
  const payload = Buffer.from(
    JSON.stringify({
      userId: String(userId),
      createdAt: Date.now()
    })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

function verifySecureToken(token) {
  try {
    const parts = String(token || "").split(".");

    if (parts.length !== 2) {
      return null;
    }

    const [payload, signature] = parts;

    const expected = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(payload)
      .digest("base64url");

    const a = Buffer.from(signature);
    const b = Buffer.from(expected);

    if (a.length !== b.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(a, b)) {
      return null;
    }

    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );

    if (!decoded?.userId) {
      return null;
    }

    if (
      decoded.createdAt &&
      Date.now() - Number(decoded.createdAt) >
        30 * 24 * 60 * 60 * 1000
    ) {
      return null;
    }

    return decoded;
  } catch (error) {
    console.error("TOKEN VERIFY ERROR:", error);
    return null;
  }
}

/* =========================================================
   ŞİFRE
========================================================= */

function hashPassword(
  password,
  salt = crypto.randomBytes(16).toString("hex")
) {
  const hash = crypto
    .scryptSync(password, salt, 64)
    .toString("hex");

  return {
    hash,
    salt
  };
}

function verifyPassword(password, user) {
  if (
    !user?.password_hash ||
    !user?.password_salt
  ) {
    return false;
  }

  try {
    const result = crypto.scryptSync(
      password,
      user.password_salt,
      64
    );

    const stored = Buffer.from(
      user.password_hash,
      "hex"
    );

    if (result.length !== stored.length) {
      return false;
    }

    return crypto.timingSafeEqual(result, stored);
  } catch (error) {
    console.error("PASSWORD VERIFY ERROR:", error);
    return false;
  }
}

/* =========================================================
   COOKIE
========================================================= */

function getCookies(req) {
  const header = req.headers.cookie;

  if (!header) {
    return {};
  }

  const cookies = {};

  header.split(";").forEach((item) => {
    const index = item.indexOf("=");

    if (index === -1) {
      return;
    }

    const key = item.slice(0, index).trim();
    const value = item.slice(index + 1).trim();

    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
  });

  return cookies;
}

function getTokenFromRequest(req) {
  const authorization = String(
    req.headers.authorization || ""
  ).trim();

  if (authorization) {
    const match = authorization.match(
      /^Bearer\s+(.+)$/i
    );

    if (match?.[1]) {
      return String(match[1]).trim();
    }
  }

  return String(
    getCookies(req).panelmarket_token || ""
  ).trim();
}

function setSessionCookie(res, token) {
  const cookie = [
    `panelmarket_token=${encodeURIComponent(
      String(token)
    )}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=2592000"
  ];

  if (process.env.NODE_ENV === "production") {
    cookie.push("Secure");
  }

  res.setHeader(
    "Set-Cookie",
    cookie.join("; ")
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    "panelmarket_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
  );
}

/* =========================================================
   SUPABASE USER SORGULARI
========================================================= */

async function findUserByEmail(email) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (error) {
    console.error(
      "FIND USER BY EMAIL ERROR:",
      error
    );
    throw error;
  }

  return data;
}

async function findUserById(id) {
  if (!id) {
    return null;
  }

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(
      "FIND USER BY ID ERROR:",
      error
    );
    throw error;
  }

  return data;
}

/*
  Demo admin için gerçek ID üzerinden de kontrol.
  Böylece email sorgusunda bir problem olsa bile
  gerçek Supabase kaydı bulunabilir.
*/
async function findDemoAdmin() {
  let user = null;

  try {
    user = await findUserById(DEMO_ADMIN_ID);

    if (user) {
      console.log(
        "DEMO ADMIN ID İLE BULUNDU:",
        user.id,
        user.email
      );
      return user;
    }
  } catch (error) {
    console.error(
      "DEMO ADMIN ID SORGUSU HATASI:",
      error
    );
  }

  try {
    user = await findUserByEmail(
      DEMO_ADMIN_EMAIL
    );

    if (user) {
      console.log(
        "DEMO ADMIN EMAIL İLE BULUNDU:",
        user.id,
        user.email
      );
      return user;
    }
  } catch (error) {
    console.error(
      "DEMO ADMIN EMAIL SORGUSU HATASI:",
      error
    );
  }

  return null;
}

/* =========================================================
   SESSION
========================================================= */

async function getSessionFromRequest(req) {
  const token = getTokenFromRequest(req);

  if (!token) {
    return null;
  }

  try {
    const decoded = verifySecureToken(token);

    if (!decoded || !decoded.userId) {
      return null;
    }

    const user = await findUserById(
      decoded.userId
    );

    if (!user) {
      console.error(
        "SESSION USER NOT FOUND:",
        decoded.userId
      );

      return null;
    }

    return {
      token: token,
      session: {
        token: token,
        user_id: user.id,
        created_at: new Date(
          decoded.createdAt || Date.now()
        ).toISOString()
      },
      user: user
    };
  } catch (error) {
    console.error(
      "SESSION CHECK ERROR:",
      error
    );

    return null;
  }
}

async function getCurrentUser(req) {
  const auth = await getSessionFromRequest(req);

  return auth
    ? {
        user: auth.user,
        token: auth.token
      }
    : null;
}

/* =========================================================
   AUTH MIDDLEWARE
========================================================= */

async function requireAuth(req, res, next) {
  try {
    const auth = await getCurrentUser(req);

    if (!auth) {
      return res.status(401).json({
        ok: false,
        authenticated: false,
        error: "Oturum gerekli.",
        loginRequired: true
      });
    }

    req.user = auth.user;
    req.authToken = auth.token;

    next();
  } catch (error) {
    console.error("AUTH ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: "Oturum kontrolü başarısız."
    });
  }
}

async function requireAdmin(req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        ok: false,
        authenticated: false,
        error: "Admin girişi gerekli.",
        loginRequired: true
      });
    }

    const {
      data: adminUser,
      error
    } = await supabase
      .from("users")
      .select(
        "id,name,email,balance,is_admin,created_at"
      )
      .eq("id", req.user.id)
      .maybeSingle();

    if (error) {
      console.error(
        "ADMIN USER QUERY ERROR:",
        error
      );

      return res.status(500).json({
        ok: false,
        error: "Admin kontrolü yapılamadı.",
        detail: error.message
      });
    }

    if (!adminUser) {
      console.error(
        "ADMIN USER NOT FOUND:",
        req.user.id
      );

      return res.status(401).json({
        ok: false,
        authenticated: false,
        error: "Kullanıcı bulunamadı.",
        loginRequired: true
      });
    }

    if (adminUser.is_admin !== true) {
      return res.status(403).json({
        ok: false,
        authenticated: true,
        is_admin: false,
        isAdmin: false,
        error:
          "Bu hesap admin yetkisine sahip değil."
      });
    }

    req.adminUser = adminUser;

    next();
  } catch (error) {
    console.error(
      "ADMIN AUTH ERROR:",
      error
    );

    return res.status(500).json({
      ok: false,
      error: "Admin doğrulama hatası."
    });
  }
}

/* =========================================================
   PUBLIC USER
========================================================= */

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    balance: Number(user.balance || 0),
    isAdmin: user.is_admin === true,
    is_admin: user.is_admin === true
  };
}

/* =========================================================
   PRODUCTS API
========================================================= */

app.get("/api/products", (req, res) => {
  return res.json(products);
});

app.get("/api/products/:id", (req, res) => {
  const product = findProduct(req.params.id);

  if (!product) {
    return res.status(404).json({
      error: "Ürün bulunamadı."
    });
  }

  const prices = {};

  for (const [
    id,
    license
  ] of Object.entries(licenses)) {
    prices[id] = {
      name: license.name,
      price: calculatePrice(product, id)
    };
  }

  return res.json({
    ...product,
    licenses: prices
  });
});

/* =========================================================
   REGISTER
========================================================= */

app.post("/api/register", async (req, res) => {
  try {
    const name = String(
      req.body.name || ""
    ).trim();

    const email = String(
      req.body.email || ""
    )
      .trim()
      .toLowerCase();

    const password = String(
      req.body.password || ""
    );

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
        error:
          "Geçerli bir e-posta adresi girin."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error:
          "Şifre en az 8 karakter olmalıdır."
      });
    }

    if (!/[A-Za-z]/.test(password)) {
      return res.status(400).json({
        error:
          "Şifre en az bir harf içermelidir."
      });
    }

    if (!/[0-9]/.test(password)) {
      return res.status(400).json({
        error:
          "Şifre en az bir rakam içermelidir."
      });
    }

    if (await findUserByEmail(email)) {
      return res.status(409).json({
        error:
          "Bu e-posta adresi zaten kayıtlı."
      });
    }

    const passwordData =
      hashPassword(password);

    const {
      data: user,
      error
    } = await supabase
      .from("users")
      .insert({
        name,
        email,
        password_hash:
          passwordData.hash,
        password_salt:
          passwordData.salt,
        balance: 0,
        is_admin: false
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          error:
            "Bu e-posta adresi zaten kayıtlı."
        });
      }

      throw error;
    }

    const token = createSecureToken(user.id);

    setSessionCookie(res, token);

    return res.status(201).json({
      ok: true,
      success: true,
      authenticated: true,
      token,
      user: publicUser(user)
    });
  } catch (error) {
    console.error(
      "REGISTER ERROR:",
      error
    );

    return res.status(500).json({
      error:
        "Kayıt sırasında bir hata oluştu."
    });
  }
});

/* =========================================================
   NORMAL LOGIN
========================================================= */

async function loginUser(
  user,
  password,
  res
) {
  try {
    if (!verifyPassword(password, user)) {
      return res.status(401).json({
        ok: false,
        success: false,
        authenticated: false,
        error:
          "E-posta veya şifre hatalı."
      });
    }

    const token =
      createSecureToken(user.id);

    setSessionCookie(res, token);

    console.log(
      "LOGIN BAŞARILI:",
      user.email,
      "ADMIN:",
      user.is_admin === true
    );

    return res.status(200).json({
      ok: true,
      success: true,
      authenticated: true,
      token,
      is_admin:
        user.is_admin === true,
      isAdmin:
        user.is_admin === true,
      user: publicUser(user)
    });
  } catch (error) {
    console.error(
      "LOGIN USER ERROR:",
      error
    );

    return res.status(500).json({
      ok: false,
      success: false,
      authenticated: false,
      error:
        "Giriş sırasında bir hata oluştu.",
      detail: error?.message || null
    });
  }
}

app.post("/api/login", async (req, res) => {
  try {
    const email = String(
      req.body.email || ""
    )
      .trim()
      .toLowerCase();

    const password = String(
      req.body.password || ""
    );

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        success: false,
        authenticated: false,
        error:
          "E-posta ve şifre zorunludur."
      });
    }

    const user =
      await findUserByEmail(email);

    if (
      !user ||
      !verifyPassword(password, user)
    ) {
      return res.status(401).json({
        ok: false,
        success: false,
        authenticated: false,
        error:
          "E-posta veya şifre hatalı."
      });
    }

    return await loginUser(
      user,
      password,
      res
    );
  } catch (error) {
    console.error(
      "LOGIN ERROR:",
      error
    );

    return res.status(500).json({
      ok: false,
      success: false,
      authenticated: false,
      error:
        "Giriş sırasında bir hata oluştu."
    });
  }
});

/* =========================================================
   ADMIN LOGIN
========================================================= */

app.post(
  "/api/admin/login",
  async (req, res) => {
    try {
      const email = String(
        req.body?.email || ""
      )
        .trim()
        .toLowerCase();

      const password = String(
        req.body?.password || ""
      );

      console.log(
        "ADMIN LOGIN İSTEĞİ:",
        email,
        "PASSWORD:",
        !!password
      );

      if (!email || !password) {
        return res.status(400).json({
          ok: false,
          success: false,
          authenticated: false,
          error:
            "Admin e-posta ve şifre zorunludur."
        });
      }

      /*
        ÖZEL DEMO ADMIN

        Burada yeni kullanıcı oluşturulmuyor.
        Supabase'deki mevcut gerçek kullanıcı bulunuyor.
      */
      if (
        email === DEMO_ADMIN_EMAIL &&
        password === DEMO_ADMIN_PASSWORD
      ) {
        const user =
          await findDemoAdmin();

        if (!user) {
          console.error(
            "================================="
          );
          console.error(
            "DEMO ADMIN SUPABASE'DE BULUNAMADI"
          );
          console.error(
            "Beklenen ID:",
            DEMO_ADMIN_ID
          );
          console.error(
            "Beklenen EMAIL:",
            DEMO_ADMIN_EMAIL
          );
          console.error(
            "SUPABASE URL:",
            SUPABASE_URL
          );
          console.error(
            "================================="
          );

          return res.status(401).json({
            ok: false,
            success: false,
            authenticated: false,
            error:
              "Admin kullanıcısı veritabanında bulunamadı.",
            detail:
              "demo@panelmarket.com kaydı Render'ın bağlı olduğu Supabase users tablosunda bulunamadı."
          });
        }

        if (user.is_admin !== true) {
          console.error(
            "DEMO ADMIN IS_ADMIN FALSE:",
            user.id,
            user.email
          );

          return res.status(403).json({
            ok: false,
            success: false,
            authenticated: true,
            is_admin: false,
            isAdmin: false,
            error:
              "Bu hesap admin yetkisine sahip değil."
          });
        }

        const token =
          createSecureToken(user.id);

        setSessionCookie(
          res,
          token
        );

        console.log(
          "================================="
        );
        console.log(
          "DEMO ADMIN GİRİŞ BAŞARILI"
        );
        console.log(
          "EMAIL:",
          user.email
        );
        console.log(
          "ID:",
          user.id
        );
        console.log(
          "IS_ADMIN:",
          user.is_admin
        );
        console.log(
          "================================="
        );

        return res.status(200).json({
          ok: true,
          success: true,
          authenticated: true,
          token,
          is_admin: true,
          isAdmin: true,
          user: publicUser(user)
        });
      }

      /*
        Diğer admin hesapları
      */

      const user =
        await findUserByEmail(email);

      if (!user) {
        return res.status(401).json({
          ok: false,
          success: false,
          authenticated: false,
          error:
            "E-posta veya şifre hatalı."
        });
      }

      if (!verifyPassword(password, user)) {
        return res.status(401).json({
          ok: false,
          success: false,
          authenticated: false,
          error:
            "E-posta veya şifre hatalı."
        });
      }

      if (user.is_admin !== true) {
        return res.status(403).json({
          ok: false,
          success: false,
          authenticated: true,
          is_admin: false,
          isAdmin: false,
          error:
            "Bu hesap admin yetkisine sahip değil."
        });
      }

      const token =
        createSecureToken(user.id);

      setSessionCookie(
        res,
        token
      );

      console.log(
        "ADMIN GİRİŞ BAŞARILI:",
        user.email,
        "ID:",
        user.id
      );

      return res.status(200).json({
        ok: true,
        success: true,
        authenticated: true,
        token,
        is_admin: true,
        isAdmin: true,
        user: publicUser(user)
      });
    } catch (error) {
      console.error(
        "ADMIN LOGIN ERROR:",
        error
      );

      return res.status(500).json({
        ok: false,
        success: false,
        authenticated: false,
        error:
          "Giriş sırasında sunucu hatası oluştu.",
        detail:
          error?.message ||
          "Bilinmeyen hata",
        code: error?.code || null,
        details:
          error?.details || null,
        hint: error?.hint || null
      });
    }
  }
);

/* =========================================================
   LOGOUT
========================================================= */

app.post(
  "/api/logout",
  async (req, res) => {
    clearSessionCookie(res);

    return res.status(200).json({
      ok: true,
      success: true,
      authenticated: false
    });
  }
);

/* =========================================================
   AUTH ME
========================================================= */

app.get(
  "/api/auth/me",
  requireAuth,
  async (req, res) => {
    return res.json({
      authenticated: true,
      user: publicUser(req.user)
    });
  }
);

/* =========================================================
   ACCOUNT
========================================================= */

app.get(
  "/api/account",
  requireAuth,
  async (req, res) => {
    try {
      const {
        count,
        error
      } = await supabase
        .from("orders")
        .select("id", {
          count: "exact",
          head: true
        })
        .eq(
          "user_id",
          req.user.id
        );

      if (error) {
        throw error;
      }

      return res.json({
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        balance: Number(
          req.user.balance || 0
        ),
        orderCount: count || 0
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          "Hesap bilgileri alınamadı."
      });
    }
  }
);

/* =========================================================
   WALLET TOPUP
========================================================= */

app.post(
  "/api/wallet/topup",
  requireAuth,
  async (req, res) => {
    try {
      const amount = Number(
        req.body.amount
      );

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        return res.status(400).json({
          error:
            "Geçerli bir bakiye miktarı girin."
        });
      }

      if (amount > 1000000) {
        return res.status(400).json({
          error:
            "Tek işlemde en fazla 1.000.000 TL yüklenebilir."
        });
      }

      const oldBalance = Number(
        req.user.balance || 0
      );

      const newBalance =
        Math.round(
          (oldBalance + amount) * 100
        ) / 100;

      const {
        data: updatedUser,
        error
      } = await supabase
        .from("users")
        .update({
          balance: newBalance
        })
        .eq(
          "id",
          req.user.id
        )
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      const {
        error: transactionError
      } = await supabase
        .from("transactions")
        .insert({
          user_id: req.user.id,
          type: "credit",
          amount,
          note: "Bakiye yükleme"
        });

      if (transactionError) {
        throw transactionError;
      }

      return res.json({
        success: true,
        balance: Number(
          updatedUser.balance
        )
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          "Bakiye yüklenemedi."
      });
    }
  }
);

/* =========================================================
   ORDERS CREATE
========================================================= */

app.post(
  "/api/orders",
  requireAuth,
  async (req, res) => {
    try {
      const productId = String(
        req.body.productId || ""
      );

      const licenseId = String(
        req.body.licenseId || ""
      );

      const product =
        findProduct(productId);

      if (!product) {
        return res.status(404).json({
          error:
            "Ürün bulunamadı."
        });
      }

      if (!licenses[licenseId]) {
        return res.status(400).json({
          error:
            "Lisans seçimi geçersiz."
        });
      }

      const total =
        calculatePrice(
          product,
          licenseId
        );

      const {
        data: freshUser,
        error: userError
      } = await supabase
        .from("users")
        .select("*")
        .eq(
          "id",
          req.user.id
        )
        .single();

      if (userError) {
        throw userError;
      }

      const balance = Number(
        freshUser.balance || 0
      );

      if (balance < total) {
        return res.status(400).json({
          error:
            "Yetersiz bakiye."
        });
      }

      const newBalance =
        Math.round(
          (balance - total) * 100
        ) / 100;

      const {
        data: updatedUser,
        error: updateError
      } = await supabase
        .from("users")
        .update({
          balance: newBalance
        })
        .eq(
          "id",
          req.user.id
        )
        .eq(
          "balance",
          balance
        )
        .select("*")
        .maybeSingle();

      if (updateError) {
        throw updateError;
      }

      if (!updatedUser) {
        return res.status(409).json({
          error:
            "Bakiye değişti. Lütfen tekrar deneyin."
        });
      }

      const orderNumber =
        createOrderNumber();

      const licenseKey =
        createLicenseKey();

      const {
        data: order,
        error: orderError
      } = await supabase
        .from("orders")
        .insert({
          user_id: req.user.id,
          order_number: orderNumber,
          product_id: product.id,
          product_name: product.name,
          license_id: licenseId,
          license_name:
            licenses[licenseId].name,
          amount: total,
          status: "Ödeme Alındı",
          delivery_status:
            "Teslim Edilebilir",
          license_key: licenseKey
        })
        .select("*")
        .single();

      if (orderError) {
        await supabase
          .from("users")
          .update({
            balance
          })
          .eq(
            "id",
            req.user.id
          );

        throw orderError;
      }

      const {
        error: transactionError
      } = await supabase
        .from("transactions")
        .insert({
          user_id: req.user.id,
          type: "debit",
          amount: total,
          note: `${product.name} satın alımı`
        });

      if (transactionError) {
        console.error(
          "Transaction error:",
          transactionError
        );
      }

      return res.json({
        success: true,
        order: {
          id: order.id,
          userId: order.user_id,
          orderNumber:
            order.order_number,
          productId:
            order.product_id,
          productName:
            order.product_name,
          licenseId:
            order.license_id,
          licenseName:
            order.license_name,
          amount: Number(
            order.amount
          ),
          status:
            order.status,
          deliveryStatus:
            order.delivery_status,
          licenseKey:
            order.license_key,
          createdAt:
            order.created_at
        },
        balance: Number(
          updatedUser.balance
        )
      });
    } catch (error) {
      console.error(
        "Order error:",
        error
      );

      return res.status(500).json({
        error:
          "Sipariş oluşturulamadı."
      });
    }
  }
);

/* =========================================================
   USER ORDERS
========================================================= */

app.get(
  "/api/orders",
  requireAuth,
  async (req, res) => {
    try {
      const {
        data,
        error
      } = await supabase
        .from("orders")
        .select("*")
        .eq(
          "user_id",
          req.user.id
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );

      if (error) {
        throw error;
      }

      return res.json(
        (data || []).map(
          (order) => ({
            id: order.id,
            userId:
              order.user_id,
            orderNumber:
              order.order_number,
            productId:
              order.product_id,
            productName:
              order.product_name,
            licenseId:
              order.license_id,
            licenseName:
              order.license_name,
            amount: Number(
              order.amount
            ),
            status:
              order.status,
            deliveryStatus:
              order.delivery_status,
            licenseKey:
              order.license_key,
            createdAt:
              order.created_at
          })
        )
      );
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          "Siparişler alınamadı."
      });
    }
  }
);

/* =========================================================
   SINGLE ORDER
========================================================= */

app.get(
  "/api/orders/:id",
  requireAuth,
  async (req, res) => {
    try {
      const id = req.params.id;

      let query = supabase
        .from("orders")
        .select("*")
        .eq(
          "user_id",
          req.user.id
        );

      if (
        /^[0-9a-fA-F-]{36}$/.test(id)
      ) {
        query = query.eq(
          "id",
          id
        );
      } else {
        query = query.eq(
          "order_number",
          id
        );
      }

      const {
        data: order,
        error
      } = await query.maybeSingle();

      if (error) {
        throw error;
      }

      if (!order) {
        return res.status(404).json({
          error:
            "Sipariş bulunamadı."
        });
      }

      return res.json({
        id: order.id,
        userId:
          order.user_id,
        orderNumber:
          order.order_number,
        productId:
          order.product_id,
        productName:
          order.product_name,
        licenseId:
          order.license_id,
        licenseName:
          order.license_name,
        amount: Number(
          order.amount
        ),
        status:
          order.status,
        deliveryStatus:
          order.delivery_status,
        licenseKey:
          order.license_key,
        createdAt:
          order.created_at
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          "Sipariş alınamadı."
      });
    }
  }
);

/* =========================================================
   TRANSACTIONS
========================================================= */

app.get(
  "/api/account/transactions",
  requireAuth,
  async (req, res) => {
    try {
      const {
        data,
        error
      } = await supabase
        .from("transactions")
        .select("*")
        .eq(
          "user_id",
          req.user.id
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );

      if (error) {
        throw error;
      }

      return res.json(
        (data || []).map(
          (t) => ({
            id: t.id,
            type: t.type,
            amount: Number(
              t.amount
            ),
            note: t.note,
            date: t.created_at
          })
        )
      );
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          "İşlem geçmişi alınamadı."
      });
    }
  }
);

/* =========================================================
   ACCOUNT UPDATE
========================================================= */

app.put(
  "/api/account",
  requireAuth,
  async (req, res) => {
    try {
      const name = String(
        req.body.name || ""
      ).trim();

      if (!name) {
        return res.status(400).json({
          error:
            "Ad soyad boş bırakılamaz."
        });
      }

      const {
        data: user,
        error
      } = await supabase
        .from("users")
        .update({
          name
        })
        .eq(
          "id",
          req.user.id
        )
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return res.json({
        success: true,
        user: publicUser(user)
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          "Hesap güncellenemedi."
      });
    }
  }
);

/* =========================================================
   PASSWORD UPDATE
========================================================= */

app.post(
  "/api/account/password",
  requireAuth,
  async (req, res) => {
    try {
      const oldPassword = String(
        req.body.oldPassword || ""
      );

      const newPassword = String(
        req.body.newPassword || ""
      );

      if (
        !oldPassword ||
        !newPassword
      ) {
        return res.status(400).json({
          error:
            "Eski ve yeni şifre zorunludur."
        });
      }

      if (
        !verifyPassword(
          oldPassword,
          req.user
        )
      ) {
        return res.status(401).json({
          error:
            "Mevcut şifre hatalı."
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          error:
            "Yeni şifre en az 8 karakter olmalıdır."
        });
      }

      if (!/[A-Za-z]/.test(newPassword)) {
        return res.status(400).json({
          error:
            "Yeni şifre en az bir harf içermelidir."
        });
      }

      if (!/[0-9]/.test(newPassword)) {
        return res.status(400).json({
          error:
            "Yeni şifre en az bir rakam içermelidir."
        });
      }

      const passwordData =
        hashPassword(newPassword);

      const {
        error
      } = await supabase
        .from("users")
        .update({
          password_hash:
            passwordData.hash,
          password_salt:
            passwordData.salt
        })
        .eq(
          "id",
          req.user.id
        );

      if (error) {
        throw error;
      }

      return res.json({
        success: true,
        message:
          "Şifre değiştirildi."
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          "Şifre değiştirilemedi."
      });
    }
  }
);

/* =========================================================
   ADMIN ME
========================================================= */

app.get(
  "/api/admin/me",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const adminUser =
        req.adminUser;

      const user = {
        id: adminUser.id,
        name:
          adminUser.name || "",
        email:
          adminUser.email || "",
        balance: Number(
          adminUser.balance || 0
        ),
        is_admin: true,
        isAdmin: true
      };

      return res.status(200).json({
        ok: true,
        authenticated: true,
        is_admin: true,
        isAdmin: true,
        user,
        admin: user
      });
    } catch (error) {
      console.error(
        "ADMIN ME ERROR:",
        error
      );

      return res.status(500).json({
        ok: false,
        error:
          "Admin bilgisi alınamadı."
      });
    }
  }
);

/* =========================================================
   ADMIN DASHBOARD
========================================================= */

app.get(
  "/api/admin/dashboard",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const [
        users,
        orders,
        productsDb,
        transactions
      ] = await Promise.all([
        supabase
          .from("users")
          .select(
            "id,balance,is_admin"
          ),

        supabase
          .from("orders")
          .select(
            "id,amount,status"
          ),

        supabase
          .from("products")
          .select(
            "id,active"
          ),

        supabase
          .from("transactions")
          .select(
            "type,amount"
          )
      ]);

      for (const r of [
        users,
        orders,
        productsDb,
        transactions
      ]) {
        if (r.error) {
          throw r.error;
        }
      }

      const totalBalance =
        (users.data || []).reduce(
          (sum, user) =>
            sum +
            Number(
              user.balance || 0
            ),
          0
        );

      const totalSales =
        (orders.data || []).reduce(
          (sum, order) =>
            sum +
            Number(
              order.amount || 0
            ),
          0
        );

      const totalCredits =
        (transactions.data || [])
          .filter(
            (t) =>
              t.type === "credit"
          )
          .reduce(
            (sum, t) =>
              sum +
              Number(
                t.amount || 0
              ),
            0
          );

      const totalDebits =
        (transactions.data || [])
          .filter(
            (t) =>
              t.type === "debit"
          )
          .reduce(
            (sum, t) =>
              sum +
              Number(
                t.amount || 0
              ),
            0
          );

      return res.json({
        ok: true,
        totalUsers:
          (users.data || [])
            .length,
        totalOrders:
          (orders.data || [])
            .length,
        totalProducts:
          (productsDb.data || [])
            .length,
        activeProducts:
          (productsDb.data || [])
            .filter(
              (p) =>
                p.active !== false
            ).length,
        totalBalance,
        totalSales,
        totalCredits,
        totalDebits
      });
    } catch (error) {
      console.error(
        "ADMIN DASHBOARD ERROR:",
        error
      );

      return res.status(500).json({
        ok: false,
        error:
          "Dashboard bilgileri alınamadı.",
        detail:
          error?.message || null
      });
    }
  }
);

/* =========================================================
   ADMIN USERS
========================================================= */

app.get(
  "/api/admin/users",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const {
        data,
        error
      } = await supabase
        .from("users")
        .select(
          "id,name,email,balance,is_admin,created_at"
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );

      if (error) {
        throw error;
      }

      return res.json(
        (data || []).map(
          (u) => ({
            ...u,
            balance: Number(
              u.balance || 0
            ),
            isAdmin:
              u.is_admin === true
          })
        )
      );
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          "Kullanıcılar alınamadı."
      });
    }
  }
);

/* =========================================================
   ADMIN ORDERS
========================================================= */

app.get(
  "/api/admin/orders",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const {
        data,
        error
      } = await supabase
        .from("orders")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false
          }
        );

      if (error) {
        throw error;
      }

      return res.json(
        data || []
      );
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          "Siparişler alınamadı."
      });
    }
  }
);

/* =========================================================
   ADMIN TRANSACTIONS
========================================================= */

app.get(
  "/api/admin/transactions",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const {
        data,
        error
      } = await supabase
        .from("transactions")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false
          }
        );

      if (error) {
        throw error;
      }

      return res.json(
        data || []
      );
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          "İşlemler alınamadı."
      });
    }
  }
);

/* =========================================================
   ADMIN BALANCE
========================================================= */

app.post(
  "/api/admin/users/:id/balance",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const user =
        await findUserById(
          req.params.id
        );

      if (!user) {
        return res.status(404).json({
          error:
            "Kullanıcı bulunamadı."
        });
      }

      const amount = Number(
        req.body.amount
      );

      const type = String(
        req.body.type ||
          "credit"
      );

      const note = String(
        req.body.note || ""
      ).trim();

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        return res.status(400).json({
          error:
            "Geçerli bir tutar girin."
        });
      }

      if (
        type !== "credit" &&
        type !== "debit"
      ) {
        return res.status(400).json({
          error:
            "Geçersiz işlem türü."
        });
      }

      const oldBalance =
        Number(
          user.balance || 0
        );

      const newBalance =
        Math.round(
          (
            oldBalance +
            (
              type === "credit"
                ? amount
                : -amount
            )
          ) * 100
        ) / 100;

      if (newBalance < 0) {
        return res.status(400).json({
          error:
            "Bakiye eksiye düşemez."
        });
      }

      const {
        data: updated,
        error
      } = await supabase
        .from("users")
        .update({
          balance: newBalance
        })
        .eq(
          "id",
          user.id
        )
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      const {
        error: txError
      } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          type,
          amount,
          note:
            note ||
            "Admin bakiye işlemi"
        });

      if (txError) {
        throw txError;
      }

      return res.json({
        success: true,
        user: publicUser(
          updated
        )
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          "Bakiye işlemi başarısız."
      });
    }
  }
);

/* =========================================================
   ADMIN ORDER UPDATE
========================================================= */

app.patch(
  "/api/admin/orders/:id",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const allowed = [
        "status",
        "delivery_status",
        "license_key"
      ];

      const update = {};

      for (const key of allowed) {
        if (
          req.body[key] !==
          undefined
        ) {
          update[key] =
            req.body[key];
        }
      }

      if (
        !Object.keys(update)
          .length
      ) {
        return res.status(400).json({
          error:
            "Güncellenecek alan yok."
        });
      }

      const {
        data,
        error
      } = await supabase
        .from("orders")
        .update(update)
        .eq(
          "id",
          req.params.id
        )
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return res.json({
        success: true,
        order: data
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          "Sipariş güncellenemedi."
      });
    }
  }
);

/* =========================================================
   SESSION STATUS
========================================================= */

app.get(
  "/api/session/status",
  async (req, res) => {
    try {
      const token =
        getTokenFromRequest(req);

      if (!token) {
        return res.json({
          ok: true,
          authenticated: false,
          hasToken: false,
          session: null,
          user: null
        });
      }

      const auth =
        await getSessionFromRequest(
          req
        );

      if (!auth) {
        return res.json({
          ok: true,
          authenticated: false,
          hasToken: true,
          session: null,
          user: null
        });
      }

      return res.json({
        ok: true,
        authenticated: true,
        hasToken: true,
        session: {
          user_id:
            auth.session.user_id,
          created_at:
            auth.session.created_at
        },
        user: publicUser(
          auth.user
        ),
        is_admin:
          auth.user.is_admin ===
          true,
        isAdmin:
          auth.user.is_admin ===
          true
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        ok: false,
        error:
          "Session status alınamadı."
      });
    }
  }
);

/* =========================================================
   HEALTH
========================================================= */

app.get(
  "/health",
  async (req, res) => {
    try {
      const {
        error
      } = await supabase
        .from("users")
        .select("id")
        .limit(1);

      if (error) {
        return res.status(500).json({
          ok: false,
          service: "PanelMarket",
          database:
            "Supabase bağlantı hatası",
          error: error.message
        });
      }

      return res.json({
        ok: true,
        service: "PanelMarket",
        database:
          "Supabase bağlı"
      });
    } catch (error) {
      console.error(
        "HEALTH ERROR:",
        error
      );

      return res.status(500).json({
        ok: false,
        service: "PanelMarket",
        database:
          "Supabase bağlantı hatası"
      });
    }
  }
);

/* =========================================================
   STATIC FILES
========================================================= */

app.use(
  express.static(__dirname, {
    extensions: ["html"]
  })
);

/* =========================================================
   SAYFALAR
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
  "register",
  "admin",
  "admin-login"
];

for (const page of pages) {
  app.get(
    `/${page}.html`,
    (req, res) => {
      res.sendFile(
        path.join(
          __dirname,
          `${page}.html`
        )
      );
    }
  );
}

app.get(
  "/",
  (req, res) => {
    res.sendFile(
      path.join(
        __dirname,
        "index.html"
      )
    );
  }
);

/* =========================================================
   404
========================================================= */

app.use(
  (req, res) => {
    if (
      req.path.startsWith(
        "/api/"
      )
    ) {
      return res.status(404).json({
        error:
          "API adresi bulunamadı."
      });
    }

    return res
      .status(404)
      .send(`<!doctype html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>PanelMarket - 404</title>
<style>
*{
  box-sizing:border-box
}
body{
  margin:0;
  min-height:100vh;
  display:grid;
  place-items:center;
  background:#070a0f;
  color:#fff;
  font-family:Inter,Arial,sans-serif
}
.box{
  width:min(500px,92%);
  text-align:center;
  padding:45px;
  border:1px solid #1d2835;
  border-radius:22px;
  background:#0d131b;
  box-shadow:0 25px 80px rgba(0,0,0,.35)
}
h1{
  margin:0 0 12px
}
p{
  color:#8995a7
}
a{
  display:inline-block;
  margin-top:20px;
  padding:13px 22px;
  border-radius:10px;
  background:#1677ff;
  color:#fff;
  text-decoration:none;
  font-weight:800
}
</style>
</head>
<body>
<div class="box">
<h1>Sayfa bulunamadı</h1>
<p>Aradığınız PanelMarket sayfası mevcut değil.</p>
<a href="/">Ana Sayfaya Dön</a>
</div>
</body>
</html>`);
  }
);

/* =========================================================
   SERVER
========================================================= */

app.listen(
  PORT,
  () => {
    console.log(
      "================================="
    );
    console.log(
      "PanelMarket çalışıyor"
    );
    console.log(
      `Port: ${PORT}`
    );
    console.log(
      "Supabase: BAĞLI"
    );
    console.log(
      "Admin API: AKTİF"
    );
    console.log(
      "Session/Cookie/Bearer: AKTİF"
    );
    console.log(
      "Demo Admin:",
      DEMO_ADMIN_EMAIL
    );
    console.log(
      "Demo Admin ID:",
      DEMO_ADMIN_ID
    );
    console.log(
      "================================="
    );
  }
);
