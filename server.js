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
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("SUPABASE AYARLARI EKSİK");
  console.error("SUPABASE_URL:", !!SUPABASE_URL);
  console.error("SUPABASE_SERVICE_ROLE_KEY:", !!SUPABASE_SERVICE_ROLE_KEY);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

const products = [
  { id:"admin-panel", name:"Profesyonel Admin Paneli", category:"Admin Paneli", description:"Modern ve güçlü yönetim paneli.", price:1499, oldPrice:1999, badge:"ÇOK SATAN", delivery:"Hemen", update:"1 Yıl", support:"30 Gün", active:true, sortOrder:1 },
  { id:"ecommerce-panel", name:"E-Ticaret Yönetim Paneli", category:"E-Ticaret", description:"E-ticaret sitenizi tek panelden yönetin.", price:2799, oldPrice:3499, badge:"%20 İNDİRİM", delivery:"Hemen", update:"1 Yıl", support:"60 Gün", active:true, sortOrder:2 },
  { id:"company-panel", name:"Firma Yönetim Paneli", category:"İşletme", description:"Firmalar için profesyonel yönetim sistemi.", price:1799, oldPrice:null, badge:"", delivery:"Hemen", update:"6 Ay", support:"30 Gün", active:true, sortOrder:3 },
  { id:"finance-panel", name:"Finans & Muhasebe Paneli", category:"Finans", description:"Finans ve muhasebe işlemlerini yönetin.", price:2999, oldPrice:null, badge:"YENİ", delivery:"24 Saat", update:"1 Yıl", support:"60 Gün", active:true, sortOrder:4 },
  { id:"support-panel", name:"Müşteri Destek Paneli", category:"Destek", description:"Müşteri destek süreçlerinizi yönetin.", price:1899, oldPrice:2199, badge:"", delivery:"Hemen", update:"1 Yıl", support:"90 Gün", active:true, sortOrder:5 },
  { id:"stock-panel", name:"Stok & Sipariş Paneli", category:"İşletme", description:"Stok ve siparişlerinizi kolayca yönetin.", price:1999, oldPrice:null, badge:"", delivery:"Hemen", update:"1 Yıl", support:"30 Gün", active:true, sortOrder:6 }
];

const licenses = {
  "1-site": { name:"1 Site", multiplier:1 },
  "3-site": { name:"3 Site", multiplier:1.667 },
  unlimited: { name:"Sınırsız Site", multiplier:3.334 }
};

const money = value => {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};
const findProduct = id => products.find(p => p.id === id);
const createOrderNumber = () => `PM-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
const createLicenseKey = () => `PMK-${crypto.randomBytes(12).toString("hex").toUpperCase()}`;
const createToken = () => crypto.randomBytes(32).toString("hex");

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  return { hash: crypto.scryptSync(password, salt, 64).toString("hex"), salt };
}
function verifyPassword(password, user) {
  if (!user?.password_hash || !user?.password_salt) return false;
  try {
    const result = crypto.scryptSync(password, user.password_salt, 64);
    const stored = Buffer.from(user.password_hash, "hex");
    return result.length === stored.length && crypto.timingSafeEqual(result, stored);
  } catch { return false; }
}
function getCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  const cookies = {};
  for (const item of header.split(";")) {
    const i = item.indexOf("=");
    if (i === -1) continue;
    const key = item.slice(0, i).trim();
    const value = item.slice(i + 1).trim();
    try { cookies[key] = decodeURIComponent(value); } catch { cookies[key] = value; }
  }
  return cookies;
}
function getTokenFromRequest(req) {
  const auth = String(req.headers.authorization || "").trim();
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (match?.[1]?.trim()) return match[1].trim();
  return String(getCookies(req).panelmarket_token || "").trim();
}
function setSessionCookie(res, token) {
  const cookie = [`panelmarket_token=${encodeURIComponent(token)}`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=2592000"];
  if (process.env.NODE_ENV === "production") cookie.push("Secure");
  res.setHeader("Set-Cookie", cookie.join("; "));
}
function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", "panelmarket_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; SameSite=Lax");
}
function publicUser(user) {
  return { id:user.id, name:user.name || "", email:user.email || "", balance:money(user.balance), isAdmin:user.is_admin === true, is_admin:user.is_admin === true };
}
function formatProduct(p) {
  return { id:p.id, name:p.name, category:p.category || "", description:p.description || "", price:money(p.price), oldPrice:p.oldPrice ?? p.old_price ?? null, badge:p.badge || "", delivery:p.delivery || "Hemen", update:p.update || p.update_period || "1 Yıl", support:p.support || "30 Gün", active:p.active !== false, sortOrder:Number(p.sortOrder ?? p.sort_order ?? 0) };
}
function formatOrder(o) {
  return { id:o.id, userId:o.user_id, orderNumber:o.order_number, productId:o.product_id, productName:o.product_name, licenseId:o.license_id, licenseName:o.license_name, amount:money(o.amount), status:o.status, deliveryStatus:o.delivery_status, licenseKey:o.license_key, createdAt:o.created_at };
}
function calculatePrice(product, licenseId) {
  const license = licenses[licenseId];
  if (!license) throw new Error("Geçersiz lisans.");
  return money(Number(product.price) * license.multiplier);
}

async function findUserByEmail(email) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  if (!normalizedEmail) return null;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .ilike("email", normalizedEmail)
    .limit(1);

  if (error) {
    console.error("FIND USER BY EMAIL ERROR:", error);
    throw error;
  }

  return Array.isArray(data) && data.length > 0
    ? data[0]
    : null;
}

async function findUserById(id) {
  const { data, error } = await supabase.from("users").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}
async function getSessionFromRequest(req) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  const { data: session, error } = await supabase.from("sessions").select("token,user_id,created_at").eq("token", token).maybeSingle();
  if (error) { console.error("SESSION QUERY ERROR:", error.message); return null; }
  if (!session) return null;
  const user = await findUserById(session.user_id);
  if (!user) { await supabase.from("sessions").delete().eq("token", token); return null; }
  return { token, session, user };
}
async function requireAuth(req, res, next) {
  try {
    const auth = await getSessionFromRequest(req);
    if (!auth) return res.status(401).json({ ok:false, authenticated:false, error:"Oturum gerekli.", loginRequired:true });
    req.user = auth.user;
    req.authToken = auth.token;
    next();
  } catch (e) { console.error("AUTH ERROR:", e); res.status(500).json({ ok:false, error:"Oturum kontrolü başarısız." }); }
}
async function requireAdmin(req, res, next) {
  if (!req.user?.id) return res.status(401).json({ ok:false, authenticated:false, error:"Admin girişi gerekli.", loginRequired:true });
  try {
    const { data:user, error } = await supabase.from("users").select("id,name,email,balance,is_admin,created_at").eq("id", req.user.id).maybeSingle();
    if (error) throw error;
    if (!user) return res.status(401).json({ ok:false, authenticated:false, error:"Kullanıcı bulunamadı.", loginRequired:true });
    if (user.is_admin !== true) return res.status(403).json({ ok:false, authenticated:true, is_admin:false, isAdmin:false, error:"Bu hesap admin yetkisine sahip değil." });
    req.adminUser = user;
    next();
  } catch (e) { console.error("ADMIN AUTH ERROR:", e); res.status(500).json({ ok:false, error:"Admin doğrulama hatası." }); }
}

/* PUBLIC PRODUCTS */
app.get("/api/products", async (req,res) => {
  try {
    const { data, error } = await supabase.from("products").select("*").eq("active", true).order("sort_order", {ascending:true});
    if (!error && data?.length) return res.json(data.map(formatProduct));
  } catch (e) { console.error("PRODUCTS DB ERROR:",e.message); }
  res.json(products.map(formatProduct));
});
app.get("/api/products/:id", async (req,res) => {
  try {
    let product = findProduct(req.params.id);
    const { data } = await supabase.from("products").select("*").eq("id",req.params.id).maybeSingle();
    if (data) product = formatProduct(data);
    if (!product) return res.status(404).json({error:"Ürün bulunamadı."});
    const prices = {}; for (const [id,l] of Object.entries(licenses)) prices[id]={name:l.name,price:calculatePrice(product,id)};
    res.json({...product,licenses:prices});
  } catch(e){ console.error(e); res.status(500).json({error:"Ürün alınamadı."}); }
});

/* REGISTER */
app.post("/api/register", async (req,res) => {
  try {
    const name=String(req.body.name||"").trim(), email=String(req.body.email||"").trim().toLowerCase(), password=String(req.body.password||"");
    if(!name) return res.status(400).json({error:"Ad soyad alanı zorunludur."});
    if(!email || !email.includes("@")) return res.status(400).json({error:"Geçerli bir e-posta adresi girin."});
    if(password.length<8) return res.status(400).json({error:"Şifre en az 8 karakter olmalıdır."});
    if(!/[A-Za-z]/.test(password)) return res.status(400).json({error:"Şifre en az bir harf içermelidir."});
    if(!/[0-9]/.test(password)) return res.status(400).json({error:"Şifre en az bir rakam içermelidir."});
    if(await findUserByEmail(email)) return res.status(409).json({error:"Bu e-posta adresi zaten kayıtlı."});
    const pw=hashPassword(password);
    const {data:user,error}=await supabase.from("users").insert({name,email,password_hash:pw.hash,password_salt:pw.salt,balance:0,is_admin:false}).select("*").single();
    if(error) throw error;
    const token=createToken();
    const {error:se}=await supabase.from("sessions").insert({token,user_id:user.id});
    if(se) throw se;
    setSessionCookie(res,token);
    res.status(201).json({ok:true,success:true,authenticated:true,token,user:publicUser(user)});
  }catch(e){console.error("REGISTER ERROR:",e);res.status(500).json({error:"Kayıt sırasında bir hata oluştu."});}
});

/* LOGIN */
async function loginUser(user,password,res){
  if(!verifyPassword(password,user)) return res.status(401).json({ok:false,success:false,authenticated:false,error:"E-posta veya şifre hatalı."});
  const token=createToken();
  const {data:session,error}=await supabase.from("sessions").insert({token,user_id:user.id}).select("token,user_id,created_at").single();
  if(error) throw error;
  setSessionCookie(res,token);
  console.log("LOGIN: Session oluşturuldu:",session.user_id,"ADMIN:",user.is_admin===true);
  return res.status(200).json({ok:true,success:true,authenticated:true,token,is_admin:user.is_admin===true,isAdmin:user.is_admin===true,user:publicUser(user)});
}
app.post("/api/login",async(req,res)=>{
  try{
    const email=String(req.body.email||"").trim().toLowerCase(), password=String(req.body.password||"");
    if(!email||!password)return res.status(400).json({ok:false,success:false,error:"E-posta ve şifre zorunludur."});
    let user=await findUserByEmail(email);
    if(!user&&email==="demo@panelmarket.com"){
      const pw=hashPassword("12345678");
      const {data:demo,error}=await supabase.from("users").insert({name:"Demo Kullanıcı",email,password_hash:pw.hash,password_salt:pw.salt,balance:5000,is_admin:true}).select("*").single();
      if(error) throw error; user=demo;
    }
    if(user&&email==="demo@panelmarket.com"&&user.is_admin!==true){
      const {data:updated,error}=await supabase.from("users").update({is_admin:true}).eq("id",user.id).select("*").single();
      if(error) throw error; user=updated;
    }
    if(!user||!verifyPassword(password,user))return res.status(401).json({ok:false,success:false,authenticated:false,error:"E-posta veya şifre hatalı."});
    return await loginUser(user,password,res);
  }catch(e){console.error("LOGIN ERROR:",e);res.status(500).json({ok:false,success:false,error:"Giriş sırasında bir hata oluştu."});}
});

/* ADMIN LOGIN */
app.post("/api/admin/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        success: false,
        authenticated: false,
        error: "E-posta ve şifre zorunludur."
      });
    }

    let user = null;

    // DEMO ADMIN HESABI
    if (email === "demo@panelmarket.com") {
      const ADMIN_ID =
        "36002d6d-f4d4-4c4a-a03f-56076c6bf6eb";

      // Önce ID ile bul
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", ADMIN_ID)
        .single();

      if (error) {
        console.error("DEMO ADMIN QUERY ERROR:", error);

        return res.status(500).json({
          ok: false,
          success: false,
          authenticated: false,
          error: "Admin hesabı veritabanından okunamadı.",
          databaseError: error.message
        });
      }

      user = data;
    } else {
      // Normal kullanıcı
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (error) {
        console.error("ADMIN USER QUERY ERROR:", error);

        return res.status(500).json({
          ok: false,
          success: false,
          authenticated: false,
          error: "Kullanıcı sorgulanamadı.",
          databaseError: error.message
        });
      }

      user = data;
    }

    if (!user) {
      return res.status(401).json({
        ok: false,
        success: false,
        authenticated: false,
        error: "Kullanıcı bulunamadı."
      });
    }

    console.log("ADMIN USER FOUND:", {
      id: user.id,
      email: user.email,
      is_admin: user.is_admin
    });

    // ADMIN KONTROLÜ
    if (user.is_admin !== true) {
      return res.status(403).json({
        ok: false,
        success: false,
        authenticated: false,
        is_admin: false,
        isAdmin: false,
        error: "Bu hesap admin yetkisine sahip değil."
      });
    }

    // ŞİFRE KONTROLÜ
    if (!verifyPassword(password, user)) {
      return res.status(401).json({
        ok: false,
        success: false,
        authenticated: false,
        error: "E-posta veya şifre hatalı."
      });
    }

    // SESSION OLUŞTUR
    const token = createToken();

    const {
      data: session,
      error: sessionError
    } = await supabase
      .from("sessions")
      .insert({
        token: token,
        user_id: user.id
      })
      .select("token,user_id,created_at")
      .single();

    if (sessionError) {
      console.error("ADMIN SESSION ERROR:", sessionError);

      return res.status(500).json({
        ok: false,
        success: false,
        authenticated: false,
        error: "Admin oturumu oluşturulamadı.",
        databaseError: sessionError.message
      });
    }

    setSessionCookie(res, token);

    console.log(
      "ADMIN LOGIN BAŞARILI:",
      user.email,
      user.id
    );

    return res.status(200).json({
      ok: true,
      success: true,
      authenticated: true,
      token: token,
      is_admin: true,
      isAdmin: true,
      user: publicUser(user)
    });

  } catch (e) {
    console.error("ADMIN LOGIN ERROR:", e);

    return res.status(500).json({
      ok: false,
      success: false,
      authenticated: false,
      error: "Admin girişi sırasında bir hata oluştu.",
      databaseError: e?.message || null
    });
  }
});

/* ADMIN ME - CRITICAL */
app.get("/api/admin/me",requireAuth,requireAdmin,async(req,res)=>{
  const u=req.adminUser;
  const user={id:u.id,name:u.name||"",email:u.email||"",balance:money(u.balance),is_admin:true,isAdmin:true};
  res.json({ok:true,authenticated:true,is_admin:true,isAdmin:true,user,admin:user});
});

/* AUTH */
app.get("/api/auth/me",requireAuth,(req,res)=>res.json({ok:true,authenticated:true,user:publicUser(req.user)}));
app.get("/api/account",requireAuth,async(req,res)=>{
  try{const {count,error}=await supabase.from("orders").select("id",{count:"exact",head:true}).eq("user_id",req.user.id);if(error)throw error;res.json({...publicUser(req.user),orderCount:count||0});}catch(e){res.status(500).json({error:"Hesap bilgileri alınamadı."});}
});
app.post("/api/logout",async(req,res)=>{try{const token=getTokenFromRequest(req);if(token)await supabase.from("sessions").delete().eq("token",token);clearSessionCookie(res);res.json({ok:true,success:true});}catch(e){console.error(e);clearSessionCookie(res);res.status(500).json({ok:false,error:"Çıkış yapılamadı."});}});

/* WALLET */
app.post("/api/wallet/topup",requireAuth,async(req,res)=>{
  try{const amount=Number(req.body.amount);if(!Number.isFinite(amount)||amount<=0||amount>1000000)return res.status(400).json({error:"Geçerli bir bakiye miktarı girin."});const old=money(req.user.balance), next=money(old+amount);const {data:user,error}=await supabase.from("users").update({balance:next}).eq("id",req.user.id).select("*").single();if(error)throw error;const {error:te}=await supabase.from("transactions").insert({user_id:req.user.id,type:"credit",amount,note:"Bakiye yükleme"});if(te)console.error("Transaction error:",te.message);res.json({success:true,balance:money(user.balance)});}catch(e){console.error(e);res.status(500).json({error:"Bakiye yüklenemedi."});}
});

/* ORDERS */
app.post("/api/orders",requireAuth,async(req,res)=>{
  try{
    const product=findProduct(String(req.body.productId||""));const licenseId=String(req.body.licenseId||"");
    if(!product)return res.status(404).json({error:"Ürün bulunamadı."});if(!licenses[licenseId])return res.status(400).json({error:"Lisans seçimi geçersiz."});
    const total=calculatePrice(product,licenseId);const {data:fresh,error:ue}=await supabase.from("users").select("*").eq("id",req.user.id).single();if(ue)throw ue;const balance=money(fresh.balance);if(balance<total)return res.status(400).json({error:"Yetersiz bakiye."});
    const newBalance=money(balance-total);const {data:updated,error:be}=await supabase.from("users").update({balance:newBalance}).eq("id",req.user.id).eq("balance",balance).select("*").maybeSingle();if(be)throw be;if(!updated)return res.status(409).json({error:"Bakiye değişti. Lütfen tekrar deneyin."});
    const orderNumber=createOrderNumber(), licenseKey=createLicenseKey();const {data:order,error:oe}=await supabase.from("orders").insert({user_id:req.user.id,order_number:orderNumber,product_id:product.id,product_name:product.name,license_id:licenseId,license_name:licenses[licenseId].name,amount:total,status:"Ödeme Alındı",delivery_status:"Teslim Edilebilir",license_key:licenseKey}).select("*").single();
    if(oe){await supabase.from("users").update({balance}).eq("id",req.user.id);throw oe;}
    const {error:te}=await supabase.from("transactions").insert({user_id:req.user.id,type:"debit",amount:total,note:`${product.name} satın alımı`});if(te)console.error("Transaction error:",te.message);
    res.json({success:true,order:formatOrder(order),balance:money(updated.balance)});
  }catch(e){console.error("ORDER ERROR:",e);res.status(500).json({error:"Sipariş oluşturulamadı."});}
});
app.get("/api/orders",requireAuth,async(req,res)=>{try{const {data,error}=await supabase.from("orders").select("*").eq("user_id",req.user.id).order("created_at",{ascending:false});if(error)throw error;res.json((data||[]).map(formatOrder));}catch(e){res.status(500).json({error:"Siparişler alınamadı."});}});
app.get("/api/orders/:id",requireAuth,async(req,res)=>{try{let q=supabase.from("orders").select("*").eq("user_id",req.user.id);q=/^[0-9a-fA-F-]{36}$/.test(req.params.id)?q.eq("id",req.params.id):q.eq("order_number",req.params.id);const {data,error}=await q.maybeSingle();if(error)throw error;if(!data)return res.status(404).json({error:"Sipariş bulunamadı."});res.json(formatOrder(data));}catch(e){res.status(500).json({error:"Sipariş alınamadı."});}});
app.get("/api/account/transactions",requireAuth,async(req,res)=>{try{const {data,error}=await supabase.from("transactions").select("*").eq("user_id",req.user.id).order("created_at",{ascending:false});if(error)throw error;res.json((data||[]).map(t=>({id:t.id,type:t.type,amount:money(t.amount),note:t.note,date:t.created_at})));}catch(e){res.status(500).json({error:"İşlem geçmişi alınamadı."});}});
app.put("/api/account",requireAuth,async(req,res)=>{try{const name=String(req.body.name||"").trim();if(!name)return res.status(400).json({error:"Ad soyad boş bırakılamaz."});const {data:user,error}=await supabase.from("users").update({name}).eq("id",req.user.id).select("*").single();if(error)throw error;res.json({success:true,user:publicUser(user)});}catch(e){res.status(500).json({error:"Hesap güncellenemedi."});}});
app.post("/api/account/password",requireAuth,async(req,res)=>{try{const oldPassword=String(req.body.oldPassword||""),newPassword=String(req.body.newPassword||"");if(!verifyPassword(oldPassword,req.user))return res.status(401).json({error:"Mevcut şifre hatalı."});if(newPassword.length<8||!/[A-Za-z]/.test(newPassword)||!/[0-9]/.test(newPassword))return res.status(400).json({error:"Yeni şifre en az 8 karakter ve harf/rakam içermelidir."});const pw=hashPassword(newPassword);const {error}=await supabase.from("users").update({password_hash:pw.hash,password_salt:pw.salt}).eq("id",req.user.id);if(error)throw error;res.json({success:true,message:"Şifre değiştirildi."});}catch(e){res.status(500).json({error:"Şifre değiştirilemedi."});}});

/* ADMIN DASHBOARD */
app.get("/api/admin/dashboard",requireAuth,requireAdmin,async(req,res)=>{
  try{
    const [users,orders,prods,bal,credits,debits]=await Promise.all([
      supabase.from("users").select("id",{count:"exact",head:true}),
      supabase.from("orders").select("id",{count:"exact",head:true}),
      supabase.from("products").select("id",{count:"exact",head:true}),
      supabase.from("users").select("balance"),
      supabase.from("transactions").select("amount").eq("type","credit"),
      supabase.from("transactions").select("amount").eq("type","debit")
    ]);
    res.json({ok:true,stats:{totalUsers:users.count||0,totalOrders:orders.count||0,totalProducts:prods.count||0,activeProducts:products.filter(p=>p.active).length,totalBalance:money((bal.data||[]).reduce((a,u)=>a+Number(u.balance||0),0)),totalSales:money((debits.data||[]).reduce((a,t)=>a+Number(t.amount||0),0)),totalCredits:money((credits.data||[]).reduce((a,t)=>a+Number(t.amount||0),0)),totalDebits:money((debits.data||[]).reduce((a,t)=>a+Number(t.amount||0),0))}});
  }catch(e){console.error("ADMIN DASHBOARD ERROR:",e);res.status(500).json({ok:false,error:"Dashboard alınamadı."});}
});
app.get("/api/admin/users",requireAuth,requireAdmin,async(req,res)=>{try{const {data,error}=await supabase.from("users").select("id,name,email,balance,is_admin,created_at").order("created_at",{ascending:false});if(error)throw error;res.json(data||[]);}catch(e){res.status(500).json({error:"Kullanıcılar alınamadı."});}});
app.get("/api/admin/orders",requireAuth,requireAdmin,async(req,res)=>{try{const {data,error}=await supabase.from("orders").select("*").order("created_at",{ascending:false});if(error)throw error;res.json((data||[]).map(formatOrder));}catch(e){res.status(500).json({error:"Siparişler alınamadı."});}});
app.post("/api/admin/users/:id/balance",requireAuth,requireAdmin,async(req,res)=>{try{const amount=Number(req.body.amount),type=String(req.body.type||"credit"),note=String(req.body.note||"").trim();if(!Number.isFinite(amount)||amount<=0)return res.status(400).json({error:"Geçerli tutar girin."});if(!["credit","debit"].includes(type))return res.status(400).json({error:"Geçersiz bakiye işlemi."});const {data:user,error}=await supabase.from("users").select("*").eq("id",req.params.id).single();if(error)throw error;const next=money(Number(user.balance||0)+(type==="credit"?amount:-amount));if(next<0)return res.status(400).json({error:"Bakiye eksiye düşemez."});const {data:updated,error:ue}=await supabase.from("users").update({balance:next}).eq("id",user.id).select("*").single();if(ue)throw ue;const {error:te}=await supabase.from("transactions").insert({user_id:user.id,type,amount,note:note||`Admin ${type==="credit"?"bakiye yükleme":"bakiye düşme"}`});if(te)console.error(te.message);res.json({success:true,user:publicUser(updated)});}catch(e){console.error(e);res.status(500).json({error:"Bakiye güncellenemedi."});}});
app.patch("/api/admin/orders/:id",requireAuth,requireAdmin,async(req,res)=>{try{const patch={};if(req.body.status!==undefined)patch.status=String(req.body.status);if(req.body.deliveryStatus!==undefined)patch.delivery_status=String(req.body.deliveryStatus);const {data,error}=await supabase.from("orders").update(patch).eq("id",req.params.id).select("*").single();if(error)throw error;res.json({success:true,order:formatOrder(data)});}catch(e){res.status(500).json({error:"Sipariş güncellenemedi."});}});
app.get("/api/admin/transactions",requireAuth,requireAdmin,async(req,res)=>{try{const {data,error}=await supabase.from("transactions").select("*").order("created_at",{ascending:false});if(error)throw error;res.json(data||[]);}catch(e){res.status(500).json({error:"İşlemler alınamadı."});}});

/* ADMIN PRODUCTS */
app.get("/api/admin/products",requireAuth,requireAdmin,async(req,res)=>{try{const {data,error}=await supabase.from("products").select("*").order("sort_order",{ascending:true});if(error)throw error;res.json(data||[]);}catch(e){res.status(500).json({error:"Ürünler alınamadı."});}});
app.post("/api/admin/products",requireAuth,requireAdmin,async(req,res)=>{try{const id=String(req.body.id||"").trim().toLowerCase();if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))return res.status(400).json({error:"Geçerli ürün ID girin."});const row={id,name:String(req.body.name||"").trim(),category:String(req.body.category||""),description:String(req.body.description||""),price:money(req.body.price),old_price:req.body.oldPrice==null?null:money(req.body.oldPrice),badge:String(req.body.badge||""),delivery:String(req.body.delivery||"Hemen"),update_period:String(req.body.update||"1 Yıl"),support:String(req.body.support||"30 Gün"),active:req.body.active!==false,sort_order:Number(req.body.sortOrder||0)};if(!row.name||row.price<0)return res.status(400).json({error:"Ürün adı ve fiyat zorunludur."});const {data,error}=await supabase.from("products").insert(row).select("*").single();if(error)throw error;res.status(201).json({success:true,product:data});}catch(e){res.status(500).json({error:"Ürün oluşturulamadı."});}});
app.put("/api/admin/products/:id",requireAuth,requireAdmin,async(req,res)=>{try{const patch={};for(const [k,v] of Object.entries({name:req.body.name,category:req.body.category,description:req.body.description,badge:req.body.badge,delivery:req.body.delivery,update_period:req.body.update,support:req.body.support}))if(v!==undefined)patch[k]=String(v);if(req.body.price!==undefined)patch.price=money(req.body.price);if(req.body.oldPrice!==undefined)patch.old_price=req.body.oldPrice===null?null:money(req.body.oldPrice);if(req.body.active!==undefined)patch.active=Boolean(req.body.active);if(req.body.sortOrder!==undefined)patch.sort_order=Number(req.body.sortOrder);const {data,error}=await supabase.from("products").update(patch).eq("id",req.params.id).select("*").single();if(error)throw error;res.json({success:true,product:data});}catch(e){res.status(500).json({error:"Ürün güncellenemedi."});}});
app.patch("/api/admin/products/:id/status",requireAuth,requireAdmin,async(req,res)=>{try{const {data,error}=await supabase.from("products").update({active:Boolean(req.body.active)}).eq("id",req.params.id).select("*").single();if(error)throw error;res.json({success:true,product:data});}catch(e){res.status(500).json({error:"Ürün durumu güncellenemedi."});}});
app.delete("/api/admin/products/:id",requireAuth,requireAdmin,async(req,res)=>{try{const {error}=await supabase.from("products").delete().eq("id",req.params.id);if(error)throw error;res.json({success:true});}catch(e){res.status(500).json({error:"Ürün silinemedi."});}});

/* DEBUG */
app.get("/api/session/status",async(req,res)=>{try{const token=getTokenFromRequest(req);if(!token)return res.json({ok:true,tokenPresent:false,authenticated:false});const auth=await getSessionFromRequest(req);res.json({ok:true,tokenPresent:true,tokenLength:token.length,authenticated:!!auth,user:auth?publicUser(auth.user):null,is_admin:auth?.user?.is_admin===true,isAdmin:auth?.user?.is_admin===true});}catch(e){res.status(500).json({ok:false,error:e.message});}});
app.get("/health",async(req,res)=>{try{const {error}=await supabase.from("users").select("id").limit(1);if(error)return res.status(500).json({ok:false,service:"PanelMarket",database:"Supabase bağlantı hatası",error:error.message});res.json({ok:true,service:"PanelMarket",database:"Supabase bağlı"});}catch(e){res.status(500).json({ok:false,service:"PanelMarket",database:"Supabase bağlantı hatası"});}});

app.get("/api/debug/supabase-info", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id,email,is_admin")
      .limit(10);

    if (error) {
      return res.status(500).json({
        ok: false,
        error: error.message,
        code: error.code
      });
    }

    return res.json({
      ok: true,
      supabaseHost: new URL(SUPABASE_URL).hostname,
      userCountReturned: data?.length || 0,
      users: (data || []).map(u => ({
        id: u.id,
        email: u.email,
        is_admin: u.is_admin
      }))
    });

  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: e.message
    });
  }
});

/* STATIC */
app.use(express.static(__dirname,{extensions:["html"]}));
const pages=["index","urun","sepet","odeme","siparislerim","hesabim","teslimat","login","register","admin"];
for(const page of pages)app.get(`/${page}.html`,(req,res)=>res.sendFile(path.join(__dirname,`${page}.html`)));
app.get("/",(req,res)=>res.sendFile(path.join(__dirname,"index.html")));
app.use((req,res)=>{if(req.path.startsWith("/api/"))return res.status(404).json({ok:false,error:"API adresi bulunamadı."});res.status(404).send(`<!doctype html><html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PanelMarket - 404</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#070a0f;color:#fff;font-family:Arial,sans-serif}.box{text-align:center;padding:45px;border:1px solid #1d2835;border-radius:22px;background:#0d131b}a{display:inline-block;margin-top:20px;padding:13px 22px;border-radius:10px;background:#1677ff;color:#fff;text-decoration:none;font-weight:800}</style></head><body><div class="box"><h1>Sayfa bulunamadı</h1><p>Aradığınız PanelMarket sayfası mevcut değil.</p><a href="/">Ana Sayfaya Dön</a></div></body></html>`);});

app.listen(PORT,()=>{console.log("=================================");console.log("PanelMarket çalışıyor");console.log(`Port: ${PORT}`);console.log("Supabase: BAĞLI");console.log("Admin API: AKTİF");console.log("Session: Cookie + Bearer AKTİF");console.log("=================================");});
