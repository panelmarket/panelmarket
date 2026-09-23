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
  console.error("SUPABASE AYARLARI EKSİK");
  console.error(
    "SUPABASE_URL:",
    !!SUPABASE_URL
  );
  console.error(
    "SUPABASE_SERVICE_ROLE_KEY:",
    !!SUPABASE_SERVICE_ROLE_KEY
  );

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

app.use(
  express.json({
    limit: "5mb"
  })
);

app.use(
  express.urlencoded({
    extended: true
  })
);


/* =========================================================
   PRODUCTS
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
    support: "30 Gün",
    active: true,
    sortOrder: 1
  },

  {
    id: "ecommerce-panel",
    name: "E-Ticaret Yönetim Paneli",
    category: "E-Ticaret",
    description:
      "E-ticaret sitenizi tek panelden yönetin.",
    price: 2799,
    oldPrice: 3499,
    badge: "%20 İNDİRİM",
    delivery: "Hemen",
    update: "1 Yıl",
    support: "60 Gün",
    active: true,
    sortOrder: 2
  },

  {
    id: "company-panel",
    name: "Firma Yönetim Paneli",
    category: "İşletme",
    description:
      "Firmalar için profesyonel yönetim sistemi.",
    price: 1799,
    oldPrice: null,
    badge: "",
    delivery: "Hemen",
    update: "6 Ay",
    support: "30 Gün",
    active: true,
    sortOrder: 3
  },

  {
    id: "finance-panel",
    name: "Finans & Muhasebe Paneli",
    category: "Finans",
    description:
      "Finans ve muhasebe işlemlerini yönetin.",
    price: 2999,
    oldPrice: null,
    badge: "YENİ",
    delivery: "24 Saat",
    update: "1 Yıl",
    support: "60 Gün",
    active: true,
    sortOrder: 4
  },

  {
    id: "support-panel",
    name: "Müşteri Destek Paneli",
    category: "Destek",
    description:
      "Müşteri destek süreçlerinizi yönetin.",
    price: 1899,
    oldPrice: 2199,
    badge: "",
    delivery: "Hemen",
    update: "1 Yıl",
    support: "90 Gün",
    active: true,
    sortOrder: 5
  },

  {
    id: "stock-panel",
    name: "Stok & Sipariş Paneli",
    category: "İşletme",
    description:
      "Stok ve siparişlerinizi kolayca yönetin.",
    price: 1999,
    oldPrice: null,
    badge: "",
    delivery: "Hemen",
    update: "1 Yıl",
    support: "30 Gün",
    active: true,
    sortOrder: 6
  }
];


/* =========================================================
   LICENSES
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
   MONEY
   ========================================================= */

const money = value => {
  const n = Number(value || 0);

  return Number.isFinite(n)
    ? Math.round(n * 100) / 100
    : 0;
};


/* =========================================================
   PRODUCT HELPERS
   ========================================================= */

const findProduct = id =>
  products.find(
    p => p.id === id
  );


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


function formatProduct(p) {

  const product = {
    id: p.id,

    name: p.name,

    category:
      p.category || "",

    description:
      p.description || "",

    price:
      money(p.price),

    oldPrice:
      p.oldPrice ??
      p.old_price ??
      null,

    badge:
      p.badge || "",

    delivery:
      p.delivery ||
      "Hemen",

    update:
      p.update ||
      p.update_period ||
      "1 Yıl",

    support:
      p.support ||
      "30 Gün",

    active:
      p.active !== false,

    sortOrder:
      Number(
        p.sortOrder ??
        p.sort_order ??
        0
      ),

    image_url:
      p.image_url || ""
  };


  const licenseCatalog = {};


  for (
    const [
      licenseId,
      license
    ]
    of Object.entries(
      licenses
    )
  ) {

    licenseCatalog[
      licenseId
    ] = {

      id:
        licenseId,

      licenseId:
        licenseId,

      name:
        license.name,

      licenseName:
        license.name,

      price:
        calculatePrice(
          product,
          licenseId
        )
    };
  }


  product.licenses =
    licenseCatalog;

  product.licenseOptions =
    Object.values(
      licenseCatalog
    );


  product.licenseId =
    "1-site";

  product.license_id =
    "1-site";

  product.licenseName =
    licenses[
      "1-site"
    ].name;

  product.license_name =
    licenses[
      "1-site"
    ].name;


  return product;
}


async function getProductById(
  id
) {

  const productId =
    String(id || "")
      .trim()
      .toLowerCase();


  if (!productId) {
    return null;
  }


  try {

    const {
      data,
      error
    } =
      await supabase
        .from("products")
        .select("*")
        .eq(
          "id",
          productId
        )
        .eq(
          "active",
          true
        )
        .maybeSingle();


    if (
      !error &&
      data
    ) {

      return formatProduct(
        data
      );
    }


    if (error) {

      console.error(
        "PRODUCT DB LOOKUP ERROR:",
        error.message
      );
    }

  } catch (e) {

    console.error(
      "PRODUCT DB LOOKUP EXCEPTION:",
      e.message
    );
  }


  const fallback =
    products.find(
      p =>
        p.id === productId &&
        p.active !== false
    );


  return fallback
    ? formatProduct(
        fallback
      )
    : null;
}


/* =========================================================
   ORDER / LICENSE HELPERS
   ========================================================= */

const createOrderNumber = () =>
  `PM-${new Date().getFullYear()}-${crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase()}`;


const createLicenseKey = () =>
  `PMK-${crypto
    .randomBytes(12)
    .toString("hex")
    .toUpperCase()}`;


const createToken = () =>
  crypto
    .randomBytes(32)
    .toString("hex");


function formatOrder(o) {

  return {

    id:
      o.id,

    userId:
      o.user_id,

    orderNumber:
      o.order_number,

    productId:
      o.product_id,

    productName:
      o.product_name,

    licenseId:
      o.license_id,

    licenseName:
      o.license_name,

    amount:
      money(o.amount),

    status:
      o.status,

    deliveryStatus:
      o.delivery_status,

    licenseKey:
      o.license_key,

    createdAt:
      o.created_at
  };
}


/* =========================================================
   PASSWORD
   ========================================================= */

function hashPassword(
  password,
  salt =
    crypto.randomBytes(
      16
    ).toString("hex")
) {

  return {

    hash:
      crypto
        .scryptSync(
          password,
          salt,
          64
        )
        .toString("hex"),

    salt
  };
}


function verifyPassword(
  password,
  user
) {

  if (
    !user?.password_hash ||
    !user?.password_salt
  ) {
    return false;
  }


  try {

    const result =
      crypto.scryptSync(
        password,
        user.password_salt,
        64
      );

    const stored =
      Buffer.from(
        user.password_hash,
        "hex"
      );


    return (
      result.length ===
        stored.length &&
      crypto.timingSafeEqual(
        result,
        stored
      )
    );

  } catch {

    return false;
  }
}


/* =========================================================
   COOKIES / SESSION
   ========================================================= */

function getCookies(
  req
) {

  const header =
    req.headers.cookie;

  if (!header) {
    return {};
  }


  const cookies = {};


  for (
    const item of
    header.split(";")
  ) {

    const i =
      item.indexOf("=");


    if (i === -1) {
      continue;
    }


    const key =
      item
        .slice(0, i)
        .trim();


    const value =
      item
        .slice(i + 1)
        .trim();


    try {

      cookies[key] =
        decodeURIComponent(
          value
        );

    } catch {

      cookies[key] =
        value;
    }
  }


  return cookies;
}


function getTokenFromRequest(
  req
) {

  const auth =
    String(
      req.headers.authorization ||
      ""
    ).trim();


  const match =
    auth.match(
      /^Bearer\s+(.+)$/i
    );


  if (
    match?.[1]?.trim()
  ) {

    return match[1].trim();
  }


  return String(
    getCookies(req)
      .panelmarket_token ||
      ""
  ).trim();
}


function setSessionCookie(
  res,
  token
) {

  const cookie = [

    `panelmarket_token=${encodeURIComponent(
      token
    )}`,

    "Path=/",

    "HttpOnly",

    "SameSite=Lax",

    "Max-Age=2592000"
  ];


  if (
    process.env.NODE_ENV ===
    "production"
  ) {

    cookie.push(
      "Secure"
    );
  }


  res.setHeader(
    "Set-Cookie",
    cookie.join("; ")
  );
}


function clearSessionCookie(
  res
) {

  res.setHeader(
    "Set-Cookie",
    "panelmarket_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
  );
}


/* =========================================================
   PUBLIC USER
   ========================================================= */

function publicUser(
  user
) {

  return {

    id:
      user.id,

    name:
      user.name || "",

    email:
      user.email || "",

    balance:
      money(user.balance),

    isAdmin:
      user.is_admin === true,

    is_admin:
      user.is_admin === true
  };
}


/* =========================================================
   USER HELPERS
   ========================================================= */

async function findUserByEmail(
  email
) {

  const normalizedEmail =
    String(email || "")
      .trim()
      .toLowerCase();


  if (!normalizedEmail) {
    return null;
  }


  const {
    data,
    error
  } =
    await supabase
      .from("users")
      .select("*")
      .ilike(
        "email",
        normalizedEmail
      )
      .limit(1);


  if (error) {

    console.error(
      "FIND USER BY EMAIL ERROR:",
      error
    );

    throw error;
  }


  return Array.isArray(data) &&
    data.length > 0
    ? data[0]
    : null;
}


async function findUserById(
  id
) {

  const {
    data,
    error
  } =
    await supabase
      .from("users")
      .select("*")
      .eq(
        "id",
        id
      )
      .maybeSingle();


  if (error) {
    throw error;
  }


  return data;
}


/* =========================================================
   SESSION
   ========================================================= */

async function getSessionFromRequest(
  req
) {

  const token =
    getTokenFromRequest(
      req
    );


  if (!token) {
    return null;
  }


  const {
    data: session,
    error
  } =
    await supabase
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


  const user =
    await findUserById(
      session.user_id
    );


  if (!user) {

    await supabase
      .from("sessions")
      .delete()
      .eq(
        "token",
        token
      );

    return null;
  }


  return {
    token,
    session,
    user
  };
}


async function requireAuth(
  req,
  res,
  next
) {

  try {

    const auth =
      await getSessionFromRequest(
        req
      );


    if (!auth) {

      return res.status(401).json({

        ok: false,

        authenticated: false,

        error:
          "Oturum gerekli.",

        loginRequired:
          true
      });
    }


    /*
     * ÖNEMLİ:
     * req.user burada her istekte
     * Supabase'den güncel olarak geliyor.
     *
     * Böylece bakiye eski session
     * değerinden okunmuyor.
     */

    req.user =
      auth.user;

    req.authToken =
      auth.token;


    next();

  } catch (e) {

    console.error(
      "AUTH ERROR:",
      e
    );


    res.status(500).json({

      ok: false,

      error:
        "Oturum kontrolü başarısız."
    });
  }
}


async function requireAdmin(
  req,
  res,
  next
) {

  if (!req.user?.id) {

    return res.status(401).json({

      ok: false,

      authenticated: false,

      error:
        "Admin girişi gerekli.",

      loginRequired:
        true
    });
  }


  try {

    const {
      data: user,
      error
    } =
      await supabase
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
      throw error;
    }


    if (!user) {

      return res.status(401).json({

        ok: false,

        authenticated: false,

        error:
          "Kullanıcı bulunamadı.",

        loginRequired:
          true
      });
    }


    if (
      user.is_admin !== true
    ) {

      return res.status(403).json({

        ok: false,

        authenticated: true,

        is_admin: false,

        isAdmin: false,

        error:
          "Bu hesap admin yetkisine sahip değil."
      });
    }


    req.adminUser =
      user;


    next();

  } catch (e) {

    console.error(
      "ADMIN AUTH ERROR:",
      e
    );


    res.status(500).json({

      ok: false,

      error:
        "Admin doğrulama hatası."
    });
  }
}


/* =========================================================
   PRODUCT IMAGE STORAGE
   ========================================================= */

const PRODUCT_IMAGE_BUCKET =
  "product-images";


async function ensureProductImageBucket() {

  try {

    const {
      data: buckets,
      error
    } =
      await supabase
        .storage
        .listBuckets();


    if (error) {
      throw error;
    }


    const exists =
      Array.isArray(
        buckets
      ) &&
      buckets.some(
        bucket =>
          bucket.name ===
          PRODUCT_IMAGE_BUCKET
      );


    if (!exists) {

      const {
        error: createError
      } =
        await supabase
          .storage
          .createBucket(
            PRODUCT_IMAGE_BUCKET,
            {
              public: true
            }
          );


      if (
        createError &&
        !String(
          createError.message || ""
        )
          .toLowerCase()
          .includes(
            "already exists"
          )
      ) {

        throw createError;
      }


      console.log(
        "PRODUCT IMAGE BUCKET OLUŞTURULDU:",
        PRODUCT_IMAGE_BUCKET
      );
    }

  } catch (error) {

    console.error(
      "PRODUCT IMAGE BUCKET ERROR:",
      error
    );

    throw error;
  }
}


async function uploadProductImage(
  imageData,
  productId
) {

  const value =
    String(
      imageData || ""
    ).trim();


  if (!value) {
    return "";
  }


  if (
    /^https?:\/\//i.test(
      value
    )
  ) {

    return value;
  }


  const match =
    value.match(
      /^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i
    );


  if (!match) {

    throw new Error(
      "Geçersiz ürün görseli formatı."
    );
  }


  const contentType =
    String(
      match[1] || ""
    ).toLowerCase();


  const base64Data =
    String(
      match[2] || ""
    );


  if (!base64Data) {

    throw new Error(
      "Ürün görseli boş."
    );
  }


  const buffer =
    Buffer.from(
      base64Data,
      "base64"
    );


  if (
    buffer.length >
    5 * 1024 * 1024
  ) {

    throw new Error(
      "Ürün görseli 5 MB'dan büyük olamaz."
    );
  }


  await ensureProductImageBucket();


  let extension =
    "webp";


  if (
    contentType.includes(
      "png"
    )
  ) {

    extension =
      "png";

  } else if (
    contentType.includes(
      "jpeg"
    ) ||
    contentType.includes(
      "jpg"
    )
  ) {

    extension =
      "jpg";
  }


  const safeProductId =
    String(
      productId ||
      "product"
    )
      .toLowerCase()
      .replace(
        /[^a-z0-9-]/g,
        "-"
      );


  const fileName =
    `${safeProductId}-${Date.now()}-${crypto
      .randomBytes(4)
      .toString("hex")}.${extension}`;


  const {
    error
  } =
    await supabase
      .storage
      .from(
        PRODUCT_IMAGE_BUCKET
      )
      .upload(
        fileName,
        buffer,
        {
          contentType:
            contentType ===
            "image/jpg"
              ? "image/jpeg"
              : contentType,

          upsert: true,

          cacheControl:
            "31536000"
        }
      );


  if (error) {

    console.error(
      "PRODUCT IMAGE UPLOAD ERROR:",
      error
    );

    throw new Error(
      `Ürün görseli yüklenemedi: ${error.message}`
    );
  }


  const {
    data: publicData
  } =
    supabase
      .storage
      .from(
        PRODUCT_IMAGE_BUCKET
      )
      .getPublicUrl(
        fileName
      );


  const publicUrl =
    publicData?.publicUrl ||
    "";


  if (!publicUrl) {

    throw new Error(
      "Ürün görseli için public URL oluşturulamadı."
    );
  }


  console.log(
    "PRODUCT IMAGE UPLOADED:",
    {
      productId,
      fileName,
      publicUrl
    }
  );


  return publicUrl;
}


/* =========================================================
   PUBLIC PRODUCTS
   ========================================================= */

app.get(
  "/api/products",
  async (
    req,
    res
  ) => {

    try {

      const {
        data,
        error
      } =
        await supabase
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
          );


      if (error) {

        console.error(
          "PRODUCTS DB ERROR:",
          error
        );


        return res.status(500).json({

          ok: false,

          error:
            "Ürünler veritabanından alınamadı.",

          databaseError:
            error.message
        });
      }


      const dbProducts =
        Array.isArray(data)
          ? data.map(
              formatProduct
            )
          : [];


      return res.json(
        dbProducts
      );

    } catch (e) {

      console.error(
        "PRODUCTS DB EXCEPTION:",
        e
      );


      return res.status(500).json({

        ok: false,

        error:
          "Ürünler alınamadı.",

        databaseError:
          e?.message ||
          null
      });
    }
  }
);


/* =========================================================
   PRODUCT DETAIL
   ========================================================= */

app.get(
  "/api/products/:id",
  async (
    req,
    res
  ) => {

    try {

      const product =
        await getProductById(
          req.params.id
        );


      if (!product) {

        return res.status(404).json({

          ok: false,

          error:
            "Ürün bulunamadı."
        });
      }


      const licensesObject =
        {};

      const licensesArray =
        [];


      for (
        const [
          licenseId,
          license
        ]
        of Object.entries(
          licenses
        )
      ) {

        const item = {

          id:
            licenseId,

          licenseId:
            licenseId,

          license_id:
            licenseId,

          name:
            license.name,

          licenseName:
            license.name,

          license_name:
            license.name,

          multiplier:
            license.multiplier,

          price:
            calculatePrice(
              product,
              licenseId
            )
        };


        licensesObject[
          licenseId
        ] = item;

        licensesArray.push(
          item
        );
      }


      return res.json({

        ...product,

        licenses:
          licensesObject,

        licenseOptions:
          licensesArray,

        licenseId:
          "1-site",

        license_id:
          "1-site",

        licenseName:
          licenses[
            "1-site"
          ].name,

        license_name:
          licenses[
            "1-site"
          ].name
      });

    } catch (e) {

      console.error(
        "PRODUCT DETAIL ERROR:",
        e
      );


      return res.status(500).json({

        ok: false,

        error:
          "Ürün alınamadı.",

        databaseError:
          e?.message ||
          null
      });
    }
  }
);


/* =========================================================
   REGISTER
   ========================================================= */

app.post(
  "/api/register",
  async (
    req,
    res
  ) => {

    try {

      const name =
        String(
          req.body.name ||
          ""
        ).trim();

      const email =
        String(
          req.body.email ||
          ""
        )
          .trim()
          .toLowerCase();

      const password =
        String(
          req.body.password ||
          ""
        );


      if (!name) {

        return res.status(400).json({

          error:
            "Ad soyad alanı zorunludur."
        });
      }


      if (
        !email ||
        !email.includes("@")
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


      if (
        await findUserByEmail(
          email
        )
      ) {

        return res.status(409).json({

          error:
            "Bu e-posta adresi zaten kayıtlı."
        });
      }


      const pw =
        hashPassword(
          password
        );


      const {
        data: user,
        error
      } =
        await supabase
          .from("users")
          .insert({

            name,

            email,

            password_hash:
              pw.hash,

            password_salt:
              pw.salt,

            /*
             * YENİ HESAP
             * GERÇEK BAKİYE = 0
             */
            balance:
              0,

            is_admin:
              false

          })
          .select("*")
          .single();


      if (error) {
        throw error;
      }


      const token =
        createToken();


      const {
        error: se
      } =
        await supabase
          .from("sessions")
          .insert({

            token,

            user_id:
              user.id

          });


      if (se) {
        throw se;
      }


      setSessionCookie(
        res,
        token
      );


      res.status(201).json({

        ok: true,

        success: true,

        authenticated:
          true,

        token,

        user:
          publicUser(user)
      });

    } catch (e) {

      console.error(
        "REGISTER ERROR:",
        e
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

      ok: false,

      success: false,

      authenticated:
        false,

      error:
        "E-posta veya şifre hatalı."
    });
  }


  const token =
    createToken();


  const {
    data: session,
    error
  } =
    await supabase
      .from("sessions")
      .insert({

        token,

        user_id:
          user.id

      })
      .select(
        "token,user_id,created_at"
      )
      .single();


  if (error) {
    throw error;
  }


  setSessionCookie(
    res,
    token
  );


  return res.status(200).json({

    ok: true,

    success: true,

    authenticated:
      true,

    token,

    is_admin:
      user.is_admin ===
      true,

    isAdmin:
      user.is_admin ===
      true,

    user:
      publicUser(user)
  });
}


app.post(
  "/api/login",
  async (
    req,
    res
  ) => {

    try {

      const email =
        String(
          req.body.email ||
          ""
        )
          .trim()
          .toLowerCase();


      const password =
        String(
          req.body.password ||
          ""
        );


      if (
        !email ||
        !password
      ) {

        return res.status(400).json({

          ok: false,

          success: false,

          authenticated:
            false,

          error:
            "E-posta ve şifre zorunludur."
        });
      }


      const user =
        await findUserByEmail(
          email
        );


      if (!user) {

        return res.status(401).json({

          ok: false,

          success: false,

          authenticated:
            false,

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

          ok: false,

          success: false,

          authenticated:
            false,

          error:
            "E-posta veya şifre hatalı."
        });
      }


      return await loginUser(
        user,
        password,
        res
      );

    } catch (e) {

      console.error(
        "LOGIN ERROR:",
        e
      );


      return res.status(500).json({

        ok: false,

        success: false,

        authenticated:
          false,

        error:
          "Giriş sırasında bir hata oluştu.",

        databaseError:
          e?.message ||
          null
      });
    }
  }
);


/* =========================================================
   ADMIN LOGIN
   ========================================================= */

app.post(
  "/api/admin/login",
  async (
    req,
    res
  ) => {

    try {

      const email =
        String(
          req.body.email ||
          ""
        )
          .trim()
          .toLowerCase();

      const password =
        String(
          req.body.password ||
          ""
        );


      if (
        !email ||
        !password
      ) {

        return res.status(400).json({

          ok: false,

          success: false,

          authenticated:
            false,

          error:
            "E-posta ve şifre zorunludur."
        });
      }


      let user =
        null;


      if (
        email ===
        "demo@panelmarket.com"
      ) {

        const ADMIN_ID =
          "36002d6d-f4d4-4c4a-a03f-56076c6bf6eb";


        const {
          data,
          error
        } =
          await supabase
            .from("users")
            .select("*")
            .eq(
              "id",
              ADMIN_ID
            )
            .single();


        if (error) {

          console.error(
            "DEMO ADMIN QUERY ERROR:",
            error
          );


          return res.status(500).json({

            ok: false,

            success: false,

            authenticated:
              false,

            error:
              "Admin hesabı veritabanından okunamadı.",

            databaseError:
              error.message
          });
        }


        user =
          data;

      } else {

        const {
          data,
          error
        } =
          await supabase
            .from("users")
            .select("*")
            .eq(
              "email",
              email
            )
            .maybeSingle();


        if (error) {

          return res.status(500).json({

            ok: false,

            success: false,

            authenticated:
              false,

            error:
              "Kullanıcı sorgulanamadı.",

            databaseError:
              error.message
          });
        }


        user =
          data;
      }


      if (!user) {

        return res.status(401).json({

          ok: false,

          success: false,

          authenticated:
            false,

          error:
            "Kullanıcı bulunamadı."
        });
      }


      if (
        user.is_admin !==
        true
      ) {

        return res.status(403).json({

          ok: false,

          success: false,

          authenticated:
            false,

          is_admin:
            false,

          isAdmin:
            false,

          error:
            "Bu hesap admin yetkisine sahip değil."
        });
      }


      if (
        !verifyPassword(
          password,
          user
        )
      ) {

        return res.status(401).json({

          ok: false,

          success: false,

          authenticated:
            false,

          error:
            "E-posta veya şifre hatalı."
        });
      }


      const token =
        createToken();


      const {
        error:
          sessionError
      } =
        await supabase
          .from("sessions")
          .insert({

            token,

            user_id:
              user.id

          })
          .select(
            "token,user_id,created_at"
          )
          .single();


      if (
        sessionError
      ) {

        return res.status(500).json({

          ok: false,

          success: false,

          authenticated:
            false,

          error:
            "Admin oturumu oluşturulamadı.",

          databaseError:
            sessionError.message
        });
      }


      setSessionCookie(
        res,
        token
      );


      return res.status(200).json({

        ok: true,

        success: true,

        authenticated:
          true,

        token,

        is_admin:
          true,

        isAdmin:
          true,

        user:
          publicUser(user)
      });

    } catch (e) {

      console.error(
        "ADMIN LOGIN ERROR:",
        e
      );


      return res.status(500).json({

        ok: false,

        success: false,

        authenticated:
          false,

        error:
          "Admin girişi sırasında bir hata oluştu.",

        databaseError:
          e?.message ||
          null
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
  async (
    req,
    res
  ) => {

    const u =
      req.adminUser;


    const user = {

      id:
        u.id,

      name:
        u.name || "",

      email:
        u.email || "",

      balance:
        money(u.balance),

      is_admin:
        true,

      isAdmin:
        true
    };


    res.json({

      ok: true,

      authenticated:
        true,

      is_admin:
        true,

      isAdmin:
        true,

      user,

      admin:
        user
    });
  }
);


/* =========================================================
   PASSWORD RESET
   ========================================================= */

const PASSWORD_RESET_SECRET =
  String(
    process.env.PASSWORD_RESET_SECRET ||
    ""
  ).trim();


const PUBLIC_BASE_URL =
  String(
    process.env.PUBLIC_BASE_URL ||
    "https://panelmarket.onrender.com"
  )
    .trim()
    .replace(
      /\/+$/,
      ""
    );


const PASSWORD_RESET_EXPIRE_SECONDS =
  30 * 60;


if (
  !PASSWORD_RESET_SECRET
) {

  console.warn(
    "UYARI: PASSWORD_RESET_SECRET Render Environment Variables içinde tanımlı değil."
  );
}


const GOOGLE_CLIENT_ID =
  String(
    process.env.GOOGLE_CLIENT_ID ||
    ""
  ).trim();


const GOOGLE_CLIENT_SECRET =
  String(
    process.env.GOOGLE_CLIENT_SECRET ||
    ""
  ).trim();


const GOOGLE_REFRESH_TOKEN =
  String(
    process.env.GOOGLE_REFRESH_TOKEN ||
    ""
  ).trim();


const GOOGLE_REDIRECT_URI =
  `${PUBLIC_BASE_URL}/oauth/google/callback`;


const GMAIL_SEND_SCOPE =
  "https://www.googleapis.com/auth/gmail.send";


function createPasswordResetToken(
  user
) {

  if (
    !PASSWORD_RESET_SECRET
  ) {

    throw new Error(
      "PASSWORD_RESET_SECRET tanımlı değil."
    );
  }


  const expires =
    Math.floor(
      Date.now() / 1000
    ) +
    PASSWORD_RESET_EXPIRE_SECONDS;


  const payload = {

    uid:
      String(user.id),

    email:
      String(
        user.email || ""
      )
        .trim()
        .toLowerCase(),

    exp:
      expires,

    type:
      "password-reset"
  };


  const encodedPayload =
    Buffer
      .from(
        JSON.stringify(
          payload
        ),
        "utf8"
      )
      .toString(
        "base64url"
      );


  const signature =
    crypto
      .createHmac(
        "sha256",
        PASSWORD_RESET_SECRET
      )
      .update(
        encodedPayload
      )
      .digest(
        "base64url"
      );


  return `${encodedPayload}.${signature}`;
}


function verifyPasswordResetToken(
  token
) {

  try {

    if (
      !PASSWORD_RESET_SECRET
    ) {
      return null;
    }


    const parts =
      String(
        token || ""
      )
        .trim()
        .split(".");


    if (
      parts.length !== 2
    ) {
      return null;
    }


    const encodedPayload =
      parts[0];

    const receivedSignature =
      parts[1];


    const expectedSignature =
      crypto
        .createHmac(
          "sha256",
          PASSWORD_RESET_SECRET
        )
        .update(
          encodedPayload
        )
        .digest(
          "base64url"
        );


    const receivedBuffer =
      Buffer.from(
        receivedSignature,
        "utf8"
      );


    const expectedBuffer =
      Buffer.from(
        expectedSignature,
        "utf8"
      );


    if (
      receivedBuffer.length !==
      expectedBuffer.length
    ) {
      return null;
    }


    if (
      !crypto.timingSafeEqual(
        receivedBuffer,
        expectedBuffer
      )
    ) {
      return null;
    }


    const payload =
      JSON.parse(
        Buffer
          .from(
            encodedPayload,
            "base64url"
          )
          .toString("utf8")
      );


    if (
      !payload ||
      !payload.uid ||
      !payload.email ||
      !payload.exp ||
      payload.type !==
        "password-reset"
    ) {
      return null;
    }


    const now =
      Math.floor(
        Date.now() / 1000
      );


    if (
      Number(payload.exp) <=
      now
    ) {
      return null;
    }


    return payload;

  } catch (e) {

    console.error(
      "PASSWORD RESET TOKEN ERROR:",
      e.message
    );


    return null;
  }
}


/* =========================================================
   GOOGLE OAUTH START
   ========================================================= */

app.get(
  "/oauth/google/start",
  (
    req,
    res
  ) => {

    try {

      if (
        !GOOGLE_CLIENT_ID
      ) {

        return res
          .status(500)
          .send(`
            <h2>Google OAuth yapılandırılmamış</h2>
            <p>GOOGLE_CLIENT_ID Render Environment Variables içinde yok.</p>
          `);
      }


      const params =
        new URLSearchParams({

          client_id:
            GOOGLE_CLIENT_ID,

          redirect_uri:
            GOOGLE_REDIRECT_URI,

          response_type:
            "code",

          scope:
            GMAIL_SEND_SCOPE,

          access_type:
            "offline",

          prompt:
            "consent"
        });


      const googleUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;


      return res.redirect(
        googleUrl
      );

    } catch (error) {

      console.error(
        "GOOGLE OAUTH START ERROR:",
        error
      );


      return res
        .status(500)
        .send(`
          <h2>Google OAuth başlatılamadı</h2>
          <p>${String(
            error?.message ||
            "Bilinmeyen hata"
          )}</p>
        `);
    }
  }
);


/* =========================================================
   GOOGLE OAUTH CALLBACK
   ========================================================= */

app.get(
  "/oauth/google/callback",
  async (
    req,
    res
  ) => {

    try {

      const code =
        String(
          req.query.code ||
          ""
        ).trim();


      const oauthError =
        String(
          req.query.error ||
          ""
        ).trim();


      if (oauthError) {

        return res
          .status(400)
          .send(`
            <!doctype html>
            <html lang="tr">
            <head>
              <meta charset="UTF-8">
              <title>Google OAuth</title>
            </head>
            <body style="
              margin:0;
              min-height:100vh;
              display:grid;
              place-items:center;
              background:#0b1118;
              color:#fff;
              font-family:Arial,sans-serif;
            ">
              <div style="
                max-width:650px;
                padding:35px;
                background:#111a24;
                border-radius:18px;
              ">
                <h2>Google yetkilendirmesi iptal edildi</h2>
                <p>Google hata kodu:</p>
                <pre>${oauthError}</pre>
              </div>
            </body>
            </html>
          `);
      }


      if (!code) {

        return res
          .status(400)
          .send(
            "<h2>Google authorization code bulunamadı.</h2>"
          );
      }


      if (!GOOGLE_CLIENT_ID) {

        throw new Error(
          "GOOGLE_CLIENT_ID Render Environment Variables içinde yok."
        );
      }


      if (!GOOGLE_CLIENT_SECRET) {

        throw new Error(
          "GOOGLE_CLIENT_SECRET Render Environment Variables içinde yok."
        );
      }


      const tokenResponse =
        await fetch(
          "https://oauth2.googleapis.com/token",
          {

            method:
              "POST",

            headers: {

              "Content-Type":
                "application/x-www-form-urlencoded"
            },

            body:
              new URLSearchParams({

                code,

                client_id:
                  GOOGLE_CLIENT_ID,

                client_secret:
                  GOOGLE_CLIENT_SECRET,

                redirect_uri:
                  GOOGLE_REDIRECT_URI,

                grant_type:
                  "authorization_code"
              })
          }
        );


      const tokenData =
        await tokenResponse.json();


      if (
        !tokenResponse.ok
      ) {

        throw new Error(
          tokenData?.error_description ||
          tokenData?.error ||
          "Google token alınamadı."
        );
      }


      const refreshToken =
        String(
          tokenData?.refresh_token ||
          ""
        ).trim();


      if (!refreshToken) {

        throw new Error(
          "Google refresh token göndermedi. OAuth ekranında yeniden izin verin."
        );
      }


      const safeToken =
        refreshToken
          .replace(
            /&/g,
            "&amp;"
          )
          .replace(
            /</g,
            "&lt;"
          )
          .replace(
            />/g,
            "&gt;"
          )
          .replace(
            /"/g,
            "&quot;"
          );


      return res.send(`
<!doctype html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PanelMarket Gmail OAuth</title>

<style>
body{
  margin:0;
  min-height:100vh;
  display:grid;
  place-items:center;
  background:#070a0f;
  color:#fff;
  font-family:Arial,sans-serif;
}

.box{
  width:min(700px,calc(100% - 30px));
  box-sizing:border-box;
  padding:32px;
  background:#101720;
  border:1px solid #243241;
  border-radius:20px;
}

h1{
  margin-top:0;
}

p{
  color:#b9c3cf;
  line-height:1.6;
}

textarea{
  width:100%;
  height:130px;
  box-sizing:border-box;
  padding:15px;
  border-radius:12px;
  border:1px solid #344455;
  background:#070b10;
  color:#fff;
  font-family:monospace;
  resize:none;
}

button{
  margin-top:15px;
  padding:13px 20px;
  border:0;
  border-radius:10px;
  background:#1677ff;
  color:#fff;
  font-weight:700;
  cursor:pointer;
}

.warning{
  margin-top:20px;
  padding:15px;
  border-radius:12px;
  background:#261b08;
  color:#ffd27a;
}
</style>
</head>

<body>

<div class="box">

<h1>Gmail OAuth Başarılı ✅</h1>

<p>
Google hesabınız PanelMarket Gmail API için yetkilendirildi.
</p>

<p>
Aşağıdaki <b>refresh token</b> değerini Render Environment
Variables bölümünde şu değişkene kaydedin:
</p>

<p>
<b>GOOGLE_REFRESH_TOKEN</b>
</p>

<textarea id="token" readonly>${safeToken}</textarea>

<br>

<button onclick="copyToken()">
Refresh Token'ı Kopyala
</button>

<div class="warning">
⚠️ Bu değer gizlidir. Kimseyle paylaşmayın ve GitHub'a
veya frontend koduna koymayın.
</div>

<script>
function copyToken(){
  const token =
    document.getElementById("token").value;

  navigator.clipboard.writeText(token)
    .then(() => {
      alert("Refresh token kopyalandı.");
    })
    .catch(() => {
      alert("Kopyalama başarısız. Kutudan manuel olarak kopyalayın.");
    });
}
</script>

</div>

</body>
</html>
      `);

    } catch (error) {

      console.error(
        "GOOGLE OAUTH CALLBACK ERROR:",
        error?.message
      );


      return res
        .status(500)
        .send(`
          <!doctype html>
          <html lang="tr">
          <head>
            <meta charset="UTF-8">
            <title>Google OAuth Hatası</title>
          </head>

          <body style="
            margin:0;
            min-height:100vh;
            display:grid;
            place-items:center;
            background:#070a0f;
            color:#fff;
            font-family:Arial,sans-serif;
          ">

          <div style="
            max-width:650px;
            padding:35px;
            background:#111820;
            border-radius:18px;
          ">

          <h2>Google OAuth başarısız ❌</h2>

          <p>
          ${String(
            error?.message ||
            "Bilinmeyen hata"
          )}
          </p>

          </div>

          </body>
          </html>
        `);
    }
  }
);


/* =========================================================
   GMAIL PASSWORD RESET
   ========================================================= */

async function sendPasswordResetEmail(
  user,
  resetUrl
) {

  const gmailUser =
    String(
      process.env.GMAIL_USER ||
      ""
    ).trim();


  const googleClientId =
    String(
      process.env.GOOGLE_CLIENT_ID ||
      ""
    ).trim();


  const googleClientSecret =
    String(
      process.env.GOOGLE_CLIENT_SECRET ||
      ""
    ).trim();


  const googleRefreshToken =
    String(
      process.env.GOOGLE_REFRESH_TOKEN ||
      ""
    ).trim();


  const from =
    String(
      process.env.MAIL_FROM ||
      gmailUser
    ).trim();


  if (!gmailUser) {

    throw new Error(
      "GMAIL_USER Render Environment Variables içinde bulunamadı."
    );
  }


  if (!googleClientId) {

    throw new Error(
      "GOOGLE_CLIENT_ID Render Environment Variables içinde bulunamadı."
    );
  }


  if (!googleClientSecret) {

    throw new Error(
      "GOOGLE_CLIENT_SECRET Render Environment Variables içinde bulunamadı."
    );
  }


  if (!googleRefreshToken) {

    throw new Error(
      "GOOGLE_REFRESH_TOKEN Render Environment Variables içinde bulunamadı."
    );
  }


  if (!user?.email) {

    throw new Error(
      "Kullanıcının e-posta adresi bulunamadı."
    );
  }


  if (!resetUrl) {

    throw new Error(
      "Şifre sıfırlama bağlantısı oluşturulamadı."
    );
  }


  const html = `
<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>PanelMarket şifre sıfırlama</title>
</head>

<body style="margin:0;padding:0;background:#f6f7f9;font-family:Arial,Helvetica,sans-serif;color:#202124;">

<div style="max-width:560px;margin:0 auto;padding:32px 18px;">

<div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:28px;">

<h2 style="margin:0 0 20px;font-size:22px;font-weight:600;color:#202124;">
PanelMarket
</h2>

<p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
Merhaba,
</p>

<p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
PanelMarket hesabınız için bir şifre sıfırlama isteği aldık.
</p>

<p style="margin:0 0 22px;font-size:15px;line-height:1.6;">
Şifrenizi yenilemek için aşağıdaki bağlantıyı kullanabilirsiniz:
</p>

<p style="margin:0 0 24px;">
<a
href="${resetUrl}"
style="display:inline-block;padding:11px 18px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:7px;font-size:14px;font-weight:600;"
>
Şifremi sıfırla
</a>
</p>

<p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#5f6368;">
Bu bağlantı güvenlik nedeniyle 30 dakika geçerlidir.
</p>

<p style="margin:0;font-size:13px;line-height:1.6;color:#5f6368;">
Bu isteği siz yapmadıysanız herhangi bir işlem yapmanıza gerek yoktur.
</p>

<div style="margin-top:26px;padding-top:18px;border-top:1px solid #eeeeee;">
<p style="margin:0;font-size:12px;color:#80868b;">
PanelMarket
</p>
</div>

</div>

</div>

</body>
</html>
`;


  const tokenResponse =
    await fetch(
      "https://oauth2.googleapis.com/token",
      {

        method:
          "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded"
        },

        body:
          new URLSearchParams({

            client_id:
              googleClientId,

            client_secret:
              googleClientSecret,

            refresh_token:
              googleRefreshToken,

            grant_type:
              "refresh_token"
          })
      }
    );


  const tokenData =
    await tokenResponse.json();


  if (
    !tokenResponse.ok
  ) {

    throw new Error(
      `Google OAuth token hatası: ${
        tokenData?.error_description ||
        tokenData?.error ||
        `HTTP ${tokenResponse.status}`
      }`
    );
  }


  const accessToken =
    String(
      tokenData?.access_token ||
      ""
    ).trim();


  if (!accessToken) {

    throw new Error(
      "Google access token boş geldi."
    );
  }


  function encodeMimeHeader(
    value
  ) {

    return /[^\x00-\x7F]/.test(
      value
    )
      ? `=?UTF-8?B?${Buffer
          .from(
            value,
            "utf8"
          )
          .toString(
            "base64"
          )}?=`
      : value;
  }


  const mimeMessage = [

    `From: ${from}`,

    `To: ${String(
      user.email
    )}`,

    `Subject: ${encodeMimeHeader(
      "PanelMarket - Şifre Sıfırlama"
    )}`,

    "MIME-Version: 1.0",

    'Content-Type: text/html; charset="UTF-8"',

    "Content-Transfer-Encoding: 8bit",

    "",

    html

  ].join("\r\n");


  const raw =
    Buffer
      .from(
        mimeMessage,
        "utf8"
      )
      .toString(
        "base64url"
      );


  const gmailResponse =
    await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {

        method:
          "POST",

        headers: {

          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify({
            raw
          })
      }
    );


  const gmailData =
    await gmailResponse.json();


  if (
    !gmailResponse.ok
  ) {

    throw new Error(
      gmailData?.error?.message ||
      "Gmail API e-posta gönderimi başarısız."
    );
  }


  return {

    messageId:
      gmailData?.id ||
      null,

    provider:
      "gmail-api"
  };
}


/* =========================================================
   FORGOT PASSWORD
   ========================================================= */

app.post(
  "/api/forgot-password",
  async (
    req,
    res
  ) => {

    try {

      const email =
        String(
          req.body.email ||
          ""
        )
          .trim()
          .toLowerCase();


      if (
        !email ||
        !email.includes("@")
      ) {

        return res.status(400).json({

          ok: false,

          success: false,

          error:
            "Geçerli bir e-posta adresi girin."
        });
      }


      const user =
        await findUserByEmail(
          email
        );


      if (!user) {

        return res.status(200).json({

          ok: true,

          success: true,

          message:
            "Eğer bu e-posta kayıtlıysa şifre sıfırlama bağlantısı gönderildi."
        });
      }


      const token =
        createPasswordResetToken(
          user
        );


      const resetUrl =
        `${PUBLIC_BASE_URL}/reset-password.html?token=${encodeURIComponent(
          token
        )}`;


      await sendPasswordResetEmail(
        user,
        resetUrl
      );


      return res.status(200).json({

        ok: true,

        success: true,

        message:
          "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi."
      });

    } catch (e) {

      console.error(
        "FORGOT PASSWORD ERROR:",
        e
      );


      return res.status(500).json({

        ok: false,

        success: false,

        error:
          e?.message ||
          "Şifre sıfırlama e-postası gönderilemedi."
      });
    }
  }
);


/* =========================================================
   RESET PASSWORD VERIFY
   ========================================================= */

app.get(
  "/api/reset-password/verify",
  async (
    req,
    res
  ) => {

    try {

      const token =
        String(
          req.query.token ||
          ""
        ).trim();


      if (!token) {

        return res.status(400).json({

          ok: false,

          valid: false,

          error:
            "Şifre sıfırlama bağlantısı bulunamadı."
        });
      }


      const payload =
        verifyPasswordResetToken(
          token
        );


      if (!payload) {

        return res.status(400).json({

          ok: false,

          valid: false,

          error:
            "Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş."
        });
      }


      const user =
        await findUserById(
          payload.uid
        );


      if (!user) {

        return res.status(404).json({

          ok: false,

          valid: false,

          error:
            "Kullanıcı bulunamadı."
        });
      }


      if (
        String(
          user.email || ""
        )
          .trim()
          .toLowerCase() !==
        String(
          payload.email || ""
        )
          .trim()
          .toLowerCase()
      ) {

        return res.status(400).json({

          ok: false,

          valid: false,

          error:
            "Şifre sıfırlama bağlantısı geçersiz."
        });
      }


      return res.json({

        ok: true,

        valid: true,

        email:
          user.email
      });

    } catch (e) {

      console.error(
        "RESET TOKEN VERIFY ERROR:",
        e
      );


      return res.status(500).json({

        ok: false,

        valid: false,

        error:
          "Şifre sıfırlama bağlantısı kontrol edilemedi."
      });
    }
  }
);


/* =========================================================
   RESET PASSWORD
   ========================================================= */

app.post(
  "/api/reset-password",
  async (
    req,
    res
  ) => {

    try {

      const token =
        String(
          req.body.token ||
          ""
        ).trim();


      const newPassword =
        String(
          req.body.newPassword ||
          ""
        );


      if (!token) {

        return res.status(400).json({

          ok: false,

          success: false,

          error:
            "Şifre sıfırlama bağlantısı bulunamadı."
        });
      }


      if (
        newPassword.length < 8 ||
        !/[A-Za-z]/.test(
          newPassword
        ) ||
        !/[0-9]/.test(
          newPassword
        )
      ) {

        return res.status(400).json({

          ok: false,

          success: false,

          error:
            "Yeni şifre en az 8 karakter ve harf/rakam içermelidir."
        });
      }


      const payload =
        verifyPasswordResetToken(
          token
        );


      if (!payload) {

        return res.status(400).json({

          ok: false,

          success: false,

          error:
            "Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş."
        });
      }


      const user =
        await findUserById(
          payload.uid
        );


      if (!user) {

        return res.status(404).json({

          ok: false,

          success: false,

          error:
            "Kullanıcı bulunamadı."
        });
      }


      if (
        String(
          user.email || ""
        )
          .trim()
          .toLowerCase() !==
        String(
          payload.email || ""
        )
          .trim()
          .toLowerCase()
      ) {

        return res.status(400).json({

          ok: false,

          success: false,

          error:
            "Şifre sıfırlama bağlantısı geçersiz."
        });
      }


      const pw =
        hashPassword(
          newPassword
        );


      const {
        data,
        error
      } =
        await supabase
          .from("users")
          .update({

            password_hash:
              pw.hash,

            password_salt:
              pw.salt

          })
          .eq(
            "id",
            user.id
          )
          .select(
            "id,email"
          )
          .single();


      if (error) {

        return res.status(500).json({

          ok: false,

          success: false,

          error:
            "Şifre veritabanında güncellenemedi.",

          databaseError:
            error.message
        });
      }


      await supabase
        .from("sessions")
        .delete()
        .eq(
          "user_id",
          user.id
        );


      return res.json({

        ok: true,

        success: true,

        passwordChanged:
          true,

        message:
          "Şifreniz başarıyla sıfırlandı. Yeni şifrenizle giriş yapabilirsiniz."
      });

    } catch (e) {

      console.error(
        "RESET PASSWORD ERROR:",
        e
      );


      return res.status(500).json({

        ok: false,

        success: false,

        error:
          "Şifre sıfırlama sırasında bir hata oluştu."
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
  (
    req,
    res
  ) => {

    res.json({

      ok: true,

      authenticated:
        true,

      user:
        publicUser(
          req.user
        )
    });
  }
);


/* =========================================================
   GERÇEK HESAP BİLGİLERİ
   ========================================================= */

app.get(
  "/api/account",
  requireAuth,
  async (
    req,
    res
  ) => {

    try {

      /*
       * SESSION'DAKİ KULLANICIYI KULLANMAK
       * YERİNE HER SEFERİNDE SUPABASE'DEN
       * GÜNCEL BAKİYEYİ ALIYORUZ.
       */

      const {
        data: user,
        error: userError
      } =
        await supabase
          .from("users")
          .select(
            "id,name,email,balance,is_admin,created_at"
          )
          .eq(
            "id",
            req.user.id
          )
          .single();


      if (userError) {
        throw userError;
      }


      if (!user) {

        return res.status(404).json({

          ok: false,

          error:
            "Kullanıcı bulunamadı."
        });
      }


      const {
        count,
        error: orderError
      } =
        await supabase
          .from("orders")
          .select(
            "id",
            {
              count:
                "exact",
              head:
                true
            }
          )
          .eq(
            "user_id",
            user.id
          );


      if (orderError) {
        throw orderError;
      }


      /*
       * GERÇEK BAKİYE BURADAN GELİR.
       */
      return res.json({

        id:
          user.id,

        name:
          user.name || "",

        email:
          user.email || "",

        balance:
          money(
            user.balance
          ),

        isAdmin:
          user.is_admin === true,

        is_admin:
          user.is_admin === true,

        orderCount:
          count || 0
      });

    } catch (e) {

      console.error(
        "ACCOUNT ERROR:",
        e
      );


      return res.status(500).json({

        ok: false,

        error:
          "Hesap bilgileri alınamadı.",

        databaseError:
          e?.message ||
          null
      });
    }
  }
);


/* =========================================================
   LOGOUT
   ========================================================= */

app.post(
  "/api/logout",
  async (
    req,
    res
  ) => {

    try {

      const token =
        getTokenFromRequest(
          req
        );


      if (token) {

        await supabase
          .from("sessions")
          .delete()
          .eq(
            "token",
            token
          );
      }


      clearSessionCookie(
        res
      );


      res.json({

        ok: true,

        success: true
      });

    } catch (e) {

      console.error(e);

      clearSessionCookie(
        res
      );


      res.status(500).json({

        ok: false,

        error:
          "Çıkış yapılamadı."
      });
    }
  }
);


/* =========================================================
   CHANGE PASSWORD
   ========================================================= */

app.post(
  "/api/change-password",
  requireAuth,
  async (
    req,
    res
  ) => {

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

          ok: false,

          success: false,

          error:
            "Mevcut şifre ve yeni şifre zorunludur."
        });
      }


      if (
        !verifyPassword(
          oldPassword,
          req.user
        )
      ) {

        return res.status(401).json({

          ok: false,

          success: false,

          error:
            "Mevcut şifre hatalı."
        });
      }


      if (
        newPassword.length < 8 ||
        !/[A-Za-z]/.test(
          newPassword
        ) ||
        !/[0-9]/.test(
          newPassword
        )
      ) {

        return res.status(400).json({

          ok: false,

          success: false,

          error:
            "Yeni şifre en az 8 karakter ve harf/rakam içermelidir."
        });
      }


      const pw =
        hashPassword(
          newPassword
        );


      const {
        data,
        error
      } =
        await supabase
          .from("users")
          .update({

            password_hash:
              pw.hash,

            password_salt:
              pw.salt

          })
          .eq(
            "id",
            req.user.id
          )
          .select(
            "id,email"
          )
          .single();


      if (error) {

        return res.status(500).json({

          ok: false,

          success: false,

          error:
            "Şifre veritabanında güncellenemedi."
        });
      }


      await supabase
        .from("sessions")
        .delete()
        .eq(
          "user_id",
          req.user.id
        );


      clearSessionCookie(
        res
      );


      return res.json({

        ok: true,

        success: true,

        message:
          "Şifreniz başarıyla değiştirildi.",

        user:
          data
      });

    } catch (e) {

      console.error(
        "CHANGE PASSWORD ERROR:",
        e
      );


      return res.status(500).json({

        ok: false,

        success: false,

        error:
          "Şifre değiştirilemedi."
      });
    }
  }
);


/* =========================================================
   WALLET
   ========================================================= */

/*
 * ÖNEMLİ:
 *
 * ESKİ SİSTEMDE:
 *
 * POST /api/wallet/topup
 *
 * kullanıcının istediği miktarı doğrudan
 * users.balance alanına ekliyordu.
 *
 * Bu gerçek ödeme değildir.
 *
 * Bu nedenle endpoint artık kullanıcıya
 * kendi kendine para oluşturmaz.
 *
 * Gerçek bakiye:
 *
 * users.balance
 *
 * üzerinden tutulur.
 *
 * Bakiye artırma:
 *
 * 1) Gerçek ödeme sağlayıcısı başarılı
 *    ödeme bildirimi göndermeli
 *
 * veya
 *
 * 2) Admin tarafından /api/admin/users/:id/balance
 *    üzerinden verilmelidir.
 */

app.post(
  "/api/wallet/topup",
  requireAuth,
  async (
    req,
    res
  ) => {

    console.warn(
      "BLOCKED FAKE TOPUP:",
      {
        userId:
          req.user.id,

        amount:
          req.body.amount
      }
    );


    return res.status(403).json({

      ok: false,

      success: false,

      error:
        "Bakiye doğrudan oluşturulamaz. Önce gerçek ödeme işleminin başarıyla tamamlanması gerekir.",

      code:
        "PAYMENT_REQUIRED"
    });
  }
);


/* =========================================================
   ORDERS
   ========================================================= */

app.post(
  "/api/orders",
  requireAuth,
  async (
    req,
    res
  ) => {

    try {

      const productId =
        String(
          req.body.productId ||
          ""
        )
          .trim()
          .toLowerCase();


      const licenseId =
        String(
          req.body.licenseId ||
          ""
        ).trim();


      if (!productId) {

        return res.status(400).json({

          ok: false,

          success: false,

          error:
            "Ürün seçimi bulunamadı."
        });
      }


      const product =
        await getProductById(
          productId
        );


      if (!product) {

        return res.status(404).json({

          ok: false,

          success: false,

          error:
            "Ürün bulunamadı."
        });
      }


      if (
        !licenses[licenseId]
      ) {

        return res.status(400).json({

          ok: false,

          success: false,

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
       * ÇOK ÖNEMLİ:
       *
       * Frontend'den gelen balance'a
       * kesinlikle güvenilmiyor.
       *
       * Güncel bakiye doğrudan
       * Supabase'den okunuyor.
       */

      const {
        data: fresh,
        error:
          userError
      } =
        await supabase
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


      if (!fresh) {

        return res.status(404).json({

          ok: false,

          success: false,

          error:
            "Kullanıcı bulunamadı."
        });
      }


      const balance =
        money(
          fresh.balance
        );


      if (
        balance < total
      ) {

        return res.status(400).json({

          ok: false,

          success: false,

          error:
            "Yetersiz bakiye.",

          balance,

          required:
            total,

          missing:
            money(
              total -
              balance
            )
        });
      }


      const newBalance =
        money(
          balance -
          total
        );


      /*
       * BAKİYEYİ ESKİ DEĞERLE
       * EŞLEŞTİREREK GÜNCELLE.
       *
       * Başka işlem aynı anda bakiyeyi
       * değiştirdiyse para tekrar çekilmez.
       */

      const {
        data: updated,
        error:
          balanceError
      } =
        await supabase
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


      if (balanceError) {
        throw balanceError;
      }


      if (!updated) {

        return res.status(409).json({

          ok: false,

          success: false,

          error:
            "Bakiye aynı anda değişti. Lütfen tekrar deneyin."
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
      } =
        await supabase
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


      /*
       * Sipariş oluşturulamazsa
       * parayı geri yükle.
       */

      if (orderError) {

        await supabase
          .from("users")
          .update({
            balance
          })
          .eq(
            "id",
            req.user.id
          )
          .eq(
            "balance",
            newBalance
          );


        throw orderError;
      }


      /*
       * TRANSACTION
       */

      const {
        error:
          transactionError
      } =
        await supabase
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


      if (
        transactionError
      ) {

        console.error(
          "Transaction error:",
          transactionError.message
        );
      }


      console.log(
        "ORDER CREATED:",
        {

          orderId:
            order?.id ||
            null,

          orderNumber,

          userId:
            req.user.id,

          productId:
            product.id,

          productName:
            product.name,

          licenseId,

          amount:
            total,

          previousBalance:
            balance,

          newBalance
        }
      );


      return res.json({

        ok: true,

        success: true,

        order:
          formatOrder(
            order
          ),

        balance:
          money(
            updated.balance
          )
      });

    } catch (e) {

      console.error(
        "ORDER ERROR:",
        e
      );


      return res.status(500).json({

        ok: false,

        success: false,

        error:
          "Sipariş oluşturulamadı.",

        databaseError:
          e?.message ||
          null
      });
    }
  }
);


/* =========================================================
   ORDERS LIST
   ========================================================= */

app.get(
  "/api/orders",
  requireAuth,
  async (
    req,
    res
  ) => {

    try {

      const {
        data,
        error
      } =
        await supabase
          .from("orders")
          .select("*")
          .eq(
            "user_id",
            req.user.id
          )
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


      res.json(
        (data || [])
          .map(
            formatOrder
          )
      );

    } catch (e) {

      res.status(500).json({

        error:
          "Siparişler alınamadı."
      });
    }
  }
);


/* =========================================================
   ORDER DETAIL
   ========================================================= */

app.get(
  "/api/orders/:id",
  requireAuth,
  async (
    req,
    res
  ) => {

    try {

      let q =
        supabase
          .from("orders")
          .select("*")
          .eq(
            "user_id",
            req.user.id
          );


      if (
        /^[0-9a-fA-F-]{36}$/.test(
          req.params.id
        )
      ) {

        q =
          q.eq(
            "id",
            req.params.id
          );

      } else {

        q =
          q.eq(
            "order_number",
            req.params.id
          );
      }


      const {
        data,
        error
      } =
        await q.maybeSingle();


      if (error) {
        throw error;
      }


      if (!data) {

        return res.status(404).json({

          error:
            "Sipariş bulunamadı."
        });
      }


      res.json(
        formatOrder(
          data
        )
      );

    } catch (e) {

      res.status(500).json({

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
  async (
    req,
    res
  ) => {

    try {

      const {
        data,
        error
      } =
        await supabase
          .from("transactions")
          .select("*")
          .eq(
            "user_id",
            req.user.id
          )
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


      res.json(

        (data || [])
          .map(
            t => ({

              id:
                t.id,

              type:
                t.type,

              amount:
                money(
                  t.amount
                ),

              note:
                t.note,

              date:
                t.created_at

            })
          )
      );

    } catch (e) {

      res.status(500).json({

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
  async (
    req,
    res
  ) => {

    try {

      const name =
        String(
          req.body.name ||
          ""
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
      } =
        await supabase
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

        success:
          true,

        user:
          publicUser(
            user
          )
      });

    } catch (e) {

      res.status(500).json({

        error:
          "Hesap güncellenemedi."
      });
    }
  }
);


/* =========================================================
   ACCOUNT PASSWORD
   ========================================================= */

app.post(
  "/api/account/password",
  requireAuth,
  async (
    req,
    res
  ) => {

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
        newPassword.length < 8 ||
        !/[A-Za-z]/.test(
          newPassword
        ) ||
        !/[0-9]/.test(
          newPassword
        )
      ) {

        return res.status(400).json({

          error:
            "Yeni şifre en az 8 karakter ve harf/rakam içermelidir."
        });
      }


      const pw =
        hashPassword(
          newPassword
        );


      const {
        error
      } =
        await supabase
          .from("users")
          .update({

            password_hash:
              pw.hash,

            password_salt:
              pw.salt

          })
          .eq(
            "id",
            req.user.id
          );


      if (error) {
        throw error;
      }


      res.json({

        success:
          true,

        message:
          "Şifre değiştirildi."
      });

    } catch (e) {

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
  async (
    req,
    res
  ) => {

    try {

      const [
        users,
        orders,
        prods,
        bal,
        credits,
        debits
      ] =
        await Promise.all([

          supabase
            .from("users")
            .select(
              "id",
              {
                count:
                  "exact",
                head:
                  true
              }
            ),

          supabase
            .from("orders")
            .select(
              "id",
              {
                count:
                  "exact",
                head:
                  true
              }
            ),

          supabase
            .from("products")
            .select(
              "id",
              {
                count:
                  "exact",
                head:
                  true
              }
            ),

          supabase
            .from("users")
            .select(
              "balance"
            ),

          supabase
            .from("transactions")
            .select(
              "amount"
            )
            .eq(
              "type",
              "credit"
            ),

          supabase
            .from("transactions")
            .select(
              "amount"
            )
            .eq(
              "type",
              "debit"
            )
        ]);


      res.json({

        ok: true,

        stats: {

          totalUsers:
            users.count ||
            0,

          totalOrders:
            orders.count ||
            0,

          totalProducts:
            prods.count ||
            0,

          activeProducts:
            products.filter(
              p =>
                p.active
            ).length,

          totalBalance:
            money(
              (
                bal.data ||
                []
              ).reduce(
                (
                  a,
                  u
                ) =>
                  a +
                  Number(
                    u.balance ||
                    0
                  ),
                0
              )
            ),

          totalSales:
            money(
              (
                debits.data ||
                []
              ).reduce(
                (
                  a,
                  t
                ) =>
                  a +
                  Number(
                    t.amount ||
                    0
                  ),
                0
              )
            ),

          totalCredits:
            money(
              (
                credits.data ||
                []
              ).reduce(
                (
                  a,
                  t
                ) =>
                  a +
                  Number(
                    t.amount ||
                    0
                  ),
                0
              )
            ),

          totalDebits:
            money(
              (
                debits.data ||
                []
              ).reduce(
                (
                  a,
                  t
                ) =>
                  a +
                  Number(
                    t.amount ||
                    0
                  ),
                0
              )
            )
        }
      });

    } catch (e) {

      console.error(
        "ADMIN DASHBOARD ERROR:",
        e
      );


      res.status(500).json({

        ok: false,

        error:
          "Dashboard alınamadı."
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
  async (
    req,
    res
  ) => {

    try {

      const {
        data,
        error
      } =
        await supabase
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


      if (error) {
        throw error;
      }


      res.json(
        data || []
      );

    } catch (e) {

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
  async (
    req,
    res
  ) => {

    try {

      const {
        data,
        error
      } =
        await supabase
          .from("orders")
          .select("*")
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


      res.json(

        (data || [])
          .map(
            formatOrder
          )
      );

    } catch (e) {

      res.status(500).json({

        error:
          "Siparişler alınamadı."
      });
    }
  }
);


/* =========================================================
   ADMIN REAL BALANCE CONTROL
   ========================================================= */

app.post(
  "/api/admin/users/:id/balance",
  requireAuth,
  requireAdmin,
  async (
    req,
    res
  ) => {

    try {

      const amount =
        money(
          req.body.amount
        );


      const type =
        String(
          req.body.type ||
          "credit"
        );


      const note =
        String(
          req.body.note ||
          ""
        ).trim();


      if (
        !Number.isFinite(
          amount
        ) ||
        amount <= 0
      ) {

        return res.status(400).json({

          error:
            "Geçerli tutar girin."
        });
      }


      if (
        ![
          "credit",
          "debit"
        ].includes(
          type
        )
      ) {

        return res.status(400).json({

          error:
            "Geçersiz bakiye işlemi."
        });
      }


      const {
        data: user,
        error
      } =
        await supabase
          .from("users")
          .select("*")
          .eq(
            "id",
            req.params.id
          )
          .single();


      if (error) {
        throw error;
      }


      const current =
        money(
          user.balance
        );


      const next =
        money(
          current +
          (
            type ===
            "credit"
              ? amount
              : -amount
          )
        );


      if (
        next < 0
      ) {

        return res.status(400).json({

          error:
            "Bakiye eksiye düşemez."
        });
      }


      const {
        data: updated,
        error:
          updateError
      } =
        await supabase
          .from("users")
          .update({

            balance:
              next

          })
          .eq(
            "id",
            user.id
          )
          .eq(
            "balance",
            current
          )
          .select("*")
          .maybeSingle();


      if (
        updateError
      ) {
        throw updateError;
      }


      if (!updated) {

        return res.status(409).json({

          error:
            "Bakiye aynı anda değişti. Lütfen tekrar deneyin."
        });
      }


      const {
        error:
          transactionError
      } =
        await supabase
          .from("transactions")
          .insert({

            user_id:
              user.id,

            type,

            amount,

            note:
              note ||
              `Admin ${
                type ===
                "credit"
                  ? "bakiye yükleme"
                  : "bakiye düşme"
              }`
          });


      if (
        transactionError
      ) {

        console.error(
          "ADMIN TRANSACTION ERROR:",
          transactionError.message
        );
      }


      console.log(
        "ADMIN BALANCE CHANGE:",
        {

          adminId:
            req.user.id,

          userId:
            user.id,

          type,

          amount,

          oldBalance:
            current,

          newBalance:
            next
        }
      );


      res.json({

        success:
          true,

        user:
          publicUser(
            updated
          )
      });

    } catch (e) {

      console.error(
        "ADMIN BALANCE ERROR:",
        e
      );


      res.status(500).json({

        error:
          "Bakiye güncellenemedi."
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
  async (
    req,
    res
  ) => {

    try {

      const patch =
        {};


      if (
        req.body.status !==
        undefined
      ) {

        patch.status =
          String(
            req.body.status
          );
      }


      if (
        req.body.deliveryStatus !==
        undefined
      ) {

        patch.delivery_status =
          String(
            req.body.deliveryStatus
          );
      }


      const {
        data,
        error
      } =
        await supabase
          .from("orders")
          .update(
            patch
          )
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

        success:
          true,

        order:
          formatOrder(
            data
          )
      });

    } catch (e) {

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
  async (
    req,
    res
  ) => {

    try {

      const {
        data,
        error
      } =
        await supabase
          .from("transactions")
          .select("*")
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


      res.json(
        data || []
      );

    } catch (e) {

      res.status(500).json({

        error:
          "İşlemler alınamadı."
      });
    }
  }
);


/* =========================================================
   ADMIN PRODUCTS
   ========================================================= */

app.get(
  "/api/admin/products",
  requireAuth,
  requireAdmin,
  async (
    req,
    res
  ) => {

    try {

      const {
        data,
        error
      } =
        await supabase
          .from("products")
          .select("*")
          .order(
            "sort_order",
            {
              ascending:
                true
            }
          );


      if (error) {

        return res.status(500).json({

          ok: false,

          error:
            "Ürünler alınamadı.",

          databaseError:
            error.message
        });
      }


      return res.json(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (e) {

      return res.status(500).json({

        ok: false,

        error:
          "Ürünler alınamadı."
      });
    }
  }
);


/* =========================================================
   ADMIN NEW PRODUCT
   ========================================================= */

app.post(
  "/api/admin/products",
  requireAuth,
  requireAdmin,
  async (
    req,
    res
  ) => {

    try {

      const id =
        String(
          req.body.id ||
          ""
        )
          .trim()
          .toLowerCase();


      const name =
        String(
          req.body.name ||
          ""
        ).trim();


      const category =
        String(
          req.body.category ||
          ""
        ).trim();


      const description =
        String(
          req.body.description ||
          ""
        ).trim();


      const badge =
        String(
          req.body.badge ||
          ""
        ).trim();


      const delivery =
        String(
          req.body.delivery ||
          "Hemen"
        ).trim();


      const update =
        String(
          req.body.update ||
          "1 Yıl"
        ).trim();


      const support =
        String(
          req.body.support ||
          "30 Gün"
        ).trim();


      const price =
        money(
          req.body.price
        );


      const oldPrice =
        req.body.oldPrice ===
          null ||
        req.body.oldPrice ===
          undefined ||
        req.body.oldPrice ===
          ""
          ? null
          : money(
              req.body.oldPrice
            );


      const active =
        req.body.active !==
        false;


      const sortOrder =
        Number(
          req.body.sortOrder ||
          0
        );


      const imageData =
        String(
          req.body.image_url ||
          ""
        ).trim();


      if (!id) {

        return res.status(400).json({

          ok: false,

          error:
            "Ürün ID boş bırakılamaz."
        });
      }


      if (
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
          id
        )
      ) {

        return res.status(400).json({

          ok: false,

          error:
            "Geçerli ürün ID girin. Örnek: yeni-panel"
        });
      }


      if (!name) {

        return res.status(400).json({

          ok: false,

          error:
            "Ürün adı zorunludur."
        });
      }


      if (
        !Number.isFinite(
          price
        ) ||
        price < 0
      ) {

        return res.status(400).json({

          ok: false,

          error:
            "Geçerli bir ürün fiyatı girin."
        });
      }


      const {
        data: existingProduct,
        error:
          existingError
      } =
        await supabase
          .from("products")
          .select(
            "id,name"
          )
          .eq(
            "id",
            id
          )
          .maybeSingle();


      if (
        existingError
      ) {

        return res.status(500).json({

          ok: false,

          error:
            "Ürün kontrolü yapılamadı.",

          databaseError:
            existingError.message
        });
      }


      if (
        existingProduct
      ) {

        return res.status(409).json({

          ok: false,

          error:
            `Bu ürün ID zaten kullanılıyor: ${id}`,

          existingProduct:
            existingProduct.name ||
            ""
        });
      }


      let imageUrl =
        "";


      if (imageData) {

        try {

          imageUrl =
            await uploadProductImage(
              imageData,
              id
            );

        } catch (imageError) {

          return res.status(400).json({

            ok: false,

            error:
              imageError?.message ||
              "Ürün görseli yüklenemedi."
          });
        }
      }


      const row = {

        id,

        name,

        category,

        description,

        price,

        old_price:
          oldPrice,

        badge,

        delivery,

        update_period:
          update,

        support,

        active,

        sort_order:
          Number.isFinite(
            sortOrder
          )
            ? sortOrder
            : 0,

        image_url:
          imageUrl
      };


      const {
        data,
        error
      } =
        await supabase
          .from("products")
          .insert(
            row
          )
          .select("*")
          .single();


      if (error) {

        return res.status(500).json({

          ok: false,

          error:
            "Ürün veritabanına eklenemedi.",

          databaseError:
            error.message,

          databaseCode:
            error.code ||
            null,

          databaseDetails:
            error.details ||
            null,

          databaseHint:
            error.hint ||
            null
        });
      }


      return res.status(201).json({

        ok: true,

        success: true,

        product:
          formatProduct(
            data
          )
      });

    } catch (e) {

      console.error(
        "ADMIN PRODUCT CREATE ERROR:",
        e
      );


      return res.status(500).json({

        ok: false,

        error:
          "Ürün oluşturulamadı.",

        databaseError:
          e?.message ||
          null
      });
    }
  }
);


/* =========================================================
   PRODUCT STATUS
   ========================================================= */

app.patch(
  "/api/admin/products/:id/status",
  requireAuth,
  requireAdmin,
  async (
    req,
    res
  ) => {

    try {

      const active =
        Boolean(
          req.body.active
        );


      const {
        data,
        error
      } =
        await supabase
          .from("products")
          .update({
            active
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


      return res.json({

        ok: true,

        success: true,

        product:
          formatProduct(
            data
          )
      });

    } catch (e) {

      return res.status(500).json({

        ok: false,

        error:
          "Ürün durumu güncellenemedi."
      });
    }
  }
);


/* =========================================================
   PRODUCT UPDATE
   ========================================================= */

app.put(
  "/api/admin/products/:id",
  requireAuth,
  requireAdmin,
  async (
    req,
    res
  ) => {

    try {

      const productId =
        String(
          req.params.id ||
          ""
        )
          .trim()
          .toLowerCase();


      const {
        data: currentProduct,
        error:
          currentError
      } =
        await supabase
          .from("products")
          .select("*")
          .eq(
            "id",
            productId
          )
          .maybeSingle();


      if (
        currentError
      ) {
        throw currentError;
      }


      if (!currentProduct) {

        return res.status(404).json({

          ok: false,

          error:
            "Ürün bulunamadı."
        });
      }


      const patch =
        {};


      const fields = {

        name:
          req.body.name,

        category:
          req.body.category,

        description:
          req.body.description,

        badge:
          req.body.badge,

        delivery:
          req.body.delivery,

        update_period:
          req.body.update,

        support:
          req.body.support
      };


      for (
        const [
          key,
          value
        ]
        of Object.entries(
          fields
        )
      ) {

        if (
          value !==
          undefined
        ) {

          patch[key] =
            String(
              value
            );
        }
      }


      if (
        req.body.price !==
        undefined
      ) {

        const price =
          money(
            req.body.price
          );


        if (
          !Number.isFinite(
            price
          ) ||
          price < 0
        ) {

          return res.status(400).json({

            ok: false,

            error:
              "Geçerli bir ürün fiyatı girin."
          });
        }


        patch.price =
          price;
      }


      if (
        req.body.oldPrice !==
        undefined
      ) {

        patch.old_price =
          req.body.oldPrice ===
            null ||
          req.body.oldPrice ===
            ""
            ? null
            : money(
                req.body.oldPrice
              );
      }


      if (
        req.body.active !==
        undefined
      ) {

        patch.active =
          Boolean(
            req.body.active
          );
      }


      if (
        req.body.sortOrder !==
        undefined
      ) {

        const sortOrder =
          Number(
            req.body.sortOrder
          );


        patch.sort_order =
          Number.isFinite(
            sortOrder
          )
            ? sortOrder
            : 0;
      }


      if (
        req.body.image_url !==
        undefined
      ) {

        const imageData =
          String(
            req.body.image_url ||
            ""
          ).trim();


        if (imageData) {

          patch.image_url =
            await uploadProductImage(
              imageData,
              productId
            );

        } else {

          patch.image_url =
            currentProduct.image_url ||
            "";
        }
      }


      const {
        data,
        error
      } =
        await supabase
          .from("products")
          .update(
            patch
          )
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

        success: true,

        product:
          formatProduct(
            data
          )
      });

    } catch (e) {

      console.error(
        "ADMIN PRODUCT UPDATE ERROR:",
        e
      );


      return res.status(500).json({

        ok: false,

        error:
          "Ürün güncellenemedi.",

        databaseError:
          e?.message ||
          null
      });
    }
  }
);


/* =========================================================
   PRODUCT DELETE
   ========================================================= */

app.delete(
  "/api/admin/products/:id",
  requireAuth,
  requireAdmin,
  async (
    req,
    res
  ) => {

    try {

      const productId =
        String(
          req.params.id ||
          ""
        ).trim();


      const {
        data: product,
        error:
          productError
      } =
        await supabase
          .from("products")
          .select(
            "id,image_url"
          )
          .eq(
            "id",
            productId
          )
          .maybeSingle();


      if (
        productError
      ) {
        throw productError;
      }


      const {
        error
      } =
        await supabase
          .from("products")
          .delete()
          .eq(
            "id",
            productId
          );


      if (error) {
        throw error;
      }


      if (
        product?.image_url
      ) {

        try {

          const url =
            String(
              product.image_url
            );


          const marker =
            `/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`;


          const index =
            url.indexOf(
              marker
            );


          if (
            index !== -1
          ) {

            const filePath =
              decodeURIComponent(
                url.slice(
                  index +
                  marker.length
                )
              );


            if (filePath) {

              await supabase
                .storage
                .from(
                  PRODUCT_IMAGE_BUCKET
                )
                .remove([
                  filePath
                ]);
            }
          }

        } catch (
          storageDeleteError
        ) {

          console.error(
            "PRODUCT IMAGE CLEANUP ERROR:",
            storageDeleteError
          );
        }
      }


      return res.json({

        ok: true,

        success: true
      });

    } catch (e) {

      console.error(
        "ADMIN PRODUCT DELETE ERROR:",
        e
      );


      return res.status(500).json({

        ok: false,

        error:
          "Ürün silinemedi.",

        databaseError:
          e?.message ||
          null
      });
    }
  }
);


/* =========================================================
   SESSION DEBUG
   ========================================================= */

app.get(
  "/api/session/status",
  async (
    req,
    res
  ) => {

    try {

      const token =
        getTokenFromRequest(
          req
        );


      if (!token) {

        return res.json({

          ok: true,

          tokenPresent:
            false,

          authenticated:
            false
        });
      }


      const auth =
        await getSessionFromRequest(
          req
        );


      res.json({

        ok: true,

        tokenPresent:
          true,

        tokenLength:
          token.length,

        authenticated:
          !!auth,

        user:
          auth
            ? publicUser(
                auth.user
              )
            : null,

        is_admin:
          auth?.user
            ?.is_admin ===
          true,

        isAdmin:
          auth?.user
            ?.is_admin ===
          true
      });

    } catch (e) {

      res.status(500).json({

        ok: false,

        error:
          e.message
      });
    }
  }
);


/* =========================================================
   HEALTH
   ========================================================= */

app.get(
  "/health",
  async (
    req,
    res
  ) => {

    try {

      const {
        error
      } =
        await supabase
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

    } catch (e) {

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
   SUPABASE DEBUG
   ========================================================= */

app.get(
  "/api/debug/supabase-info",
  async (
    req,
    res
  ) => {

    try {

      const key =
        String(
          SUPABASE_SERVICE_ROLE_KEY ||
          ""
        );


      const keyInfo = {

        exists:
          !!key,

        length:
          key.length,

        type:
          "unknown",

        role:
          null,

        ref:
          null,

        issuer:
          null
      };


      const parts =
        key.split(".");


      if (
        parts.length === 3
      ) {

        try {

          const payload =
            JSON.parse(
              Buffer
                .from(
                  parts[1],
                  "base64url"
                )
                .toString(
                  "utf8"
                )
            );


          keyInfo.type =
            "jwt";

          keyInfo.role =
            payload.role ||
            null;

          keyInfo.ref =
            payload.ref ||
            null;

          keyInfo.issuer =
            payload.iss ||
            null;

        } catch {

          keyInfo.type =
            "jwt-format-but-payload-read-failed";
        }

      } else if (
        key.startsWith(
          "sb_secret_"
        )
      ) {

        keyInfo.type =
          "supabase-secret-key";

      } else if (
        key.startsWith(
          "sb_publishable_"
        )
      ) {

        keyInfo.type =
          "supabase-publishable-key";

      } else if (
        key.startsWith(
          "eyJ"
        )
      ) {

        keyInfo.type =
          "jwt";
      }


      const {
        data: users,
        error:
          usersError
      } =
        await supabase
          .from("users")
          .select(
            "id,email,is_admin"
          )
          .limit(10);


      const ADMIN_ID =
        "36002d6d-f4d4-4c4a-a03f-56076c6bf6eb";


      const {
        data: adminById,
        error:
          adminByIdError
      } =
        await supabase
          .from("users")
          .select(
            "id,email,is_admin"
          )
          .eq(
            "id",
            ADMIN_ID
          )
          .maybeSingle();


      res.json({

        ok: true,

        supabaseHost:
          new URL(
            SUPABASE_URL
          ).host,

        keyInfo,

        allUsers: {

          count:
            Array.isArray(
              users
            )
              ? users.length
              : 0,

          error:
            usersError?.message ||
            null
        },

        adminIdQuery: {

          found:
            !!adminById,

          data:
            adminById ||
            null,

          error:
            adminByIdError?.message ||
            null
        }
      });

    } catch (e) {

      console.error(
        "SUPABASE DEBUG ERROR:",
        e
      );


      res.status(500).json({

        ok: false,

        error:
          e?.message ||
          "Supabase debug hatası"
      });
    }
  }
);


/* =========================================================
   PRODUCT REVIEWS / RATINGS API
   ========================================================= */

function cleanReviewText(value) {
  return String(value ?? "").trim().slice(0, 2000);
}

function reviewPublicUser(user) {
  return {
    id: user?.id || null,
    name: user?.name || "Kullanıcı"
  };
}

function reviewRelativeTime(value) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "";
  const diff = Math.max(0, Date.now() - time);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const year = 365 * day;

  if (diff < minute) return "az önce";
  if (diff < hour) return `${Math.floor(diff / minute)} dakika önce`;
  if (diff < day) return `${Math.floor(diff / hour)} saat önce`;
  if (diff < week) return `${Math.floor(diff / day)} gün önce`;
  if (diff < year) return `${Math.floor(diff / week)} hafta önce`;
  return `${Math.floor(diff / year)} yıl önce`;
}

async function getReviewVoteCounts(reviewIds) {
  if (!reviewIds.length) return new Map();

  const { data, error } = await supabase
    .from("product_review_votes")
    .select("review_id,vote_type")
    .in("review_id", reviewIds);

  // Oy tablosu henüz oluşturulmamışsa değerlendirmelerin
  // tamamının yüklenmesini engelleme. Oylar 0 kabul edilir.
  if (error) {
    console.error("REVIEW VOTES GET ERROR:", error);
    return new Map();
  }

  const map = new Map();
  for (const row of data || []) {
    const item = map.get(row.review_id) || { likes: 0, dislikes: 0 };
    if (row.vote_type === "like") item.likes++;
    if (row.vote_type === "dislike") item.dislikes++;
    map.set(row.review_id, item);
  }
  return map;
}

function buildReviewTree(rows, voteCounts, currentUserId = null) {
  const byId = new Map();

  for (const row of rows || []) {
    const votes = voteCounts.get(row.id) || { likes: 0, dislikes: 0 };
    byId.set(row.id, {
      id: row.id,
      productId: row.product_id,
      userId: row.user_id,
      username: row.username || "Kullanıcı",
      rating: row.rating,
      comment: row.comment,
      parentId: row.parent_id,
      createdAt: row.created_at,
      relativeTime: reviewRelativeTime(row.created_at),
      likes: votes.likes,
      dislikes: votes.dislikes,
      viewerVote: null,
      replies: []
    });
  }

  for (const row of rows || []) {
    const item = byId.get(row.id);
    if (row.parent_id && byId.has(row.parent_id)) {
      byId.get(row.parent_id).replies.push(item);
    }
  }

  return [...byId.values()]
    .filter(item => !item.parentId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function attachViewerVotes(tree, userId) {
  if (!userId) return tree;

  const all = [];
  const walk = items => {
    for (const item of items) {
      all.push(item);
      walk(item.replies || []);
    }
  };
  walk(tree);

  if (!all.length) return tree;

  const { data, error } = await supabase
    .from("product_review_votes")
    .select("review_id,vote_type")
    .eq("user_id", userId)
    .in("review_id", all.map(x => x.id));

  // Oy tablosu yoksa değerlendirme listesi yine gösterilsin.
  if (error) {
    console.error("REVIEW VOTES VIEWER ERROR:", error);
    return tree;
  }

  const map = new Map((data || []).map(x => [x.review_id, x.vote_type]));
  for (const item of all) item.viewerVote = map.get(item.id) || null;
  return tree;
}

app.get("/api/reviews/:productId", async (req, res) => {
  try {
    const productId = String(req.params.productId || "").trim();
    if (!productId) {
      return res.status(400).json({ ok: false, error: "Ürün ID gerekli." });
    }

    const { data: rows, error } = await supabase
      .from("product_reviews")
      .select("id,product_id,user_id,username,rating,comment,parent_id,created_at")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const topLevel = (rows || []).filter(x => !x.parent_id);
    const ratingSum = topLevel.reduce((sum, x) => sum + Number(x.rating || 0), 0);
    const reviewCount = topLevel.length;
    const averageRating = reviewCount ? Math.round((ratingSum / reviewCount) * 10) / 10 : 0;

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of topLevel) distribution[row.rating] = (distribution[row.rating] || 0) + 1;

    const voteCounts = await getReviewVoteCounts((rows || []).map(x => x.id));
    let viewerId = null;
    try {
      viewerId = (await getSessionFromRequest(req))?.user?.id || null;
    } catch {}

    const tree = await attachViewerVotes(
      buildReviewTree(rows || [], voteCounts, viewerId),
      viewerId
    );

    return res.json({
      ok: true,
      productId,
      averageRating,
      reviewCount,
      totalComments: (rows || []).length,
      distribution,
      reviews: tree
    });
  } catch (error) {
    console.error("REVIEWS GET ERROR:", error);
    const detail = String(error?.message || error?.details || "").trim();
    return res.status(500).json({
      ok: false,
      error: detail
        ? "Değerlendirmeler alınamadı: " + detail
        : "Değerlendirmeler alınamadı."
    });
  }
});

app.post("/api/reviews", requireAuth, async (req, res) => {
  try {
    const productId = String(req.body.productId || "").trim();
    const rating = Number(req.body.rating);
    const comment = cleanReviewText(req.body.comment);

    if (!productId) return res.status(400).json({ ok: false, error: "Ürün ID gerekli." });
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ ok: false, error: "Puan 1 ile 5 arasında olmalıdır." });
    }
    if (!comment) return res.status(400).json({ ok: false, error: "Yorum boş bırakılamaz." });

    const product = await getProductById(productId);
    if (!product) return res.status(404).json({ ok: false, error: "Ürün bulunamadı." });

    const username = String(req.user?.name || req.user?.email || "Kullanıcı").trim().slice(0, 120);

    const { data, error } = await supabase
      .from("product_reviews")
      .insert({
        product_id: productId,
        user_id: String(req.user.id),
        username,
        rating,
        comment,
        parent_id: null
      })
      .select("id,product_id,user_id,username,rating,comment,parent_id,created_at")
      .single();

    if (error) {
      if (String(error.message || "").toLowerCase().includes("duplicate")) {
        return res.status(409).json({
          ok: false,
          error: "Bu ürün için zaten bir değerlendirmeniz var."
        });
      }
      throw error;
    }

    return res.status(201).json({
      ok: true,
      review: {
        ...data,
        relativeTime: reviewRelativeTime(data.created_at),
        likes: 0,
        dislikes: 0,
        viewerVote: null,
        replies: []
      }
    });
  } catch (error) {
    console.error("REVIEW POST ERROR:", error);
    return res.status(500).json({ ok: false, error: "Değerlendirme kaydedilemedi." });
  }
});

app.post("/api/reviews/:reviewId/reply", requireAuth, async (req, res) => {
  try {
    const reviewId = Number(req.params.reviewId);
    const comment = cleanReviewText(req.body.comment);

    if (!Number.isInteger(reviewId) || reviewId <= 0) {
      return res.status(400).json({ ok: false, error: "Geçersiz değerlendirme." });
    }
    if (!comment) return res.status(400).json({ ok: false, error: "Cevap boş bırakılamaz." });

    const { data: parent, error: parentError } = await supabase
      .from("product_reviews")
      .select("id,product_id")
      .eq("id", reviewId)
      .maybeSingle();

    if (parentError) throw parentError;
    if (!parent) return res.status(404).json({ ok: false, error: "Değerlendirme bulunamadı." });

    const username = String(req.user?.name || req.user?.email || "Kullanıcı").trim().slice(0, 120);

    const { data, error } = await supabase
      .from("product_reviews")
      .insert({
        product_id: parent.product_id,
        user_id: String(req.user.id),
        username,
        rating: 5,
        comment,
        parent_id: reviewId
      })
      .select("id,product_id,user_id,username,rating,comment,parent_id,created_at")
      .single();

    if (error) throw error;

    return res.status(201).json({
      ok: true,
      reply: {
        ...data,
        relativeTime: reviewRelativeTime(data.created_at),
        likes: 0,
        dislikes: 0,
        viewerVote: null,
        replies: []
      }
    });
  } catch (error) {
    console.error("REVIEW REPLY ERROR:", error);
    return res.status(500).json({ ok: false, error: "Cevap kaydedilemedi." });
  }
});

app.post("/api/reviews/:reviewId/vote", requireAuth, async (req, res) => {
  try {
    const reviewId = Number(req.params.reviewId);
    const voteType = String(req.body.voteType || "").trim().toLowerCase();

    if (!Number.isInteger(reviewId) || reviewId <= 0) {
      return res.status(400).json({ ok: false, error: "Geçersiz değerlendirme." });
    }
    if (!["like", "dislike"].includes(voteType)) {
      return res.status(400).json({ ok: false, error: "Geçersiz oy türü." });
    }

    const { data: existing, error: existingError } = await supabase
      .from("product_review_votes")
      .select("id,vote_type")
      .eq("review_id", reviewId)
      .eq("user_id", String(req.user.id))
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing?.vote_type === voteType) {
      const { error } = await supabase
        .from("product_review_votes")
        .delete()
        .eq("id", existing.id);
      if (error) throw error;
    } else if (existing) {
      const { error } = await supabase
        .from("product_review_votes")
        .update({ vote_type: voteType })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("product_review_votes")
        .insert({
          review_id: reviewId,
          user_id: String(req.user.id),
          vote_type: voteType
        });
      if (error) throw error;
    }

    const { data: votes, error: votesError } = await supabase
      .from("product_review_votes")
      .select("vote_type")
      .eq("review_id", reviewId);

    if (votesError) throw votesError;

    return res.json({
      ok: true,
      viewerVote: existing?.vote_type === voteType ? null : voteType,
      likes: (votes || []).filter(x => x.vote_type === "like").length,
      dislikes: (votes || []).filter(x => x.vote_type === "dislike").length
    });
  } catch (error) {
    console.error("REVIEW VOTE ERROR:", error);
    return res.status(500).json({ ok: false, error: "Oy işlemi başarısız." });
  }
});



/* =========================================================
   STATIC
   ========================================================= */

app.use(
  express.static(
    __dirname,
    {
      extensions:
        ["html"]
    }
  )
);


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

  "reset-password"
];


for (
  const page of pages
) {

  app.get(
    `/${page}.html`,
    (
      req,
      res
    ) =>
      res.sendFile(
        path.join(
          __dirname,
          `${page}.html`
        )
      )
  );
}


app.get(
  "/",
  (
    req,
    res
  ) =>
    res.sendFile(
      path.join(
        __dirname,
        "index.html"
      )
    )
);


app.use(
  (
    req,
    res
  ) => {

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


    res.status(404).send(`
<!doctype html>
<html lang="tr">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width,initial-scale=1"
>

<title>PanelMarket - 404</title>

<style>

body{
  margin:0;
  min-height:100vh;
  display:grid;
  place-items:center;
  background:#070a0f;
  color:#fff;
  font-family:Arial,sans-serif
}

.box{
  text-align:center;
  padding:45px;
  border:1px solid #1d2835;
  border-radius:22px;
  background:#0d131b
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
   START
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
      "Session: Cookie + Bearer AKTİF"
    );

    console.log(
      "GERÇEK BAKİYE: SUPABASE USERS.BALANCE"
    );

    console.log(
      "KULLANICI SAHTE TOPUP: KAPALI"
    );

    console.log(
      "================================="
    );
  }
);


