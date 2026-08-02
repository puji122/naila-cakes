const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');

const PORT = process.env.PORT || 8080;
const ROOT = __dirname;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json'
};

const STATUS = ['menunggu', 'konfirmasi', 'dikemas', 'dikirim', 'diterima'];

const dataDir = path.join(ROOT, 'data');
const ordersFile = path.join(dataDir, 'orders.json');
const productsFile = path.join(dataDir, 'products.json');
const emailConfigFile = path.join(dataDir, 'email-config.json');
const adminConfigFile = path.join(dataDir, 'admin-config.json');

const KATEGORI = ['kue', 'praline', 'snacks', 'hampers', 'cookies'];

const SESI_MASA = 8 * 60 * 60 * 1000;
const sesiAdmin = {};

function loadAdminConfig() {
  try { return JSON.parse(fs.readFileSync(adminConfigFile, 'utf8')); } catch (e) { return { password: 'admin123' }; }
}

function buatToken() {
  return crypto.randomBytes(24).toString('hex');
}

function parseCookies(req) {
  const out = {};
  String(req.headers.cookie || '').split(';').forEach(function (c) {
    const i = c.indexOf('=');
    if (i > -1) out[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim());
  });
  return out;
}

function isAdmin(req) {
  const token = parseCookies(req).naila_admin;
  if (!token || !sesiAdmin[token]) return false;
  if (sesiAdmin[token] < Date.now()) {
    delete sesiAdmin[token];
    return false;
  }
  return true;
}

function loadEmailConfig() {
  try { return JSON.parse(fs.readFileSync(emailConfigFile, 'utf8')); } catch (e) { return null; }
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function rupiah(n) {
  return 'Rp ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

const STATUS_LABEL = {
  menunggu: 'Menunggu Pembayaran',
  konfirmasi: 'Konfirmasi Pembayaran',
  dikemas: 'Dikemas',
  dikirim: 'Dikirim',
  diterima: 'Diterima'
};

function statusLabel(s) {
  return STATUS_LABEL[s] || s;
}

function kirimEmail(to, subject, html, attachments) {
  return new Promise(function (resolve) {
    const cfg = loadEmailConfig();
    if (!cfg || !cfg.user || !cfg.pass || !to) {
      console.log('Email tidak terkirim ke ' + to + ': konfigurasi email belum lengkap.');
      return resolve(false);
    }
    const transporter = nodemailer.createTransport({
      host: cfg.host || 'smtp.gmail.com',
      port: Number(cfg.port) || 465,
      secure: true,
      auth: { user: cfg.user, pass: cfg.pass }
    });
    const mail = { from: '"Naila\'s Cake" <' + cfg.user + '>', to: to, subject: subject, html: html };
    if (attachments && attachments.length) mail.attachments = attachments;
    transporter.sendMail(mail, function (err) {
      if (err) {
        console.log('Email gagal terkirim ke ' + to + ': ' + err.message);
        return resolve(false);
      }
      console.log('Email terkirim ke ' + to);
      resolve(true);
    });
  });
}

function pdfInvoice(order) {
  return new Promise(function (resolve) {
    const chunks = [];
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: { Title: 'Invoice ' + order.id, Author: "Naila's Cake" }
    });
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    const left = 50;
    const width = doc.page.width - 100;
    const coklat = '#4a2a23';
    const abu = '#8a7a6a';
    const teks = '#3d2c26';
    const krim = '#f7efe2';
    const hijau = '#1b7a3d';

    const tgl = new Date(order.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

    doc.font('Helvetica-Bold').fontSize(22).fillColor(coklat).text("Naila's Cake", left, 50);
    doc.font('Helvetica').fontSize(9).fillColor(abu)
      .text('Api-Api, Kota Bontang, Kalimantan Timur', left, 80)
      .text('WA: +62 851-8996-2001  |  pujin927@gmail.com', left, 92);

    doc.font('Helvetica-Bold').fontSize(16).fillColor(coklat).text('INVOICE', left, 50, { width: width, align: 'right' });
    doc.font('Helvetica').fontSize(9).fillColor(abu)
      .text('No. Invoice: ' + order.id, left, 78, { width: width, align: 'right' })
      .text(tgl, left, 90, { width: width, align: 'right' });

    doc.moveTo(left, 118).lineTo(left + width, 118).strokeColor(coklat).lineWidth(1.5).stroke();

    doc.rect(left, 134, width, 104).fill(krim);
    doc.fillColor(teks).font('Helvetica').fontSize(10);
    doc.text('Pelanggan: ' + (order.nama || '-'), left + 16, 146, { width: width - 32 });
    doc.text('No. WhatsApp: ' + (order.hp || '-'), left + 16, 162, { width: width - 32 });
    doc.text('Email: ' + (order.email || '-'), left + 16, 178, { width: width - 32 });
    doc.text('Alamat: ' + (order.alamat || '-'), left + 16, 194, { width: width - 32 });
    doc.text('Tanggal Pengiriman: ' + (order.tanggal || '-') + '  |  Metode Pembayaran: ' + (order.metode || '-'), left + 16, 212, { width: width - 32 });

    let y = 256;
    doc.rect(left, y, width, 22).fill(coklat);
    doc.fillColor(krim).font('Helvetica-Bold').fontSize(10);
    doc.text('Produk', left + 10, y + 6, { width: 230 });
    doc.text('Harga', left + 240, y + 6, { width: 110, align: 'right' });
    doc.text('Qty', left + 350, y + 6, { width: 45, align: 'center' });
    doc.text('Subtotal', left + 395, y + 6, { width: 90, align: 'right' });
    y += 22;

    (order.items || []).forEach(function (i) {
      doc.fillColor(teks).font('Helvetica').fontSize(10);
      doc.text(i.nama, left + 10, y + 6, { width: 230 });
      doc.text(rupiah(i.harga), left + 240, y + 6, { width: 110, align: 'right' });
      doc.text(String(i.qty), left + 350, y + 6, { width: 45, align: 'center' });
      doc.text(rupiah(i.harga * i.qty), left + 395, y + 6, { width: 90, align: 'right' });
      doc.moveTo(left, y + 22).lineTo(left + width, y + 22).lineWidth(0.5).strokeColor('#efe2cd').stroke();
      y += 22;
    });

    y += 10;
    doc.font('Helvetica-Bold').fontSize(14).fillColor(hijau).text('Total: ' + rupiah(order.total), left, y, { width: width, align: 'right' });
    y += 30;

    doc.font('Helvetica-Bold').fontSize(10).fillColor(coklat).text('Status: ' + statusLabel(order.status), left, y);
    y += 20;
    if (order.catatan) {
      doc.font('Helvetica').fontSize(9).fillColor(abu).text('Catatan: ' + order.catatan, left, y, { width: width });
      y += 18;
    }
    const cfg = loadEmailConfig() || {};
    const base = cfg.siteUrl || 'http://localhost:8080';
    doc.font('Helvetica').fontSize(9).fillColor(abu)
      .text('Lacak status pesanan: ' + base + '/pesanan.html?id=' + order.id, left, y, { width: width });

    doc.font('Helvetica').fontSize(9).fillColor(abu)
      .text("Terima kasih telah berbelanja di Naila's Cake", left, 780, { width: width, align: 'center' });

    doc.end();
  });
}

function invoiceHtml(order) {
  const cfg = loadEmailConfig() || {};
  const base = cfg.siteUrl || 'http://localhost:8080';
  const link = base + '/pesanan.html?id=' + encodeURIComponent(order.id);
  const tgl = new Date(order.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  const baris = (order.items || []).map(function (i) {
    return '<tr>' +
      '<td style="padding:10px 12px;border-bottom:1px solid #efe2cd">' + esc(i.nama) + '</td>' +
      '<td style="padding:10px 12px;border-bottom:1px solid #efe2cd;text-align:right">' + rupiah(i.harga) + '</td>' +
      '<td style="padding:10px 12px;border-bottom:1px solid #efe2cd;text-align:center">' + i.qty + '</td>' +
      '<td style="padding:10px 12px;border-bottom:1px solid #efe2cd;text-align:right">' + rupiah(i.harga * i.qty) + '</td>' +
      '</tr>';
  }).join('');
  return (
    '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #efe2cd;border-radius:14px;overflow:hidden">' +
    '<div style="background:#4a2a23;color:#e8c47a;padding:24px 30px">' +
    '<div style="font-size:22px;font-weight:bold">Naila\'s Cake</div>' +
    '<div style="color:#f7efe2;font-size:12px;margin-top:4px">Api-Api, Kota Bontang, Kalimantan Timur<br>WA: +62 851-8996-2001 &bull; pujin927@gmail.com</div>' +
    '</div>' +
    '<div style="padding:30px;color:#3d2c26">' +
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #4a2a23;padding-bottom:14px;margin-bottom:18px">' +
    '<div style="font-size:20px;font-weight:bold;letter-spacing:1px">INVOICE</div>' +
    '<div style="color:#8a7a6a;font-size:13px;text-align:right">No. Invoice: <strong style="color:#3d2c26">' + esc(order.id) + '</strong><br>' + tgl + '</div>' +
    '</div>' +
    '<div style="background:#f7efe2;border-radius:10px;padding:14px 18px;font-size:13px;margin-bottom:20px">' +
    '<strong>Pelanggan:</strong> ' + esc(order.nama) + '<br>' +
    '<strong>No. WhatsApp:</strong> ' + esc(order.hp || '-') + '<br>' +
    '<strong>Email:</strong> ' + esc(order.email || '-') + '<br>' +
    '<strong>Alamat:</strong> ' + esc(order.alamat || '-') + '<br>' +
    '<strong>Tanggal Pengiriman:</strong> ' + esc(order.tanggal || '-') + '<br>' +
    '<strong>Metode Pembayaran:</strong> ' + esc(order.metode || '-') +
    (order.catatan ? '<br><strong>Catatan:</strong> ' + esc(order.catatan) : '') +
    '</div>' +
    '<table style="width:100%;border-collapse:collapse;font-size:13px">' +
    '<tr style="background:#4a2a23;color:#f7efe2">' +
    '<th style="padding:10px 12px;text-align:left">Produk</th>' +
    '<th style="padding:10px 12px;text-align:right">Harga</th>' +
    '<th style="padding:10px 12px;text-align:center">Qty</th>' +
    '<th style="padding:10px 12px;text-align:right">Subtotal</th>' +
    '</tr>' + baris +
    '</table>' +
    '<div style="text-align:right;font-size:16px;font-weight:bold;padding:14px 6px 6px">Total: <span style="color:#1b7a3d">' + rupiah(order.total) + '</span></div>' +
    '<p style="text-align:center;margin:22px 0 6px">' +
    '<a href="' + esc(link) + '" style="background:#c99b3f;color:#fff;text-decoration:none;padding:11px 24px;border-radius:40px;font-weight:bold;font-size:13px">Lacak Status Pesanan</a>' +
    '</p>' +
    '</div>' +
    '<div style="background:#f7efe2;color:#8a7a6a;font-size:12px;text-align:center;padding:14px">Terima kasih telah berbelanja di Naila\'s Cake</div>' +
    '</div>'
  );
}

function emailPesanan(order, pesanStatus) {
  const cfg = loadEmailConfig() || {};
  const base = cfg.siteUrl || 'http://localhost:8080';
  const link = base + '/pesanan.html?id=' + encodeURIComponent(order.id);
  const baris = (order.items || []).map(function (i) {
    return '<li>' + esc(i.nama) + ' &times; ' + i.qty + ' &mdash; ' + rupiah(i.harga * i.qty) + '</li>';
  }).join('');
  return (
    '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #efe2cd;border-radius:14px;overflow:hidden">' +
    '<div style="background:#4a2a23;color:#e8c47a;padding:22px 28px;font-size:20px;font-weight:bold">Naila\'s Cake</div>' +
    '<div style="padding:26px 28px;color:#3d2c26">' +
    '<p>Halo ' + esc(order.nama) + ',</p>' +
    '<p>' + pesanStatus + '</p>' +
    '<p><strong>No. Pesanan:</strong> ' + esc(order.id) + '<br>' +
    '<strong>Status:</strong> <span style="color:#c99b3f;font-weight:bold">' + esc(statusLabel(order.status)) + '</span><br>' +
    '<strong>Total:</strong> ' + rupiah(order.total) + '</p>' +
    '<ul style="padding-left:18px">' + baris + '</ul>' +
    '<p style="text-align:center;margin:26px 0 6px">' +
    '<a href="' + esc(link) + '" style="background:#c99b3f;color:#fff;text-decoration:none;padding:12px 26px;border-radius:40px;font-weight:bold">Lacak Status Pesanan</a>' +
    '</p>' +
    '</div>' +
    '<div style="background:#f7efe2;color:#8a7a6a;font-size:12px;text-align:center;padding:14px">Naila\'s Cake &mdash; Api-Api, Kota Bontang, Kalimantan Timur</div>' +
    '</div>'
  );
}

function loadOrders() {
  try { return JSON.parse(fs.readFileSync(ordersFile, 'utf8')); } catch (e) { return []; }
}

function saveOrders(orders) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
  fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
}

function loadProducts() {
  try { return JSON.parse(fs.readFileSync(productsFile, 'utf8')); } catch (e) { return []; }
}

function saveProducts(products) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
  fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
}

function productId(products) {
  let n = 1;
  const ada = {};
  products.forEach(function (p) { ada[p.id] = true; });
  while (ada['P' + String(n).padStart(3, '0')]) n++;
  return 'P' + String(n).padStart(3, '0');
}

function newId() {
  return 'NC-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function readBody(req, cb) {
  let body = '';
  req.on('data', (c) => {
    body += c;
    if (body.length > 1e6) req.destroy();
  });
  req.on('end', () => {
    try { cb(JSON.parse(body || '{}')); } catch (e) { cb({}); }
  });
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const urlPath = decodeURIComponent(url.pathname);

  if (urlPath === '/api/admin/login' && req.method === 'POST') {
    readBody(req, (data) => {
      const cfg = loadAdminConfig();
      if (String(data.password || '') !== String(cfg.password || '')) {
        return sendJson(res, 401, { error: 'Password salah' });
      }
      const token = buatToken();
      sesiAdmin[token] = Date.now() + SESI_MASA;
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Set-Cookie': 'naila_admin=' + token + '; HttpOnly; SameSite=Lax; Path=/; Max-Age=' + Math.floor(SESI_MASA / 1000)
      });
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }

  if (urlPath === '/api/admin/logout' && req.method === 'POST') {
    const token = parseCookies(req).naila_admin;
    if (token) delete sesiAdmin[token];
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Set-Cookie': 'naila_admin=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'
    });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (urlPath === '/api/admin/status' && req.method === 'GET') {
    sendJson(res, isAdmin(req) ? 200 : 401, isAdmin(req) ? { ok: true } : { error: 'Belum login' });
    return;
  }

  if (urlPath === '/api/invoice/email' && req.method === 'POST') {
    if (!isAdmin(req)) return sendJson(res, 401, { error: 'Tidak diizinkan' });
    readBody(req, (data) => {
      const orders = loadOrders();
      const order = orders.find((o) => o.id === String(data.id || ''));
      if (!order) return sendJson(res, 404, { error: 'Pesanan tidak ditemukan' });
      pdfInvoice(order).then(function (buf) {
        kirimEmail(order.email, 'Invoice ' + order.id + ' | Naila\'s Cake', invoiceHtml(order), [
          { filename: 'Invoice-' + order.id + '.pdf', content: buf }
        ]).then(function (sent) {
          sendJson(res, 200, { ok: true, sent: sent });
        });
      });
    });
    return;
  }

  const invoicePdfMatch = urlPath.match(/^\/api\/invoice\/pdf\/(.+)$/);
  if (invoicePdfMatch && req.method === 'GET') {
    if (!isAdmin(req)) return sendJson(res, 401, { error: 'Tidak diizinkan' });
    const id = decodeURIComponent(invoicePdfMatch[1]);
    const orders = loadOrders();
    const order = orders.find((o) => o.id === id);
    if (!order) return sendJson(res, 404, { error: 'Pesanan tidak ditemukan' });
    pdfInvoice(order).then(function (buf) {
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Invoice-' + order.id + '.pdf"',
        'Content-Length': buf.length
      });
      res.end(buf);
    });
    return;
  }

  if (urlPath === '/api/order' && req.method === 'POST') {
    readBody(req, (data) => {
      const items = Array.isArray(data.items) ? data.items.map(function (i) {
        return {
          nama: String(i.nama || ''),
          harga: Math.round(Number(i.harga) || 0),
          qty: Math.max(1, Math.round(Number(i.qty) || 1))
        };
      }) : [];
      const order = {
        id: newId(),
        createdAt: new Date().toISOString(),
        nama: String(data.nama || ''),
        email: String(data.email || ''),
        hp: String(data.hp || ''),
        alamat: String(data.alamat || ''),
        tanggal: String(data.tanggal || ''),
        metode: String(data.metode || ''),
        catatan: String(data.catatan || ''),
        items: items,
        total: Math.round(Number(data.total) || 0),
        status: 'menunggu'
      };
      const orders = loadOrders();
      orders.unshift(order);
      saveOrders(orders);
      sendJson(res, 200, { id: order.id, status: order.status });
      kirimEmail(order.email, 'Pesanan Anda telah kami terima - Naila\'s Cake', emailPesanan(order, 'Terima kasih! Pesanan Anda telah kami terima dan sedang menunggu pembayaran. Silakan selesaikan pembayaran sesuai metode yang Anda pilih.'));
    });
    return;
  }

  if (urlPath === '/api/orders' && req.method === 'GET') {
    if (!isAdmin(req)) return sendJson(res, 401, { error: 'Tidak diizinkan' });
    sendJson(res, 200, loadOrders());
    return;
  }

  const orderMatch = urlPath.match(/^\/api\/order\/(.+)$/);
  if (orderMatch) {
    const id = decodeURIComponent(orderMatch[1]);
    const orders = loadOrders();
    const order = orders.find((o) => o.id === id);
    if (req.method === 'GET') {
      if (!order) return sendJson(res, 404, { error: 'Pesanan tidak ditemukan' });
      return sendJson(res, 200, order);
    }
    if (!isAdmin(req)) return sendJson(res, 401, { error: 'Tidak diizinkan' });
    if (req.method === 'PUT') {
      readBody(req, (data) => {
        if (!order) return sendJson(res, 404, { error: 'Pesanan tidak ditemukan' });
        if (STATUS.indexOf(data.status) === -1) return sendJson(res, 400, { error: 'Status tidak valid' });
        order.status = data.status;
        saveOrders(orders);
        sendJson(res, 200, order);
        kirimEmail(order.email, 'Status Pesanan ' + order.id + ' - ' + statusLabel(order.status) + ' | Naila\'s Cake', emailPesanan(order, 'Kabar baik! Status pesanan Anda telah diperbarui menjadi <strong>' + esc(statusLabel(order.status)) + '</strong>.'));
      });
      return;
    }
    if (req.method === 'DELETE') {
      if (!order) return sendJson(res, 404, { error: 'Pesanan tidak ditemukan' });
      const idx = orders.indexOf(order);
      orders.splice(idx, 1);
      saveOrders(orders);
      return sendJson(res, 200, { ok: true });
    }
    return sendJson(res, 405, { error: 'Metode tidak diizinkan' });
  }

  if (urlPath === '/api/products' && req.method === 'GET') {
    sendJson(res, 200, loadProducts());
    return;
  }

  if (urlPath === '/api/products' && req.method === 'POST') {
    if (!isAdmin(req)) return sendJson(res, 401, { error: 'Tidak diizinkan' });
    readBody(req, (data) => {
      if (!data.nama || !data.harga) return sendJson(res, 400, { error: 'Nama dan harga wajib diisi' });
      const products = loadProducts();
      const product = {
        id: productId(products),
        nama: String(data.nama || ''),
        kategori: KATEGORI.indexOf(data.kategori) !== -1 ? data.kategori : 'kue',
        deskripsi: String(data.deskripsi || ''),
        harga: Math.round(Number(data.harga) || 0),
        gambar: String(data.gambar || 'assets/images/kue-regular.jpg'),
        aktif: data.aktif !== false
      };
      products.push(product);
      saveProducts(products);
      sendJson(res, 200, product);
    });
    return;
  }

  const productMatch = urlPath.match(/^\/api\/products\/(.+)$/);
  if (productMatch) {
    const id = decodeURIComponent(productMatch[1]);
    const products = loadProducts();
    const product = products.find((p) => p.id === id);
    if (!isAdmin(req)) return sendJson(res, 401, { error: 'Tidak diizinkan' });
    if (req.method === 'PUT') {
      readBody(req, (data) => {
        if (!product) return sendJson(res, 404, { error: 'Produk tidak ditemukan' });
        if (data.nama !== undefined) product.nama = String(data.nama);
        if (data.kategori !== undefined) product.kategori = KATEGORI.indexOf(data.kategori) !== -1 ? data.kategori : product.kategori;
        if (data.deskripsi !== undefined) product.deskripsi = String(data.deskripsi);
        if (data.harga !== undefined) product.harga = Math.round(Number(data.harga) || 0);
        if (data.gambar !== undefined) product.gambar = String(data.gambar);
        if (data.aktif !== undefined) product.aktif = !!data.aktif;
        saveProducts(products);
        sendJson(res, 200, product);
      });
      return;
    }
    if (req.method === 'DELETE') {
      if (!product) return sendJson(res, 404, { error: 'Produk tidak ditemukan' });
      const idx = products.indexOf(product);
      products.splice(idx, 1);
      saveProducts(products);
      return sendJson(res, 200, { ok: true });
    }
    return sendJson(res, 405, { error: 'Metode tidak diizinkan' });
  }

  if (urlPath.startsWith('/api/') || urlPath.startsWith('/data/')) {
    sendJson(res, 404, { error: 'Not Found' });
    return;
  }

  let filePath = urlPath;
  if (filePath === '/') filePath = '/index.html';
  filePath = path.join(ROOT, path.normalize(filePath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(filePath)] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
}).listen(PORT, () => {
  console.log('Naila\'s Cake running at http://localhost:' + PORT);
});
