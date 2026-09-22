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

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

/* =========================================================
   SABİT LİSANSLAR
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
   VARSAYILAN ÜRÜNLER
========================================================= */

const defaultProducts = [
  {
    id: "admin-panel",
    name: "Profesyonel Admin Paneli",
    category: "Admin Paneli",
    description: "Modern ve güçlü yönetim paneli.",
    price: 1499,
    old_price: 1999,
    badge: "ÇOK SATAN",
    delivery: "Hemen",
    update_period: "1 Yıl",
    support: "30 Gün",
    active: true,
    sort_order: 1
  },

  {
    id: "ecommerce-panel",
    name: "E-Ticaret Yönetim Paneli",
    category: "E-Ticaret",
    description: "E-ticaret sitenizi tek panelden yönetin.",
    price: 2799,
    old_price: 3499,
    badge: "%20 İNDİRİM",
    delivery: "Hemen",
    update_period: "1 Yıl",
    support: "60 Gün",
    active: true,
    sort_order: 2
  },

  {
    id: "company-panel",
    name: "Firma Yönetim Paneli",
    category: "İşletme",
    description: "Firmalar için profesyonel yönetim sistemi.",
    price: 1799,
    old_price: null,
    badge: "",
    delivery: "Hemen",
    update_period: "6 Ay",
    support: "30 Gün",
    active: true,
    sort_order: 3
  },

  {
    id: "finance-panel",
    name: "Finans & Muhasebe Paneli",
    category: "Finans",
    description: "Finans ve muhasebe işlemlerini yönetin.",
    price: 2999,
    old_price: null,
    badge: "YENİ",
    delivery: "24 Saat",
    update_period: "1 Yıl",
    support: "60 Gün",
    active: true,
    sort_order: 4
  },

  {
    id: "support-panel",
    name: "Müşteri Destek Paneli",
    category: "Destek",
    description: "Müşteri destek süreçlerinizi yönetin.",
    price: 1899,
    old_price: 2199,
    badge: "",
    delivery: "Hemen",
    update_period: "1 Yıl",
    support: "90 Gün",
    active: true,
    sort_order: 5
  },

  {
    id: "stock-panel",
    name: "Stok & Sipariş Paneli",
    category: "İşletme",
    description: "Stok ve siparişlerinizi kolayca yönetin.",
    price: 1999,
    old_price: null,
    badge: "",
    delivery: "Hemen",
    update_period: "1 Yıl",
    support: "30 Gün",
    active: true,
    sort_order: 6
  }
];

/* =========================================================
   YARDIMCI FONKSİYONLAR
========================================================= */

function money(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.round(number * 100) / 100;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isValidProductId(value) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
    String(value || "")
  );
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
    !user ||
    !user.password_hash ||
    !user.password_salt
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

    return crypto.timingSafeEqual(
      result,
      stored
    );
  } catch {
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

function getTokenFromRequest(req) {
  const authorization =
    req.headers.authorization || "";

  if (
    authorization.startsWith("Bearer ")
  ) {
    const bearerToken =
      authorization
        .slice(7)
        .trim();

    if (bearerToken) {
      return bearerToken;
    }
  }

  const cookies = getCookies(req);

  return (
    cookies.panelmarket_token ||
    ""
  );
}

function setSessionCookie(res, token) {
  res.setHeader(
    "Set-Cookie",
    `panelmarket_token=${encodeURIComponent(
      token
    )}; Path=/; HttpOnly; SameSite=Lax`
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    "panelmarket_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax"
  );
}

/* =========================================================
   ÜRÜN FORMAT
========================================================= */

function formatProduct(product) {
  return {
    id: product.id,
    name: product.name,
    category: product.category || "",
    description: product.description || "",
    price: money(product.price),

    oldPrice:
      product.old_price === null ||
      product.old_price === undefined
        ? null
        : money(product.old_price),

    badge: product.badge || "",
    delivery:
      product.delivery || "Hemen",

    update:
      product.update_period || "1 Yıl",

    support:
      product.support || "30 Gün",

    active:
      product.active !== false,

    sortOrder:
      Number(product.sort_order || 0),

    createdAt:
      product.created_at || null,

    updatedAt:
      product.updated_at || null
  };
}

/* =========================================================
   SİPARİŞ FORMAT
========================================================= */

function formatOrder(order) {
  return {
    id: order.id,
    userId: order.user_id,
    orderNumber: order.order_number,
    productId: order.product_id,
    productName: order.product_name,
    licenseId: order.license_id,
    licenseName: order.license_name,
    amount: money(order.amount),
    status: order.status,
    deliveryStatus: order.delivery_status,
    licenseKey: order.license_key,
    createdAt: order.created_at
  };
}

/* =========================================================
   KULLANICI FORMAT
========================================================= */

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    balance: money(user.balance),
    isAdmin:
      user.is_admin === true
  };
}

/* =========================================================
   ÜRÜN BUL
========================================================= */

async function findProduct(id) {
  const {
    data,
    error
  } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/* =========================================================
   FİYAT HESAPLA
========================================================= */

function calculatePrice(
  product,
  licenseId
) {
  const license =
    licenses[licenseId];

  if (!license) {
    throw new Error(
      "Geçersiz lisans."
    );
  }

  return money(
    Number(product.price) *
      license.multiplier
  );
}

/* =========================================================
   ÜRÜN SEED
========================================================= */

async function seedProducts() {
  try {
    const {
      count,
      error
    } = await supabase
      .from("products")
      .select("id", {
        count: "exact",
        head: true
      });

    if (error) {
      console.error(
        "PRODUCT SEED CHECK ERROR:",
        error.message
      );
      return;
    }

    if ((count || 0) > 0) {
      console.log(
        "Products tablosu dolu. Seed atlanıyor."
      );
      return;
    }

    const {
      error: insertError
    } = await supabase
      .from("products")
      .insert(
        defaultProducts
      );

    if (insertError) {
      console.error(
        "PRODUCT SEED ERROR:",
        insertError.message
      );
      return;
    }

    console.log(
      "PanelMarket varsayılan ürünleri Supabase'e eklendi."
    );
  } catch (error) {
    console.error(
      "PRODUCT SEED ERROR:",
      error.message
    );
  }
}

/* =========================================================
   KULLANICI BUL
========================================================= */

async function findUserByEmail(email) {
  const {
    data,
    error
  } = await supabase
    .from("users")
    .select("*")
    .eq(
      "email",
      String(email || "")
        .trim()
        .toLowerCase()
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function findUserById(id) {
  const {
    data,
    error
  } = await supabase
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
   OTURUMU BUL
========================================================= */

async function getSessionFromRequest(req) {
  const token =
    getTokenFromRequest(req);

  if (!token) {
    return null;
  }

  const {
    data: session,
    error
  } = await supabase
    .from("sessions")
    .select(
      "token,user_id,created_at"
    )
    .eq(
      "token",
      token
    )
    .maybeSingle();

  if (error) {
    console.error(
      "SESSION QUERY ERROR:",
      error.message
    );

    return null;
  }

  if (!session) {
    return null;
  }

  return {
    token,
    session
  };
}

/* =========================================================
   MEVCUT KULLANICI
========================================================= */

async function getCurrentUser(req) {
  const auth =
    await getSessionFromRequest(
      req
    );

  if (!auth) {
    return null;
  }

  const user =
    await findUserById(
      auth.session.user_id
    );

  if (!user) {
    return null;
  }

  return {
    user,
    token: auth.token
  };
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
    const auth =
      await getCurrentUser(req);

    if (!auth) {
      return res.status(401).json({
        ok: false,
        error:
          "Oturum gerekli.",
        loginRequired: true
      });
    }

    req.user =
      auth.user;

    req.authToken =
      auth.token;

    next();
  } catch (error) {
    console.error(
      "AUTH ERROR:",
      error
    );

    return res.status(500).json({
      ok: false,
      error:
        "Oturum kontrolü başarısız."
    });
  }
}

/* =========================================================
   ADMIN MIDDLEWARE
========================================================= */

async function requireAdmin(
  req,
  res,
  next
) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        ok: false,
        error:
          "Admin girişi gerekli."
      });
    }

    /*
      Kullanıcıyı tekrar Supabase'den çekiyoruz.
      Böylece admin yetkisi eski session verisine
      değil, güncel users.is_admin değerine bağlı olur.
    */

    const {
      data: adminUser,
      error
    } = await supabase
      .from("users")
      .select(
        "id,name,email,balance,is_admin,created_at"
      )
      .eq(
        "id",
        req.user.id
      )
      .maybeSingle();

    if (error) {
      console.error(
        "ADMIN CHECK ERROR:",
        error.message
      );

      return res.status(500).json({
        ok: false,
        error:
          "Admin kontrolü yapılamadı.",
        detail:
          error.message
      });
    }

    if (!adminUser) {
      return res.status(401).json({
        ok: false,
        error:
          "Kullanıcı bulunamadı.",
        loginRequired: true
      });
    }

    if (
      adminUser.is_admin !== true
    ) {
      return res.status(403).json({
        ok: false,
        error:
          "Bu hesap admin yetkisine sahip değil.",
        isAdmin: false
      });
    }

    req.adminUser =
      adminUser;

    next();
  } catch (error) {
    console.error(
      "ADMIN AUTH ERROR:",
      error
    );

    return res.status(500).json({
      ok: false,
      error:
        "Admin doğrulama hatası."
    });
  }
}

/* =========================================================
   PUBLIC PRODUCTS
========================================================= */

app.get(
  "/api/products",
  async (req, res) => {
    try {
      const {
        data,
        error
      } = await supabase
        .from("products")
        .select("*")
        .eq(
          "active",
          true
        )
        .order(
          "sort_order",
          {
            ascending: true
          }
        )
        .order(
          "created_at",
          {
            ascending: true
          }
        );

      if (error) {
        throw error;
      }

      res.json(
        (data || []).map(
          formatProduct
        )
      );
    } catch (error) {
      console.error(
        "PRODUCTS ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Ürünler alınamadı."
      });
    }
  }
);

/* =========================================================
   TEK ÜRÜN
========================================================= */

app.get(
  "/api/products/:id",
  async (req, res) => {
    try {
      const product =
        await findProduct(
          req.params.id
        );

      if (
        !product ||
        product.active === false
      ) {
        return res.status(404).json({
          error:
            "Ürün bulunamadı."
        });
      }

      const prices = {};

      for (
        const [
          id,
          license
        ] of Object.entries(
          licenses
        )
      ) {
        prices[id] = {
          name:
            license.name,

          price:
            calculatePrice(
              product,
              id
            )
        };
      }

      res.json({
        ...formatProduct(
          product
        ),
        licenses: prices
      });
    } catch (error) {
      console.error(
        "SINGLE PRODUCT ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Ürün alınamadı."
      });
    }
  }
);

/* =========================================================
   ADMIN - ME
========================================================= */

app.get("/api/admin/me", requireAuth, requireAdmin, async (req, res) => {
  try {
    const adminUser = req.adminUser;

    if (!adminUser) {
      return res.status(403).json({
        ok: false,
        authenticated: true,
        is_admin: false,
        message: "Admin yetkisi bulunamadı."
      });
    }

    return res.json({
      ok: true,
      authenticated: true,

      is_admin: true,
      isAdmin: true,

      user: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        balance: Number(adminUser.balance || 0),
        is_admin: true,
        isAdmin: true
      },

      admin: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        balance: Number(adminUser.balance || 0),
        is_admin: true,
        isAdmin: true
      }
    });
  } catch (error) {
    console.error("ADMIN ME ERROR:", error);

    return res.status(500).json({
      ok: false,
      message: "Admin bilgisi alınamadı."
    });
  }
});

/* =========================================================
   ADMIN - PRODUCTS
========================================================= */

app.get(
  "/api/admin/products",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const {
        data,
        error
      } = await supabase
        .from("products")
        .select("*")
        .order(
          "sort_order",
          {
            ascending: true
          }
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

      res.json({
        ok: true,
        products:
          (data || []).map(
            formatProduct
          )
      });
    } catch (error) {
      console.error(
        "ADMIN PRODUCTS ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Admin ürünleri alınamadı."
      });
    }
  }
);

/* =========================================================
   ADMIN - PRODUCT CREATE
========================================================= */

app.post(
  "/api/admin/products",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const name =
        String(
          req.body.name || ""
        ).trim();

      const category =
        String(
          req.body.category || ""
        ).trim();

      const description =
        String(
          req.body.description || ""
        ).trim();

      const price =
        Number(
          req.body.price
        );

      const oldPriceRaw =
        req.body.oldPrice;

      const oldPrice =
        oldPriceRaw === "" ||
        oldPriceRaw === null ||
        oldPriceRaw === undefined
          ? null
          : Number(
              oldPriceRaw
            );

      const badge =
        String(
          req.body.badge || ""
        ).trim();

      const delivery =
        String(
          req.body.delivery ||
            "Hemen"
        ).trim();

      const updatePeriod =
        String(
          req.body.update ||
            "1 Yıl"
        ).trim();

      const support =
        String(
          req.body.support ||
            "30 Gün"
        ).trim();

      const active =
        req.body.active !== false &&
        req.body.active !== "false";

      const sortOrderRaw =
        req.body.sortOrder ??
        req.body.sort_order ??
        0;

      const sortOrder =
        Number(
          sortOrderRaw
        );

      let id =
        String(
          req.body.id || ""
        ).trim();

      if (!id) {
        id =
          slugify(name);
      }

      if (!isValidProductId(id)) {
        return res.status(400).json({
          error:
            "Ürün ID yalnızca küçük harf, rakam ve tire içerebilir."
        });
      }

      if (!name) {
        return res.status(400).json({
          error:
            "Ürün adı zorunludur."
        });
      }

      if (!category) {
        return res.status(400).json({
          error:
            "Kategori zorunludur."
        });
      }

      if (
        !Number.isFinite(price) ||
        price <= 0
      ) {
        return res.status(400).json({
          error:
            "Geçerli bir ürün fiyatı girin."
        });
      }

      if (
        oldPrice !== null &&
        (
          !Number.isFinite(
            oldPrice
          ) ||
          oldPrice < 0
        )
      ) {
        return res.status(400).json({
          error:
            "Eski fiyat geçersiz."
        });
      }

      if (
        !Number.isInteger(
          sortOrder
        )
      ) {
        return res.status(400).json({
          error:
            "Sıralama numarası tam sayı olmalıdır."
        });
      }

      const {
        data: existing,
        error:
          existingError
      } = await supabase
        .from("products")
        .select("id")
        .eq(
          "id",
          id
        )
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existing) {
        return res.status(409).json({
          error:
            "Bu ürün ID'si zaten kullanılıyor."
        });
      }

      const {
        data,
        error
      } = await supabase
        .from("products")
        .insert({
          id,
          name,
          category,
          description,
          price:
            money(price),
          old_price:
            oldPrice === null
              ? null
              : money(oldPrice),
          badge,
          delivery,
          update_period:
            updatePeriod,
          support,
          active,
          sort_order:
            sortOrder
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      res.status(201).json({
        ok: true,
        message:
          "Ürün başarıyla eklendi.",
        product:
          formatProduct(data)
      });
    } catch (error) {
      console.error(
        "ADMIN PRODUCT CREATE ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Ürün eklenemedi."
      });
    }
  }
);

/* =========================================================
   ADMIN - PRODUCT UPDATE
========================================================= */

app.put(
  "/api/admin/products/:id",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const productId =
        req.params.id;

      const {
        data: existing,
        error:
          existingError
      } = await supabase
        .from("products")
        .select("*")
        .eq(
          "id",
          productId
        )
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (!existing) {
        return res.status(404).json({
          error:
            "Ürün bulunamadı."
        });
      }

      const updates = {};

      if (
        req.body.name !==
        undefined
      ) {
        const name =
          String(
            req.body.name
          ).trim();

        if (!name) {
          return res.status(400).json({
            error:
              "Ürün adı boş olamaz."
          });
        }

        updates.name =
          name;
      }

      if (
        req.body.category !==
        undefined
      ) {
        const category =
          String(
            req.body.category
          ).trim();

        if (!category) {
          return res.status(400).json({
            error:
              "Kategori boş olamaz."
          });
        }

        updates.category =
          category;
      }

      if (
        req.body.description !==
        undefined
      ) {
        updates.description =
          String(
            req.body.description
          ).trim();
      }

      if (
        req.body.price !==
        undefined
      ) {
        const price =
          Number(
            req.body.price
          );

        if (
          !Number.isFinite(
            price
          ) ||
          price <= 0
        ) {
          return res.status(400).json({
            error:
              "Geçerli fiyat girin."
          });
        }

        updates.price =
          money(price);
      }

      if (
        req.body.oldPrice !==
        undefined
      ) {
        if (
          req.body.oldPrice ===
            "" ||
          req.body.oldPrice ===
            null
        ) {
          updates.old_price =
            null;
        } else {
          const oldPrice =
            Number(
              req.body.oldPrice
            );

          if (
            !Number.isFinite(
              oldPrice
            ) ||
            oldPrice < 0
          ) {
            return res.status(400).json({
              error:
                "Eski fiyat geçersiz."
            });
          }

          updates.old_price =
            money(oldPrice);
        }
      }

      if (
        req.body.badge !==
        undefined
      ) {
        updates.badge =
          String(
            req.body.badge
          ).trim();
      }

      if (
        req.body.delivery !==
        undefined
      ) {
        updates.delivery =
          String(
            req.body.delivery
          ).trim();
      }

      if (
        req.body.update !==
        undefined
      ) {
        updates.update_period =
          String(
            req.body.update
          ).trim();
      }

      if (
        req.body.support !==
        undefined
      ) {
        updates.support =
          String(
            req.body.support
          ).trim();
      }

      if (
        req.body.sortOrder !==
          undefined ||
        req.body.sort_order !==
          undefined
      ) {
        const sortOrder =
          Number(
            req.body.sortOrder ??
            req.body.sort_order
          );

        if (
          !Number.isInteger(
            sortOrder
          )
        ) {
          return res.status(400).json({
            error:
              "Sıralama numarası tam sayı olmalıdır."
          });
        }

        updates.sort_order =
          sortOrder;
      }

      if (
        req.body.active !==
        undefined
      ) {
        updates.active =
          req.body.active ===
            true ||
          req.body.active ===
            "true";
      }

      updates.updated_at =
        new Date().toISOString();

      const {
        data,
        error
      } = await supabase
        .from("products")
        .update(updates)
        .eq(
          "id",
          productId
        )
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      res.json({
        ok: true,
        message:
          "Ürün güncellendi.",
        product:
          formatProduct(data)
      });
    } catch (error) {
      console.error(
        "ADMIN PRODUCT UPDATE ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Ürün güncellenemedi."
      });
    }
  }
);

/* =========================================================
   ADMIN - PRODUCT STATUS
========================================================= */

app.patch(
  "/api/admin/products/:id/status",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const active =
        req.body.active ===
          true ||
        req.body.active ===
          "true";

      const {
        data,
        error
      } = await supabase
        .from("products")
        .update({
          active,
          updated_at:
            new Date().toISOString()
        })
        .eq(
          "id",
          req.params.id
        )
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      res.json({
        ok: true,

        message:
          active
            ? "Ürün aktif edildi."
            : "Ürün pasif edildi.",

        product:
          formatProduct(data)
      });
    } catch (error) {
      console.error(
        "ADMIN PRODUCT STATUS ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Ürün durumu değiştirilemedi."
      });
    }
  }
);

/* =========================================================
   ADMIN - PRODUCT DELETE
========================================================= */

app.delete(
  "/api/admin/products/:id",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const productId =
        req.params.id;

      const {
        data: product,
        error:
          findError
      } = await supabase
        .from("products")
        .select("*")
        .eq(
          "id",
          productId
        )
        .maybeSingle();

      if (findError) {
        throw findError;
      }

      if (!product) {
        return res.status(404).json({
          error:
            "Ürün bulunamadı."
        });
      }

      const {
        count,
        error:
          orderCountError
      } = await supabase
        .from("orders")
        .select("id", {
          count: "exact",
          head: true
        })
        .eq(
          "product_id",
          productId
        );

      if (orderCountError) {
        throw orderCountError;
      }

      /*
        Satılmış ürün tamamen silinmez.
        Sipariş geçmişi bozulmasın diye pasif yapılır.
      */

      if ((count || 0) > 0) {
        const {
          data,
          error
        } = await supabase
          .from("products")
          .update({
            active: false,
            updated_at:
              new Date().toISOString()
          })
          .eq(
            "id",
            productId
          )
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        return res.json({
          ok: true,
          deleted: false,
          disabled: true,

          message:
            "Bu ürün daha önce satıldığı için tamamen silinmedi. Ürün pasif hale getirildi.",

          product:
            formatProduct(data)
        });
      }

      const {
        error
      } = await supabase
        .from("products")
        .delete()
        .eq(
          "id",
          productId
        );

      if (error) {
        throw error;
      }

      res.json({
        ok: true,
        deleted: true,
        message:
          "Ürün silindi."
      });
    } catch (error) {
      console.error(
        "ADMIN PRODUCT DELETE ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Ürün silinemedi."
      });
    }
  }
);

/* =========================================================
   REGISTER
========================================================= */

app.post(
  "/api/register",
  async (req, res) => {
    try {
      const name =
        String(
          req.body.name || ""
        ).trim();

      const email =
        String(
          req.body.email || ""
        )
          .trim()
          .toLowerCase();

      const password =
        String(
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

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email
        )
      ) {
        return res.status(400).json({
          error:
            "Geçerli bir e-posta adresi girin."
        });
      }

      if (
        password.length < 8
      ) {
        return res.status(400).json({
          error:
            "Şifre en az 8 karakter olmalıdır."
        });
      }

      if (
        !/[A-Za-z]/.test(
          password
        )
      ) {
        return res.status(400).json({
          error:
            "Şifre en az bir harf içermelidir."
        });
      }

      if (
        !/[0-9]/.test(
          password
        )
      ) {
        return res.status(400).json({
          error:
            "Şifre en az bir rakam içermelidir."
        });
      }

      const existing =
        await findUserByEmail(
          email
        );

      if (existing) {
        return res.status(409).json({
          error:
            "Bu e-posta adresi zaten kayıtlı."
        });
      }

      const passwordData =
        hashPassword(
          password
        );

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
        throw error;
      }

      const token =
        createToken();

      const {
        error:
          sessionError
      } = await supabase
        .from("sessions")
        .insert({
          token,
          user_id:
            user.id
        });

      if (sessionError) {
        throw sessionError;
      }

      setSessionCookie(
        res,
        token
      );

      return res.status(201).json({
        success: true,
        token,
        user:
          publicUser(user)
      });
    } catch (error) {
      console.error(
        "REGISTER ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Kayıt sırasında bir hata oluştu."
      });
    }
  }
);

/* =========================================================
   LOGIN
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
      user_id:
        user.id
    });

  if (error) {
    throw error;
  }

  setSessionCookie(
    res,
    token
  );

  return res.json({
    success: true,
    token,
    user:
      publicUser(user)
  });
}

app.post(
  "/api/login",
  async (req, res) => {
    try {
      const email =
        String(
          req.body.email || ""
        )
          .trim()
          .toLowerCase();

      const password =
        String(
          req.body.password || ""
        );

      if (!email || !password) {
        return res.status(400).json({
          error:
            "E-posta ve şifre zorunludur."
        });
      }

      let user =
        await findUserByEmail(
          email
        );

      /*
        DEMO HESABI

        Eğer demo hesap daha önce yoksa
        oluşturulur.

        Burada admin yetkisi VERİLMEZ.
        Gerçek admin hesabı Supabase'deki
        is_admin=true üzerinden belirlenir.
      */

      if (
        !user &&
        email ===
          "demo@panelmarket.com"
      ) {
        const passwordData =
          hashPassword(
            "12345678"
          );

        const {
          data: demo,
          error
        } = await supabase
          .from("users")
          .insert({
            name:
              "Demo Kullanıcı",

            email:
              "demo@panelmarket.com",

            password_hash:
              passwordData.hash,

            password_salt:
              passwordData.salt,

            balance:
              5000,

            is_admin:
              false
          })
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        user = demo;
      }

      if (!user) {
        return res.status(401).json({
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

      res.status(500).json({
        error:
          "Giriş sırasında bir hata oluştu."
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
    try {
      const token =
        getTokenFromRequest(req);

      if (token) {
        const {
          error
        } = await supabase
          .from("sessions")
          .delete()
          .eq(
            "token",
            token
          );

        if (error) {
          console.error(
            "LOGOUT SESSION ERROR:",
            error.message
          );
        }
      }

      clearSessionCookie(
        res
      );

      res.json({
        success: true
      });
    } catch (error) {
      console.error(
        "LOGOUT ERROR:",
        error
      );

      clearSessionCookie(
        res
      );

      res.status(500).json({
        error:
          "Çıkış yapılamadı."
      });
    }
  }
);

/* =========================================================
   AUTH ME
========================================================= */

app.get(
  "/api/auth/me",
  requireAuth,
  async (req, res) => {
    res.json({
      authenticated: true,
      user:
        publicUser(
          req.user
        )
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

      res.json({
        id:
          req.user.id,

        name:
          req.user.name,

        email:
          req.user.email,

        balance:
          money(
            req.user.balance
          ),

        orderCount:
          count || 0,

        isAdmin:
          req.user.is_admin ===
          true
      });
    } catch (error) {
      console.error(
        "ACCOUNT ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Hesap bilgileri alınamadı."
      });
    }
  }
);

/* =========================================================
   BAKİYE YÜKLE
========================================================= */

app.post(
  "/api/wallet/topup",
  requireAuth,
  async (req, res) => {
    try {
      const amount =
        Number(
          req.body.amount
        );

      if (
        !Number.isFinite(
          amount
        ) ||
        amount <= 0
      ) {
        return res.status(400).json({
          error:
            "Geçerli bir bakiye miktarı girin."
        });
      }

      if (
        amount > 1000000
      ) {
        return res.status(400).json({
          error:
            "Tek işlemde en fazla 1.000.000 TL yüklenebilir."
        });
      }

      const {
        data: freshUser,
        error:
          freshUserError
      } = await supabase
        .from("users")
        .select(
          "id,balance"
        )
        .eq(
          "id",
          req.user.id
        )
        .single();

      if (freshUserError) {
        throw freshUserError;
      }

      const oldBalance =
        money(
          freshUser.balance
        );

      const newBalance =
        money(
          oldBalance +
            amount
        );

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

          type:
            "credit",

          amount:
            money(amount),

          note:
            "Bakiye yükleme"
        });

      if (transactionError) {
        console.error(
          "TRANSACTION ERROR:",
          transactionError
        );
      }

      res.json({
        success: true,
        balance:
          money(
            updatedUser.balance
          )
      });
    } catch (error) {
      console.error(
        "TOPUP ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Bakiye yüklenemedi."
      });
    }
  }
);

/* =========================================================
   SİPARİŞ OLUŞTUR
========================================================= */

app.post(
  "/api/orders",
  requireAuth,
  async (req, res) => {
    try {
      const productId =
        String(
          req.body.productId ||
            ""
        ).trim();

      const licenseId =
        String(
          req.body.licenseId ||
            ""
        ).trim();

      const product =
        await findProduct(
          productId
        );

      if (
        !product ||
        product.active === false
      ) {
        return res.status(404).json({
          error:
            "Ürün bulunamadı veya satışa kapalı."
        });
      }

      if (
        !licenses[licenseId]
      ) {
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
        money(
          freshUser.balance
        );

      if (
        balance < total
      ) {
        return res.status(400).json({
          error:
            "Yetersiz bakiye."
        });
      }

      const newBalance =
        money(
          balance -
            total
        );

      /*
        Optimistic balance update.
        Aynı anda başka işlem yapılırsa
        bakiye eşleşmez ve işlem iptal edilir.
      */

      const {
        data: updatedUser,
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
            licenses[
              licenseId
            ].name,

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
        error:
          transactionError
      } = await supabase
        .from("transactions")
        .insert({
          user_id:
            req.user.id,

          type:
            "debit",

          amount:
            total,

          note:
            `${product.name} satın alımı`
        });

      if (transactionError) {
        console.error(
          "ORDER TRANSACTION ERROR:",
          transactionError
        );
      }

      res.json({
        success: true,

        order:
          formatOrder(order),

        balance:
          money(
            updatedUser.balance
          )
      });
    } catch (error) {
      console.error(
        "ORDER ERROR:",
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
   KULLANICININ SİPARİŞLERİ
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

      res.json(
        (data || []).map(
          formatOrder
        )
      );
    } catch (error) {
      console.error(
        "ORDERS ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Siparişler alınamadı."
      });
    }
  }
);

/* =========================================================
   TEK SİPARİŞ
========================================================= */

app.get(
  "/api/orders/:id",
  requireAuth,
  async (req, res) => {
    try {
      let query =
        supabase
          .from("orders")
          .select("*")
          .eq(
            "user_id",
            req.user.id
          );

      const id =
        req.params.id;

      if (
        /^[0-9a-fA-F-]{36}$/.test(
          id
        )
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
      } = await query
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!order) {
        return res.status(404).json({
          error:
            "Sipariş bulunamadı."
        });
      }

      res.json(
        formatOrder(order)
      );
    } catch (error) {
      console.error(
        "SINGLE ORDER ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Sipariş alınamadı."
      });
    }
  }
);

/* =========================================================
   İŞLEMLER
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
              money(
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
      console.error(
        "TRANSACTIONS ERROR:",
        error
      );

      res.status(500).json({
        error:
          "İşlem geçmişi alınamadı."
      });
    }
  }
);

/* =========================================================
   HESAP GÜNCELLE
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
      console.error(
        "ACCOUNT UPDATE ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Hesap güncellenemedi."
      });
    }
  }
);

/* =========================================================
   ŞİFRE DEĞİŞTİR
========================================================= */

app.post(
  "/api/account/password",
  requireAuth,
  async (req, res) => {
    try {
      const oldPassword =
        String(
          req.body.oldPassword ||
            ""
        );

      const newPassword =
        String(
          req.body.newPassword ||
            ""
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
      console.error(
        "PASSWORD UPDATE ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Şifre değiştirilemedi."
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
        usersResult,
        ordersResult,
        productsResult,
        transactionsResult
      ] =
        await Promise.all([
          supabase
            .from("users")
            .select(
              "id,balance",
              {
                count:
                  "exact"
              }
            ),

          supabase
            .from("orders")
            .select(
              "id,amount,status,delivery_status,created_at",
              {
                count:
                  "exact"
              }
            ),

          supabase
            .from("products")
            .select(
              "id,active",
              {
                count:
                  "exact"
              }
            ),

          supabase
            .from("transactions")
            .select(
              "amount,type"
            )
        ]);

      if (
        usersResult.error
      ) {
        throw usersResult.error;
      }

      if (
        ordersResult.error
      ) {
        throw ordersResult.error;
      }

      if (
        productsResult.error
      ) {
        throw productsResult.error;
      }

      if (
        transactionsResult.error
      ) {
        throw transactionsResult.error;
      }

      const users =
        usersResult.data ||
        [];

      const orders =
        ordersResult.data ||
        [];

      const products =
        productsResult.data ||
        [];

      const transactions =
        transactionsResult.data ||
        [];

      const totalBalance =
        users.reduce(
          (
            sum,
            user
          ) =>
            sum +
            money(
              user.balance
            ),
          0
        );

      const totalSales =
        orders.reduce(
          (
            sum,
            order
          ) =>
            sum +
            money(
              order.amount
            ),
          0
        );

      const totalCredits =
        transactions
          .filter(
            transaction =>
              transaction.type ===
                "credit" ||
              transaction.type ===
                "admin_credit"
          )
          .reduce(
            (
              sum,
              transaction
            ) =>
              sum +
              money(
                transaction.amount
              ),
            0
          );

      const totalDebits =
        transactions
          .filter(
            transaction =>
              transaction.type ===
                "debit" ||
              transaction.type ===
                "admin_debit"
          )
          .reduce(
            (
              sum,
              transaction
            ) =>
              sum +
              money(
                transaction.amount
              ),
            0
          );

      res.json({
        ok: true,

        totalUsers:
          usersResult.count ||
          users.length,

        totalOrders:
          ordersResult.count ||
          orders.length,

        totalProducts:
          productsResult.count ||
          products.length,

        activeProducts:
          products.filter(
            product =>
              product.active
          ).length,

        totalBalance:
          money(
            totalBalance
          ),

        totalSales:
          money(
            totalSales
          ),

        totalCredits:
          money(
            totalCredits
          ),

        totalDebits:
          money(
            totalDebits
          )
      });
    } catch (error) {
      console.error(
        "ADMIN DASHBOARD ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Dashboard verileri alınamadı."
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
      const search =
        String(
          req.query.search ||
            ""
        ).trim();

      let query =
        supabase
          .from("users")
          .select(
            "id,name,email,balance,is_admin,created_at"
          )
          .order(
            "created_at",
            {
              ascending:
                false
            }
          );

      if (search) {
        query =
          query.or(
            `name.ilike.%${search}%,email.ilike.%${search}%`
          );
      }

      const {
        data,
        error
      } = await query;

      if (error) {
        throw error;
      }

      res.json({
        ok: true,
        users:
          data || []
      });
    } catch (error) {
      console.error(
        "ADMIN USERS ERROR:",
        error
      );

      res.status(500).json({
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
        .order(
          "created_at",
          {
            ascending:
              false
          }
        );

      if (error) {
        throw error;
      }

      res.json({
        ok: true,
        orders:
          data || []
      });
    } catch (error) {
      console.error(
        "ADMIN ORDERS ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Siparişler alınamadı."
      });
    }
  }
);

/* =========================================================
   ADMIN BAKİYE
========================================================= */

app.post(
  "/api/admin/users/:id/balance",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const userId =
        req.params.id;

      const amount =
        Number(
          req.body.amount
        );

      const type =
        String(
          req.body.type ||
            ""
        );

      const note =
        String(
          req.body.note ||
            "Admin bakiye işlemi"
        ).trim();

      if (
        !Number.isFinite(
          amount
        ) ||
        amount <= 0
      ) {
        return res.status(400).json({
          error:
            "Geçerli bir tutar girin."
        });
      }

      if (
        ![
          "credit",
          "debit"
        ].includes(type)
      ) {
        return res.status(400).json({
          error:
            "Geçersiz işlem tipi."
        });
      }

      const {
        data: user,
        error:
          userError
      } = await supabase
        .from("users")
        .select(
          "id,balance"
        )
        .eq(
          "id",
          userId
        )
        .maybeSingle();

      if (userError) {
        throw userError;
      }

      if (!user) {
        return res.status(404).json({
          error:
            "Kullanıcı bulunamadı."
        });
      }

      const currentBalance =
        money(
          user.balance
        );

      if (
        type === "debit" &&
        currentBalance <
          amount
      ) {
        return res.status(400).json({
          error:
            "Kullanıcının bakiyesi yetersiz."
        });
      }

      const newBalance =
        type === "credit"
          ? currentBalance +
            amount
          : currentBalance -
            amount;

      const {
        data:
          updatedUser,
        error:
          updateError
      } = await supabase
        .from("users")
        .update({
          balance:
            money(
              newBalance
            )
        })
        .eq(
          "id",
          userId
        )
        .select(
          "id,name,email,balance,is_admin"
        )
        .single();

      if (updateError) {
        throw updateError;
      }

      const {
        error:
          transactionError
      } = await supabase
        .from("transactions")
        .insert({
          user_id:
            userId,

          type:
            type ===
            "credit"
              ? "admin_credit"
              : "admin_debit",

          amount:
            money(amount),

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
        user:
          updatedUser
      });
    } catch (error) {
      console.error(
        "ADMIN BALANCE ERROR:",
        error
      );

      res.status(500).json({
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
      const updates = {};

      if (
        req.body.status !==
        undefined
      ) {
        updates.status =
          String(
            req.body.status
          ).trim();
      }

      if (
        req.body.delivery_status !==
        undefined
      ) {
        updates.delivery_status =
          String(
            req.body.delivery_status
          ).trim();
      }

      if (
        Object.keys(
          updates
        ).length === 0
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
        .update(
          updates
        )
        .eq(
          "id",
          req.params.id
        )
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.json({
        ok: true,
        order:
          data
      });
    } catch (error) {
      console.error(
        "ADMIN ORDER UPDATE ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Sipariş güncellenemedi."
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
        .order(
          "created_at",
          {
            ascending:
              false
          }
        )
        .limit(200);

      if (error) {
        throw error;
      }

      res.json({
        ok: true,
        transactions:
          data || []
      });
    } catch (error) {
      console.error(
        "ADMIN TRANSACTIONS ERROR:",
        error
      );

      res.status(500).json({
        error:
          "İşlemler alınamadı."
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
          "Supabase bağlantı hatası",

        error:
          error.message
      });
    }
  }
);

/* =========================================================
   STATİK DOSYALAR
========================================================= */

app.use(
  express.static(
    __dirname,
    {
      extensions: [
        "html"
      ]
    }
  )
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
  "admin"
];

for (
  const page of pages
) {
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

/* =========================================================
   ANA SAYFA
========================================================= */

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
   API 404
========================================================= */

app.use(
  (req, res, next) => {
    if (
      req.path.startsWith(
        "/api/"
      )
    ) {
      return res.status(404).json({
        ok: false,
        error:
          "API adresi bulunamadı."
      });
    }

    next();
  }
);

/* =========================================================
   GENEL 404
========================================================= */

app.use(
  (req, res) => {
    res.status(404).send(`
<!doctype html>
<html lang="tr">
<head>
<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1.0"
>

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
    0 25px 80px
    rgba(0,0,0,.35);
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

<h1>
Sayfa bulunamadı
</h1>

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
   SUNUCUYU BAŞLAT
========================================================= */

async function startServer() {
  try {
    await seedProducts();

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
          " Session sistemi: AKTİF"
        );
        console.log(
          " Admin doğrulama: AKTİF"
        );
        console.log(
          " Ürün sistemi: AKTİF"
        );
        console.log(
          " Sipariş sistemi: AKTİF"
        );
        console.log(
          " Bakiye sistemi: AKTİF"
        );
        console.log(
          "================================="
        );
        console.log("");
      }
    );
  } catch (error) {
    console.error(
      "SERVER START ERROR:",
      error
    );

    process.exit(1);
  }
}

startServer();
