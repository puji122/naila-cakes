(function () {
  var STATUS = [
    { nilai: 'menunggu', label: 'Menunggu Pembayaran' },
    { nilai: 'konfirmasi', label: 'Konfirmasi Pembayaran' },
    { nilai: 'dikemas', label: 'Dikemas' },
    { nilai: 'dikirim', label: 'Dikirim' },
    { nilai: 'diterima', label: 'Diterima' }
  ];
  var KATEGORI_LABEL = {
    kue: 'Kue Reguler',
    praline: 'Praline',
    snacks: 'Snacks',
    hampers: 'Hampers',
    cookies: 'Cookies'
  };

  function labelStatus(s) {
    for (var i = 0; i < STATUS.length; i++) if (STATUS[i].nilai === s) return STATUS[i].label;
    return s;
  }

  function labelKategori(k) {
    return KATEGORI_LABEL[k] || k;
  }

  function rupiah(n) {
    return 'Rp ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function tglRapi(iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function tanggalPesan(t) {
    return t || '-';
  }

  var infoEl = document.getElementById('info');
  function tampilkanPesan(teks, ok) {
    infoEl.textContent = teks;
    infoEl.style.display = 'block';
    infoEl.style.background = ok ? '#e8f9ee' : '#fdeaea';
    infoEl.style.color = ok ? '#1b7a3d' : '#a93226';
  }

  function hapusInfo() {
    infoEl.style.display = 'none';
  }

  /* ===== Tabs ===== */
  document.querySelectorAll('.tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('aktif'); });
      btn.classList.add('aktif');
      document.querySelectorAll('.tab-panel').forEach(function (p) { p.style.display = 'none'; });
      document.getElementById('tab-' + btn.dataset.tab).style.display = 'block';
      hapusInfo();
      if (btn.dataset.tab === 'ringkasan') muatRingkasan();
      if (btn.dataset.tab === 'pesanan') muatPesanan();
      if (btn.dataset.tab === 'produk') muatProduk();
    });
  });

  /* ===== API helper ===== */
  function api(method, url, data, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    if (data) xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function () { cb(xhr.status, xhr.responseText); };
    xhr.onerror = function () { cb(0, ''); };
    xhr.send(data ? JSON.stringify(data) : null);
  }

  /* ===== Login / Logout ===== */
  api('GET', '/api/admin/status', null, function (status) {
    if (status !== 200) {
      window.location.href = 'login.html';
      return;
    }
    muatRingkasan();
  });

  var logoutBtn = document.getElementById('adminLogout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function (e) {
      e.preventDefault();
      api('POST', '/api/admin/logout', null, function () {
        window.location.href = 'login.html';
      });
    });
  }

  /* ===== Ringkasan ===== */
  function muatRingkasan() {
    api('GET', '/api/orders', null, function (status, teks) {
      var orders = [];
      if (status === 200) { try { orders = JSON.parse(teks); } catch (e) {} }
      var statGrid = document.getElementById('statGrid');
      var ringkasBody = document.getElementById('ringkasBody');

      var jumlah = orders.length;
      var menunggu = 0, konfirmasi = 0, proses = 0, selesai = 0;
      var pendapatan = 0;
      orders.forEach(function (o) {
        if (o.status === 'menunggu') menunggu++;
        else if (o.status === 'konfirmasi') konfirmasi++;
        else if (o.status === 'dikemas' || o.status === 'dikirim') proses++;
        else if (o.status === 'diterima') { selesai++; pendapatan += o.total; }
      });

      var kartu = [
        { label: 'Total Pesanan', nilai: jumlah, warna: '' },
        { label: 'Menunggu Pembayaran', nilai: menunggu, warna: '#d68910' },
        { label: 'Konfirmasi Pembayaran', nilai: konfirmasi, warna: '#c99b3f' },
        { label: 'Sedang Diproses', nilai: proses, warna: '#2980b9' },
        { label: 'Selesai (Diterima)', nilai: selesai, warna: '#1b7a3d' },
        { label: 'Total Produk', nilai: 0, warna: '' }
      ];

      statGrid.innerHTML = '';
      kartu.forEach(function (k, i) {
        var div = document.createElement('div');
        div.className = 'stat-kartu';
        if (k.warna) div.style.borderTopColor = k.warna;
        var isi = '<span>' + esc(k.label) + '</span><strong>' + (i === 5 ? '&hellip;' : k.nilai) + '</strong>';
        if (i === 5) {
          api('GET', '/api/products', null, function (s2, t2) {
            try { div.querySelector('strong').textContent = JSON.parse(t2).length; } catch (e) {}
          });
        }
        div.innerHTML = isi;
        statGrid.appendChild(div);
      });

      var pendDiv = document.createElement('div');
      pendDiv.className = 'stat-kartu stat-pendapatan';
      pendDiv.style.borderTopColor = '#1b7a3d';
      pendDiv.innerHTML = '<span>Pendapatan (Diterima)</span><strong>' + rupiah(pendapatan) + '</strong>';
      statGrid.appendChild(pendDiv);

      ringkasBody.innerHTML = '';
      if (!orders.length) {
        ringkasBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--abu)">Belum ada pesanan.</td></tr>';
        return;
      }
      orders.slice(0, 8).forEach(function (o) {
        var tr = document.createElement('tr');
        tr.innerHTML =
          '<td>' + esc(o.id) + '</td>' +
          '<td>' + esc(o.nama) + '</td>' +
          '<td>' + esc(tglRapi(o.createdAt)) + '</td>' +
          '<td>' + rupiah(o.total) + '</td>' +
          '<td><span class="badge-status badge-' + esc(o.status) + '">' + esc(labelStatus(o.status)) + '</span></td>';
        ringkasBody.appendChild(tr);
      });
    });
  }

  /* ===== Pesanan ===== */
  var semuaPesanan = [];

  function muatPesanan() {
    api('GET', '/api/orders', null, function (status, teks) {
      if (status !== 200) {
        tampilkanPesan('Gagal memuat daftar pesanan.', false);
        return;
      }
      try { semuaPesanan = JSON.parse(teks); } catch (e) { semuaPesanan = []; }
      tampilPesanan();
    });
  }

  function tampilPesanan() {
    var tabelBody = document.getElementById('tabelBody');
    var filter = document.getElementById('filterStatus').value;
    var cari = document.getElementById('cariPesanan').value.trim().toLowerCase();
    var daftar = semuaPesanan.filter(function (o) {
      if (filter !== 'semua' && o.status !== filter) return false;
      if (cari && o.id.toLowerCase().indexOf(cari) === -1 && (o.nama || '').toLowerCase().indexOf(cari) === -1) return false;
      return true;
    });

    tabelBody.innerHTML = '';
    if (!daftar.length) {
      tabelBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--abu)">Tidak ada pesanan.</td></tr>';
      return;
    }
    daftar.forEach(function (o) {
      var tr = document.createElement('tr');

      var sel = document.createElement('select');
      sel.className = 'sel-status';
      STATUS.forEach(function (s) {
        var op = document.createElement('option');
        op.value = s.nilai;
        op.textContent = s.label;
        if (s.nilai === o.status) op.selected = true;
        sel.appendChild(op);
      });

      var tdAksi = document.createElement('td');
      tdAksi.style.whiteSpace = 'nowrap';

      var detailBtn = document.createElement('button');
      detailBtn.type = 'button';
      detailBtn.className = 'btn btn-outline';
      detailBtn.textContent = 'Detail';
      detailBtn.style.marginRight = '6px';
      detailBtn.addEventListener('click', function () { tampilDetail(o); });
      tdAksi.appendChild(detailBtn);

      var invoiceBtn = document.createElement('button');
      invoiceBtn.type = 'button';
      invoiceBtn.className = 'btn btn-coklat';
      invoiceBtn.textContent = 'Invoice';
      invoiceBtn.style.marginRight = '6px';
      invoiceBtn.addEventListener('click', function () { bukaInvoice(o); });
      tdAksi.appendChild(invoiceBtn);

      if (o.status === 'menunggu') {
        var terima = document.createElement('button');
        terima.type = 'button';
        terima.className = 'btn btn-wa';
        terima.textContent = 'Terima Pembayaran';
        terima.style.marginRight = '6px';
        terima.addEventListener('click', function () {
          mintaKonfirmasi('Terima Pembayaran', 'Terima pembayaran pesanan <strong>' + o.id + '</strong> dan ubah status menjadi "Konfirmasi Pembayaran"?', function () {
            simpanStatus(o, 'konfirmasi');
          });
        });
        tdAksi.appendChild(terima);
      }

      var simpan = document.createElement('button');
      simpan.type = 'button';
      simpan.className = 'btn btn-emas';
      simpan.textContent = 'Simpan';
      simpan.addEventListener('click', function () {
        var statusBaru = sel.value;
        if (statusBaru === o.status) {
          tampilkanPesan('Status pesanan ' + o.id + ' sudah "' + labelStatus(statusBaru) + '".', true);
          return;
        }
        mintaKonfirmasi('Perubahan Status', 'Ubah status pesanan <strong>' + o.id + '</strong> menjadi <strong>"' + labelStatus(statusBaru) + '"</strong>? Email notifikasi akan dikirim ke pelanggan.', function () {
          simpanStatus(o, statusBaru);
        });
      });
      tdAksi.appendChild(simpan);

      var hapus = document.createElement('button');
      hapus.type = 'button';
      hapus.className = 'btn btn-hapus';
      hapus.textContent = 'Hapus';
      hapus.style.marginLeft = '6px';
      hapus.addEventListener('click', function () {
        mintaKonfirmasi('Hapus Pesanan', 'Hapus pesanan <strong>' + o.id + '</strong> milik <strong>' + esc(o.nama) + '</strong>? Tindakan ini tidak dapat dibatalkan.', function () {
          api('DELETE', '/api/order/' + encodeURIComponent(o.id), null, function (s, t) {
            if (s === 200) {
              tampilkanPesan('Pesanan ' + o.id + ' berhasil dihapus.', true);
              muatPesanan();
              muatRingkasan();
            } else {
              tampilkanPesan('Gagal menghapus pesanan ' + o.id + '.', false);
            }
          });
        });
      });
      tdAksi.appendChild(hapus);

      tr.appendChild(cell(o.id));
      tr.appendChild(cell(o.nama + '<br><small>' + esc(o.hp || '') + '</small>'));
      tr.appendChild(cell(esc(tglRapi(o.createdAt))));
      tr.appendChild(cell(rupiah(o.total)));
      var tdStatus = cell('<span class="badge-status badge-' + esc(o.status) + '">' + esc(labelStatus(o.status)) + '</span>');
      tdStatus.appendChild(sel);
      tr.appendChild(tdStatus);
      tr.appendChild(tdAksi);
      tabelBody.appendChild(tr);
    });
  }

  function cell(html) {
    var td = document.createElement('td');
    td.innerHTML = html;
    return td;
  }

  function simpanStatus(o, statusBaru) {
    api('PUT', '/api/order/' + encodeURIComponent(o.id), { status: statusBaru }, function (s, t) {
      if (s === 200) {
        tampilkanPesan('Status pesanan ' + o.id + ' diperbarui menjadi "' + labelStatus(statusBaru) + '". Email notifikasi dikirim ke pelanggan.', true);
        muatPesanan();
        muatRingkasan();
      } else {
        tampilkanPesan('Gagal memperbarui status pesanan ' + o.id + '.', false);
      }
    });
  }

  function tampilDetail(o) {
    document.getElementById('detailId').textContent = o.id;
    var baris = [
      ['Pelanggan', esc(o.nama)],
      ['No. WhatsApp', esc(o.hp || '-')],
      ['Email', esc(o.email || '-')],
      ['Alamat', esc(o.alamat || '-')],
      ['Tanggal Pengiriman', esc(tanggalPesan(o.tanggal))],
      ['Metode Pembayaran', esc(o.metode || '-')],
      ['Catatan', esc(o.catatan || '-')],
      ['Dibuat', esc(tglRapi(o.createdAt))]
    ];
    var itemsHtml = (o.items || []).map(function (i) {
      return '<li><span>' + esc(i.nama) + ' x' + i.qty + '</span><span>' + rupiah(i.harga * i.qty) + '</span></li>';
    }).join('');
    var grid = document.getElementById('detailGrid');
    grid.innerHTML = '<div class="detail-kiri">' +
      baris.map(function (b) { return '<div><span>' + b[0] + '</span><strong>' + b[1] + '</strong></div>'; }).join('') +
      '</div>' +
      '<div class="detail-kanan">' +
      '<h4>Item Pesanan</h4>' +
      '<ul class="pesanan-items">' + itemsHtml + '</ul>' +
      '<div class="detail-total">Total: <strong>' + rupiah(o.total) + '</strong></div>' +
      '<div><span>Status saat ini:</span> <strong class="badge-status badge-' + esc(o.status) + '">' + esc(labelStatus(o.status)) + '</strong></div>' +
      '</div>';
    document.getElementById('modalDetail').style.display = 'flex';
  }

  document.getElementById('detailTutup').addEventListener('click', function () {
    document.getElementById('modalDetail').style.display = 'none';
  });

  /* ===== Invoice ===== */
  function tglInvoice(iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  function normalisasiWa(nomor) {
    var n = String(nomor || '').replace(/[^\d]/g, '');
    if (n.indexOf('0') === 0) n = '62' + n.slice(1);
    if (n.indexOf('8') === 0) n = '62' + n;
    return n;
  }

  function invoiceHtml(o) {
    var tgl = tglInvoice(o.createdAt);
    var baris = (o.items || []).map(function (i) {
      return '<tr>' +
        '<td>' + esc(i.nama) + '</td>' +
        '<td class="right">' + rupiah(i.harga) + '</td>' +
        '<td class="center">' + i.qty + '</td>' +
        '<td class="right">' + rupiah(i.harga * i.qty) + '</td>' +
        '</tr>';
    }).join('');
    return (
      '<div class="inv-head">' +
      '<div class="inv-brand"><img src="assets/logo.svg" alt="">Naila\'s Cake<br><small>Api-Api, Kota Bontang, Kalimantan Timur</small></div>' +
      '<div class="inv-meta"><h2>INVOICE</h2><strong>No. Invoice: ' + esc(o.id) + '</strong><br>' + esc(tgl) + '</div>' +
      '</div>' +
      '<div class="invoice-info">' +
      '<div><span>Pelanggan</span><br><strong>' + esc(o.nama) + '</strong></div>' +
      '<div><span>No. WhatsApp</span><br><strong>' + esc(o.hp || '-') + '</strong></div>' +
      '<div><span>Email</span><br><strong>' + esc(o.email || '-') + '</strong></div>' +
      '<div><span>Metode Pembayaran</span><br><strong>' + esc(o.metode || '-') + '</strong></div>' +
      '<div><span>Alamat</span><br><strong>' + esc(o.alamat || '-') + '</strong></div>' +
      '<div><span>Tanggal Pengiriman</span><br><strong>' + esc(o.tanggal || '-') + '</strong></div>' +
      (o.catatan ? '<div><span>Catatan</span><br><strong>' + esc(o.catatan) + '</strong></div>' : '') +
      '<div><span>Status</span><br><strong class="badge-status badge-' + esc(o.status) + '">' + esc(labelStatus(o.status)) + '</strong></div>' +
      '</div>' +
      '<table class="invoice-table">' +
      '<thead><tr><th>Produk</th><th class="right">Harga</th><th class="center">Qty</th><th class="right">Subtotal</th></tr></thead>' +
      '<tbody>' + baris + '</tbody>' +
      '</table>' +
      '<div class="invoice-total">Total: ' + rupiah(o.total) + '</div>'
    );
  }

  function teksInvoiceWa(o) {
    var tgl = tglInvoice(o.createdAt);
    var baris = (o.items || []).map(function (i) {
      return '- ' + i.nama + ' x' + i.qty + ' = ' + rupiah(i.harga * i.qty);
    }).join('\n');
    return (
      '*INVOICE - Naila\'s Cake*\n' +
      'No. Invoice: ' + o.id + '\n' +
      'Tanggal: ' + tgl + '\n' +
      'Status: ' + labelStatus(o.status) + '\n\n' +
      '*Pelanggan:* ' + o.nama + '\n' +
      '*Alamat:* ' + (o.alamat || '-') + '\n' +
      '*Tanggal Kirim:* ' + (o.tanggal || '-') + '\n' +
      '*Pembayaran:* ' + (o.metode || '-') + '\n\n' +
      baris + '\n\n' +
      '*Total: ' + rupiah(o.total) + '*\n\n' +
      'Lacak status: ' + window.location.origin + '/pesanan.html?id=' + o.id + '\n\n' +
      'Terima kasih!\n- Naila\'s Cake'
    );
  }

  var modalInvoice = document.getElementById('modalInvoice');
  var orderInvoice = null;

  function bukaInvoice(o) {
    orderInvoice = o;
    document.getElementById('invoiceContent').innerHTML = invoiceHtml(o);
    modalInvoice.style.display = 'flex';
  }

  document.getElementById('invoiceTutup').addEventListener('click', function () {
    modalInvoice.style.display = 'none';
  });

  document.getElementById('invoicePdf').addEventListener('click', function () {
    if (!orderInvoice) return;
    window.open('/api/invoice/pdf/' + encodeURIComponent(orderInvoice.id), '_blank');
  });

  document.getElementById('invoiceWa').addEventListener('click', function () {
    if (!orderInvoice) return;
    var wa = normalisasiWa(orderInvoice.hp);
    if (!wa) {
      tampilkanPesan('Nomor WhatsApp pelanggan tidak valid.', false);
      return;
    }
    window.open('https://wa.me/' + wa + '?text=' + encodeURIComponent(teksInvoiceWa(orderInvoice)), '_blank');
  });

  document.getElementById('invoiceEmail').addEventListener('click', function () {
    if (!orderInvoice) return;
    var o = orderInvoice;
    api('POST', '/api/invoice/email', { id: o.id }, function (s, t) {
      if (s === 200) {
        var sent = false;
        try { sent = !!JSON.parse(t).sent; } catch (e) {}
        tampilkanPesan(sent ? 'Invoice terkirim ke email ' + o.email + '. Cek folder spam jika tidak ditemukan.' : 'Email tidak terkirim. Periksa konfigurasi email di data/email-config.json.', sent);
      } else if (s === 404) {
        tampilkanPesan('Pesanan tidak ditemukan.', false);
      } else {
        tampilkanPesan('Gagal mengirim invoice. Pastikan Anda masih login.', false);
      }
    });
  });

  document.getElementById('filterStatus').addEventListener('change', tampilPesanan);
  document.getElementById('cariPesanan').addEventListener('input', tampilPesanan);

  /* ===== Produk ===== */
  var semuaProduk = [];

  function muatProduk() {
    api('GET', '/api/products', null, function (status, teks) {
      if (status !== 200) {
        tampilkanPesan('Gagal memuat daftar produk.', false);
        return;
      }
      try { semuaProduk = JSON.parse(teks); } catch (e) { semuaProduk = []; }
      tampilProduk();
    });
  }

  function tampilProduk() {
    var produkBody = document.getElementById('produkBody');
    var cari = document.getElementById('cariProduk').value.trim().toLowerCase();
    var daftar = semuaProduk.filter(function (p) {
      return !cari || (p.nama || '').toLowerCase().indexOf(cari) !== -1;
    });

    produkBody.innerHTML = '';
    if (!daftar.length) {
      produkBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--abu)">Tidak ada produk.</td></tr>';
      return;
    }
    daftar.forEach(function (p) {
      var tr = document.createElement('tr');

      var tdGambar = document.createElement('td');
      tdGambar.innerHTML = '<img class="thumb" src="' + esc(p.gambar) + '" alt="' + esc(p.nama) + '">';

      var tdNama = document.createElement('td');
      tdNama.innerHTML = '<strong>' + esc(p.nama) + '</strong><br><small>' + esc(p.id) + '</small>';

      var tdKategori = document.createElement('td');
      tdKategori.textContent = labelKategori(p.kategori);

      var tdHarga = document.createElement('td');
      tdHarga.textContent = rupiah(p.harga);

      var tdStatus = document.createElement('td');
      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'toggle-aktif ' + (p.aktif ? 'on' : 'off');
      toggle.textContent = p.aktif ? 'Aktif' : 'Nonaktif';
      toggle.addEventListener('click', function () {
        api('PUT', '/api/products/' + encodeURIComponent(p.id), { aktif: !p.aktif }, function (s, t) {
          if (s === 200) {
            tampilkanPesan('Produk "' + p.nama + '" ' + (!p.aktif ? 'ditampilkan' : 'disembunyikan') + ' di toko.', true);
            muatProduk();
          } else {
            tampilkanPesan('Gagal memperbarui status produk.', false);
          }
        });
      });
      tdStatus.appendChild(toggle);

      var tdAksi = document.createElement('td');
      tdAksi.style.whiteSpace = 'nowrap';
      var edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'btn btn-outline';
      edit.textContent = 'Edit';
      edit.style.marginRight = '6px';
      edit.addEventListener('click', function () { bukaFormProduk(p); });
      tdAksi.appendChild(edit);

      var hapus = document.createElement('button');
      hapus.type = 'button';
      hapus.className = 'btn btn-hapus';
      hapus.textContent = 'Hapus';
      hapus.addEventListener('click', function () {
        mintaKonfirmasi('Hapus Produk', 'Hapus produk <strong>"' + esc(p.nama) + '"</strong> dari toko? Tindakan ini tidak dapat dibatalkan.', function () {
          api('DELETE', '/api/products/' + encodeURIComponent(p.id), null, function (s, t) {
            if (s === 200) {
              tampilkanPesan('Produk "' + p.nama + '" berhasil dihapus.', true);
              muatProduk();
            } else {
              tampilkanPesan('Gagal menghapus produk.', false);
            }
          });
        });
      });
      tdAksi.appendChild(hapus);

      tr.appendChild(tdGambar);
      tr.appendChild(tdNama);
      tr.appendChild(tdKategori);
      tr.appendChild(tdHarga);
      tr.appendChild(tdStatus);
      tr.appendChild(tdAksi);
      produkBody.appendChild(tr);
    });
  }

  var formProduk = document.getElementById('formProduk');
  var modalProduk = document.getElementById('modalProduk');

  function bukaFormProduk(p) {
    document.getElementById('produkFormJudul').textContent = p ? 'Edit Produk' : 'Tambah Produk';
    document.getElementById('pId').value = p ? p.id : '';
    document.getElementById('pNama').value = p ? p.nama : '';
    document.getElementById('pKategori').value = p ? p.kategori : 'kue';
    document.getElementById('pHarga').value = p ? p.harga : '';
    document.getElementById('pDeskripsi').value = p ? (p.deskripsi || '') : '';
    document.getElementById('pGambar').value = p ? (p.gambar || 'assets/images/kue-regular.jpg') : 'assets/images/kue-regular.jpg';
    document.getElementById('pAktif').checked = p ? !!p.aktif : true;
    modalProduk.style.display = 'flex';
  }

  document.getElementById('tambahProdukBtn').addEventListener('click', function () { bukaFormProduk(null); });
  document.getElementById('produkBatal').addEventListener('click', function () { modalProduk.style.display = 'none'; });
  modalProduk.addEventListener('click', function (e) {
    if (e.target === modalProduk) modalProduk.style.display = 'none';
  });
  modalInvoice.addEventListener('click', function (e) {
    if (e.target === modalInvoice) modalInvoice.style.display = 'none';
  });
  document.getElementById('cariProduk').addEventListener('input', tampilProduk);

  formProduk.addEventListener('submit', function (e) {
    e.preventDefault();
    var id = document.getElementById('pId').value;
    var data = {
      nama: document.getElementById('pNama').value.trim(),
      kategori: document.getElementById('pKategori').value,
      deskripsi: document.getElementById('pDeskripsi').value.trim(),
      harga: parseInt(document.getElementById('pHarga').value, 10) || 0,
      gambar: document.getElementById('pGambar').value.trim() || 'assets/images/kue-regular.jpg',
      aktif: document.getElementById('pAktif').checked
    };
    if (!data.nama || !data.harga) {
      tampilkanPesan('Nama dan harga produk wajib diisi.', false);
      return;
    }
    api(id ? 'PUT' : 'POST', id ? '/api/products/' + encodeURIComponent(id) : '/api/products', data, function (s, t) {
      if (s === 200) {
        tampilkanPesan('Produk "' + data.nama + '" berhasil ' + (id ? 'diperbarui' : 'ditambahkan') + '.', true);
        modalProduk.style.display = 'none';
        muatProduk();
      } else {
        tampilkanPesan('Gagal menyimpan produk.', false);
      }
    });
  });

  /* ===== Konfirmasi umum ===== */
  var modalKonf = document.getElementById('modalKonfirmasi');
  var konfTeks = document.getElementById('konfTeks');
  var pendingKonf = null;

  function mintaKonfirmasi(judul, teksHtml, onYa) {
    document.getElementById('konfJudul').textContent = judul;
    konfTeks.innerHTML = teksHtml;
    pendingKonf = onYa;
    modalKonf.style.display = 'flex';
  }

  document.getElementById('konfYa').addEventListener('click', function () {
    modalKonf.style.display = 'none';
    if (pendingKonf) pendingKonf();
    pendingKonf = null;
  });
  document.getElementById('konfBatal').addEventListener('click', function () {
    modalKonf.style.display = 'none';
    pendingKonf = null;
  });
  modalKonf.addEventListener('click', function (e) {
    if (e.target === modalKonf) {
      modalKonf.style.display = 'none';
      pendingKonf = null;
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      modalKonf.style.display = 'none';
      modalProduk.style.display = 'none';
      document.getElementById('modalDetail').style.display = 'none';
      modalInvoice.style.display = 'none';
      pendingKonf = null;
    }
  });
})();
