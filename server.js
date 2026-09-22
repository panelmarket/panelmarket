import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = process.env.PORT || 3000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

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

  unlimited: {
    name: "Sınırsız Site",
    multiplier: 3.334
  }
};

/* =========================================================
   YARDIMCI FONKSİYONLAR
========================================================= */

function findProduct(id) {
  return products.find(p => p.id === id);
}

function calculatePrice(product, licenseId) {
  const license = licenses[licenseId];

  if (!license) {
    throw new Error("Geçersiz lisans.");
  }

  return Math.round(
    product.price * license.multiplier * 100
  ) / 100;
}

function createOrderNumber() {
  return (
    "PM-" +
    new Date().getFullYear() +
    "-" +
    crypto
      .randomBytes(4)
      .toString("hex")
      .toUpperCase()
  );
}

function createLicenseKey() {
  return (
    "PMK-" +
    crypto
      .randomBytes(12)
      .toString("hex")
      .toUpperCase()
  );
}

function createToken() {
  return crypto
    .randomBytes(32)
    .toString("hex");
}

/* =========================================================
   ŞİFRE HASH
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
    !user.password_hash ||
    !user.password_salt
  ) {
    return false;
  }

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

  return crypto.timingSafeEqual(
    result,
    stored
  );
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

  header.split(";").forEach(item => {
    const index = item.indexOf("=");

    if (index === -1) {
      return;
    }

    const key = item
      .slice(0, index)
      .trim();

    const value = item
      .slice(index + 1)
      .trim();

    try {
      cookies[key] =
        decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
  });

  return cookies;
}

/* =========================================================
   SUPABASE KULLANICI BUL
========================================================= */

async function findUserByEmail(email) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function findUserById(id) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/* =========================================================
   OTURUM BUL
========================================================= */

async function getCurrentUser(req) {
  const authorization =
    req.headers.authorization || "";

  let token = "";

  if (
    authorization.startsWith("Bearer ")
  ) {
    token = authorization
      .slice(7)
      .trim();
  }

  if (!token) {
    const cookies = getCookies(req);

    token =
      cookies.panelmarket_token || "";
  }

  if (!token) {
    return null;
  }

  const { data: session, error } =
    await supabase
      .from("sessions")
      .select("user_id")
      .eq("token", token)
      .maybeSingle();

  if (error) {
    console.error(
      "Session error:",
      error.message
    );

    return null;
  }

  if (!session) {
    return null;
  }

  return await findUserById(
    session.user_id
  );
}

/* =========================================================
   AUTH MIDDLEWARE
========================================================= */

async function requireAuth(
  req,
  res,
  next
) {
  try {
    const user =
      await getCurrentUser(req);

    if (!user) {
      return res.status(401).json({
        error: "Oturum gerekli.",
        loginRequired: true
      });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Oturum kontrolü başarısız."
    });
  }
}

/* =========================================================
   KULLANICI JSON
========================================================= */

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    balance: Number(user.balance || 0)
  };
}

/* =========================================================
   API - ÜRÜNLER
========================================================= */

app.get(
  "/api/products",
  (req, res) => {
    res.json(products);
  }
);

app.get(
  "/api/products/:id",
  (req, res) => {
    const product =
      findProduct(req.params.id);

    if (!product) {
      return res.status(404).json({
        error: "Ürün bulunamadı."
      });
    }

    const prices = {};

    for (
      const [id, license]
      of Object.entries(licenses)
    ) {
      prices[id] = {
        name: license.name,
        price: calculatePrice(
          product,
          id
        )
      };
    }

    res.json({
      ...product,
      licenses: prices
    });
  }
);

/* =========================================================
   API - KAYIT
========================================================= */

app.post(
  "/api/register",
  async (req, res) => {
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
          error:
            "Ad soyad alanı zorunludur."
        });
      }

      if (!email) {
        return res.status(400).json({
          error:
            "E-posta adresi zorunludur."
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

      const existing =
        await findUserByEmail(email);

      if (existing) {
        return res.status(409).json({
          error:
            "Bu e-posta adresi zaten kayıtlı."
        });
      }

      const passwordData =
        hashPassword(password);

      const { data: user, error } =
        await supabase
          .from("users")
          .insert({
            name,
            email,
            password_hash:
              passwordData.hash,
            password_salt:
              passwordData.salt,
            balance: 0
          })
          .select("*")
          .single();

      if (error) {
        console.error(
          "Register error:",
          error
        );

        if (
          error.code === "23505"
        ) {
          return res.status(409).json({
            error:
              "Bu e-posta adresi zaten kayıtlı."
          });
        }

        throw error;
      }

      const token =
        createToken();

      const {
        error: sessionError
      } = await supabase
        .from("sessions")
        .insert({
          token,
          user_id: user.id
        });

      if (sessionError) {
        throw sessionError;
      }

      res.setHeader(
        "Set-Cookie",
        `panelmarket_token=${encodeURIComponent(
          token
        )}; Path=/; HttpOnly; SameSite=Lax`
      );

      res.status(201).json({
        success: true,
        token,
        user: publicUser(user)
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Kayıt sırasında bir hata oluştu."
      });
    }
  }
);

/* =========================================================
   API - GİRİŞ
========================================================= */

app.post(
  "/api/login",
  async (req, res) => {
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
          error:
            "E-posta ve şifre zorunludur."
        });
      }

      const user =
        await findUserByEmail(email);

      /*
        DEMO HESAP
        demo@panelmarket.com
        12345678
      */

      if (
        !user &&
        email ===
          "demo@panelmarket.com"
      ) {
        const passwordData =
          hashPassword("12345678");

        const {
          data: demo,
          error
        } = await supabase
          .from("users")
          .insert({
            name: "Demo Kullanıcı",
            email:
              "demo@panelmarket.com",
            password_hash:
              passwordData.hash,
            password_salt:
              passwordData.salt,
            balance: 5000
          })
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        return await loginUser(
          demo,
          password,
          res
        );
      }

      if (!user) {
        return res.status(401).json({
          error:
            "E-posta veya şifre hatalı."
        });
      }

      if (
        !verifyPassword(
          password,
          user
        )
      ) {
        return res.status(401).json({
          error:
            "E-posta veya şifre hatalı."
        });
      }

      await loginUser(
        user,
        password,
        res
      );
    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      res.status(500).json({
        error:
          "Giriş sırasında bir hata oluştu."
      });
    }
  }
);

/* =========================================================
   LOGIN YARDIMCI
========================================================= */

async function loginUser(
  user,
  password,
  res
) {
  if (
    !verifyPassword(
      password,
      user
    )
  ) {
    return res.status(401).json({
      error:
        "E-posta veya şifre hatalı."
    });
  }

  const token =
    createToken();

  const {
    error
  } = await supabase
    .from("sessions")
    .insert({
      token,
      user_id: user.id
    });

  if (error) {
    throw error;
  }

  res.setHeader(
    "Set-Cookie",
    `panelmarket_token=${encodeURIComponent(
      token
    )}; Path=/; HttpOnly; SameSite=Lax`
  );

  return res.json({
    success: true,
    token,
    user: publicUser(user)
  });
}

/* =========================================================
   API - ÇIKIŞ
========================================================= */

app.post(
  "/api/logout",
  async (req, res) => {
    try {
      const cookies =
        getCookies(req);

      const authorization =
        req.headers.authorization || "";

      let token = "";

      if (
        authorization.startsWith(
          "Bearer "
        )
      ) {
        token =
          authorization
            .slice(7)
            .trim();
      }

      if (!token) {
        token =
          cookies.panelmarket_token ||
          "";
      }

      if (token) {
        await supabase
          .from("sessions")
          .delete()
          .eq("token", token);
      }

      res.setHeader(
        "Set-Cookie",
        "panelmarket_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax"
      );

      res.json({
        success: true
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Çıkış yapılamadı."
      });
    }
  }
);

/* =========================================================
   API - OTURUM
========================================================= */

app.get(
  "/api/auth/me",
  requireAuth,
  async (req, res) => {
    res.json({
      authenticated: true,
      user: publicUser(
        req.user
      )
    });
  }
);

/* =========================================================
   API - HESAP
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
        .select(
          "id",
          {
            count: "exact",
            head: true
          }
        )
        .eq(
          "user_id",
          req.user.id
        );

      if (error) {
        throw error;
      }

      res.json({
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

      res.status(500).json({
        error:
          "Hesap bilgileri alınamadı."
      });
    }
  }
);

/* =========================================================
   API - BAKİYE YÜKLE
========================================================= */

app.post(
  "/api/wallet/topup",
  requireAuth,
  async (req, res) => {
    try {
      const amount =
        Number(req.body.amount);

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

      const oldBalance =
        Number(
          req.user.balance || 0
        );

      const newBalance =
        Math.round(
          (oldBalance + amount) *
            100
        ) / 100;

      const {
        data: updatedUser,
        error
      } = await supabase
        .from("users")
        .update({
          balance:
            newBalance
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
        error:
          transactionError
      } = await supabase
        .from("transactions")
        .insert({
          user_id:
            req.user.id,
          type: "credit",
          amount,
          note:
            "Bakiye yükleme"
        });

      if (transactionError) {
        throw transactionError;
      }

      res.json({
        success: true,
        balance: Number(
          updatedUser.balance
        )
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Bakiye yüklenemedi."
      });
    }
  }
);

/* =========================================================
   API - SİPARİŞ OLUŞTUR
========================================================= */

app.post(
  "/api/orders",
  requireAuth,
  async (req, res) => {
    try {
      const productId =
        String(
          req.body.productId || ""
        );

      const licenseId =
        String(
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

      /*
        Kullanıcının güncel bakiyesini
        Supabase'den tekrar okuyoruz.
      */

      const {
        data: freshUser,
        error:
          userError
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

      const balance =
        Number(
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
          (balance - total) *
            100
        ) / 100;

      /*
        Önce bakiye düşürülür.
      */

      const {
        data:
          updatedUser,
        error:
          updateError
      } = await supabase
        .from("users")
        .update({
          balance:
            newBalance
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

      /*
        Aynı anda başka satın alma olmuşsa
        bakiye değişmiş olacaktır.
      */

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
        error:
          orderError
      } = await supabase
        .from("orders")
        .insert({
          user_id:
            req.user.id,
          order_number:
            orderNumber,
          product_id:
            product.id,
          product_name:
            product.name,
          license_id:
            licenseId,
          license_name:
            licenses[licenseId]
              .name,
          amount:
            total,
          status:
            "Ödeme Alındı",
          delivery_status:
            "Teslim Edilebilir",
          license_key:
            licenseKey
        })
        .select("*")
        .single();

      if (orderError) {
        /*
          Sipariş oluşturulamazsa
          düşülen bakiyeyi geri almaya
          çalışıyoruz.
        */

        await supabase
          .from("users")
          .update({
            balance:
              balance
          })
          .eq(
            "id",
            req.user.id
          );

        throw orderError;
      }

      const {
        error:
          transactionError
      } = await supabase
        .from("transactions")
        .insert({
          user_id:
            req.user.id,
          type: "debit",
          amount: total,
          note:
            `${product.name} satın alımı`
        });

      if (transactionError) {
        console.error(
          "Transaction error:",
          transactionError
        );
      }

      res.json({
        success: true,

        order: {
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
          amount:
            Number(order.amount),
          status:
            order.status,
          deliveryStatus:
            order.delivery_status,
          licenseKey:
            order.license_key,
          createdAt:
            order.created_at
        },

        balance:
          Number(
            updatedUser.balance
          )
      });
    } catch (error) {
      console.error(
        "Order error:",
        error
      );

      res.status(500).json({
        error:
          "Sipariş oluşturulamadı."
      });
    }
  }
);

/* =========================================================
   API - SADECE KENDİ SİPARİŞLERİ
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

      const result =
        (data || []).map(
          order => ({
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
            amount:
              Number(order.amount),
            status:
              order.status,
            deliveryStatus:
              order.delivery_status,
            licenseKey:
              order.license_key,
            createdAt:
              order.created_at
          })
        );

      res.json(result);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Siparişler alınamadı."
      });
    }
  }
);

/* =========================================================
   API - TEK SİPARİŞ
   SADECE SAHİBİ GÖREBİLİR
========================================================= */

app.get(
  "/api/orders/:id",
  requireAuth,
  async (req, res) => {
    try {
      const id =
        req.params.id;

      let query =
        supabase
          .from("orders")
          .select("*")
          .eq(
            "user_id",
            req.user.id
          );

      /*
        UUID veya sipariş numarası
      */

      if (
        /^[0-9a-fA-F-]{36}$/.test(id)
      ) {
        query =
          query.eq(
            "id",
            id
          );
      } else {
        query =
          query.eq(
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

      res.json({
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
        amount:
          Number(order.amount),
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

      res.status(500).json({
        error:
          "Sipariş alınamadı."
      });
    }
  }
);

/* =========================================================
   API - İŞLEM GEÇMİŞİ
   SADECE KENDİ İŞLEMLERİ
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

      res.json(
        (data || []).map(
          transaction => ({
            id:
              transaction.id,
            type:
              transaction.type,
            amount:
              Number(
                transaction.amount
              ),
            note:
              transaction.note,
            date:
              transaction.created_at
          })
        )
      );
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "İşlem geçmişi alınamadı."
      });
    }
  }
);

/* =========================================================
   API - HESAP BİLGİSİ GÜNCELLE
========================================================= */

app.put(
  "/api/account",
  requireAuth,
  async (req, res) => {
    try {
      const name =
        String(
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

      res.json({
        success: true,
        user:
          publicUser(user)
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Hesap güncellenemedi."
      });
    }
  }
);

/* =========================================================
   API - ŞİFRE DEĞİŞTİR
========================================================= */

app.post(
  "/api/account/password",
  requireAuth,
  async (req, res) => {
    try {
      const oldPassword =
        String(
          req.body.oldPassword || ""
        );

      const newPassword =
        String(
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

      if (
        newPassword.length < 8
      ) {
        return res.status(400).json({
          error:
            "Yeni şifre en az 8 karakter olmalıdır."
        });
      }

      if (
        !/[A-Za-z]/.test(
          newPassword
        )
      ) {
        return res.status(400).json({
          error:
            "Yeni şifre en az bir harf içermelidir."
        });
      }

      if (
        !/[0-9]/.test(
          newPassword
        )
      ) {
        return res.status(400).json({
          error:
            "Yeni şifre en az bir rakam içermelidir."
        });
      }

      const passwordData =
        hashPassword(
          newPassword
        );

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

      res.json({
        success: true,
        message:
          "Şifre değiştirildi."
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Şifre değiştirilemedi."
      });
    }
  }
);

// ============================================================
// PANELMARKET ADMIN API
// ============================================================

async function requireAdmin(req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        error: "Admin girişi gerekli"
      });
    }

    const { data: adminUser, error } = await supabase
      .from("users")
      .select("id,name,email,balance,is_admin,created_at")
      .eq("id", req.user.id)
      .maybeSingle();

    if (error) {
      console.error("ADMIN CHECK ERROR:", error);
      return res.status(500).json({
        error: "Admin kontrolü yapılamadı"
      });
    }

    if (!adminUser || adminUser.is_admin !== true) {
      return res.status(403).json({
        error: "Admin yetkisi yok"
      });
    }

    req.adminUser = adminUser;
    next();
  } catch (err) {
    console.error("ADMIN AUTH ERROR:", err);
    return res.status(500).json({
      error: "Admin doğrulama hatası"
    });
  }
}


// Admin bilgisi
app.get("/api/admin/me", requireAuth, requireAdmin, async (req, res) => {
  res.json({
    ok: true,
    admin: req.adminUser
  });
});


// Dashboard
app.get("/api/admin/dashboard", requireAuth, requireAdmin, async (req, res) => {
  try {
    const [usersResult, ordersResult, transactionsResult] =
      await Promise.all([
        supabase
          .from("users")
          .select("id,balance", { count: "exact" }),

        supabase
          .from("orders")
          .select("id,amount,status,delivery_status,created_at", {
            count: "exact"
          }),

        supabase
          .from("transactions")
          .select("amount,type")
      ]);

    if (usersResult.error) throw usersResult.error;
    if (ordersResult.error) throw ordersResult.error;
    if (transactionsResult.error) throw transactionsResult.error;

    const users = usersResult.data || [];
    const orders = ordersResult.data || [];
    const transactions = transactionsResult.data || [];

    const totalBalance = users.reduce(
      (sum, user) => sum + Number(user.balance || 0),
      0
    );

    const totalSales = orders.reduce(
      (sum, order) => sum + Number(order.amount || 0),
      0
    );

    res.json({
      ok: true,
      totalUsers: usersResult.count || users.length,
      totalOrders: ordersResult.count || orders.length,
      totalBalance,
      totalSales
    });
  } catch (err) {
    console.error("ADMIN DASHBOARD ERROR:", err);

    res.status(500).json({
      error: "Dashboard verileri alınamadı"
    });
  }
});


// Tüm kullanıcılar
app.get("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();

    let query = supabase
      .from("users")
      .select(
        "id,name,email,balance,is_admin,created_at"
      )
      .order("created_at", { ascending: false });

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      ok: true,
      users: data || []
    });
  } catch (err) {
    console.error("ADMIN USERS ERROR:", err);

    res.status(500).json({
      error: "Kullanıcılar alınamadı"
    });
  }
});


// Tüm siparişler
app.get("/api/admin/orders", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        user_id,
        order_number,
        product_id,
        product_name,
        license_id,
        license_name,
        amount,
        status,
        delivery_status,
        license_key,
        created_at,
        users:user_id (
          name,
          email
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({
      ok: true,
      orders: data || []
    });
  } catch (err) {
    console.error("ADMIN ORDERS ERROR:", err);

    res.status(500).json({
      error: "Siparişler alınamadı"
    });
  }
});


// Bakiye değiştir
app.post(
  "/api/admin/users/:id/balance",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const userId = req.params.id;
      const amount = Number(req.body.amount);
      const type = req.body.type;
      const note = String(req.body.note || "Admin bakiye işlemi");

      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({
          error: "Geçerli bir tutar girin"
        });
      }

      if (!["credit", "debit"].includes(type)) {
        return res.status(400).json({
          error: "Geçersiz işlem tipi"
        });
      }

      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id,balance")
        .eq("id", userId)
        .maybeSingle();

      if (userError) throw userError;

      if (!user) {
        return res.status(404).json({
          error: "Kullanıcı bulunamadı"
        });
      }

      const currentBalance = Number(user.balance || 0);

      if (type === "debit" && currentBalance < amount) {
        return res.status(400).json({
          error: "Kullanıcının bakiyesi yetersiz"
        });
      }

      const newBalance =
        type === "credit"
          ? currentBalance + amount
          : currentBalance - amount;

      const { data: updatedUser, error: updateError } =
        await supabase
          .from("users")
          .update({
            balance: Number(newBalance.toFixed(2))
          })
          .eq("id", userId)
          .select("id,name,email,balance")
          .single();

      if (updateError) throw updateError;

      const { error: transactionError } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          type: type === "credit"
            ? "admin_credit"
            : "admin_debit",
          amount: Number(amount.toFixed(2)),
          note
        });

      if (transactionError) {
        console.error(
          "ADMIN TRANSACTION ERROR:",
          transactionError
        );
      }

      res.json({
        ok: true,
        user: updatedUser
      });
    } catch (err) {
      console.error("ADMIN BALANCE ERROR:", err);

      res.status(500).json({
        error: "Bakiye işlemi başarısız"
      });
    }
  }
);


// Sipariş durumunu değiştir
app.patch(
  "/api/admin/orders/:id",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const updates = {};

      if (req.body.status !== undefined) {
        updates.status = String(req.body.status);
      }

      if (req.body.delivery_status !== undefined) {
        updates.delivery_status =
          String(req.body.delivery_status);
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          error: "Güncellenecek alan yok"
        });
      }

      const { data, error } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", req.params.id)
        .select()
        .single();

      if (error) throw error;

      res.json({
        ok: true,
        order: data
      });
    } catch (err) {
      console.error("ADMIN ORDER UPDATE ERROR:", err);

      res.status(500).json({
        error: "Sipariş güncellenemedi"
      });
    }
  }
);


// Tüm işlemler
app.get(
  "/api/admin/transactions",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          id,
          user_id,
          type,
          amount,
          note,
          created_at,
          users:user_id (
            name,
            email
          )
        `)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      res.json({
        ok: true,
        transactions: data || []
      });
    } catch (err) {
      console.error("ADMIN TRANSACTIONS ERROR:", err);

      res.status(500).json({
        error: "İşlemler alınamadı"
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
          service:
            "PanelMarket",
          database:
            "Supabase bağlantı hatası",
          error:
            error.message
        });
      }

      res.json({
        ok: true,
        service:
          "PanelMarket",
        database:
          "Supabase bağlı"
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        service:
          "PanelMarket",
        database:
          "Supabase bağlantı hatası"
      });
    }
  }
);

/* =========================================================
   STATİK DOSYALAR
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
  "register"
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

    res.status(404).send(`
<!doctype html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport"
content="width=device-width,initial-scale=1.0">
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
  box-shadow:
    0 25px 80px rgba(0,0,0,.35);
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
  }
);

/* =========================================================
   SERVER
========================================================= */

app.listen(
  PORT,
  () => {
    console.log("");
    console.log(
      "================================="
    );
    console.log(
      " PanelMarket çalışıyor"
    );
    console.log(
      ` Port: ${PORT}`
    );
    console.log(
      " Supabase: BAĞLI"
    );
    console.log(
      "================================="
    );
    console.log("");
  }
);
