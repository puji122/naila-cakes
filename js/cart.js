(function () {
  var KUNCI = 'nailaKeranjang';
  var WA_NOMOR = '6285189962001';
  var render = function () {};

  function baca() {
    try { return JSON.parse(localStorage.getItem(KUNCI)) || []; } catch (e) { return []; }
  }

  function simpan(items) {
    localStorage.setItem(KUNCI, JSON.stringify(items));
  }

  function rupiah(n) {
    return 'Rp ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function normalisasiWa(nomor) {
    var n = String(nomor || '').replace(/[^\d]/g, '');
    if (n.indexOf('0') === 0) n = '62' + n.slice(1);
    if (n.indexOf('8') === 0) n = '62' + n;
    return n;
  }

  function total(items) {
    return items.reduce(function (a, b) { return a + b.harga * b.qty; }, 0);
  }

  function perbaruiBadge() {
    var badge = document.getElementById('cartBadge');
    if (!badge) return;
    var items = baca();
    var n = items.reduce(function (a, b) { return a + b.qty; }, 0);
    badge.textContent = n;
    badge.style.display = n ? 'inline-flex' : 'none';
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.kartu-produk .btn-wa') : null;
    if (!btn) return;
    e.preventDefault();
    var kartu = btn.closest('.kartu-produk');
    if (!kartu) return;
    var nama = kartu.querySelector('h3').textContent.trim();
    var harga = parseInt(kartu.querySelector('.harga').textContent.replace(/[^\d]/g, ''), 10) || 0;
    var items = baca();
    var ada = false;
    items.forEach(function (i) {
      if (i.nama === nama) { i.qty++; ada = true; }
    });
    if (!ada) items.push({ nama: nama, harga: harga, qty: 1 });
    simpan(items);
    perbaruiBadge();
    var lama = btn.textContent;
    btn.textContent = 'Ditambahkan!';
    setTimeout(function () { btn.textContent = lama; }, 1500);
  });

  var daftar = document.getElementById('daftarKeranjang');
  if (daftar) {
    var kosongEl = document.getElementById('keranjangKosong');
    var isiEl = document.getElementById('isiKeranjang');
    var subtotalEl = document.getElementById('subtotal');
    var totalEl = document.getElementById('total');

    render = function () {
      var items = baca();
      daftar.innerHTML = '';
      items.forEach(function (item, idx) {
        var div = document.createElement('div');
        div.className = 'kartu-keranjang';
        div.innerHTML =
          '<div class="kk-info">' +
          '<h3>' + item.nama + '</h3>' +
          '<div class="kk-harga">' + rupiah(item.harga) + ' / item</div>' +
          '</div>' +
          '<div class="qty">' +
          '<button type="button" data-tindakan="kurang" data-i="' + idx + '" aria-label="Kurangi">&minus;</button>' +
          '<span>' + item.qty + '</span>' +
          '<button type="button" data-tindakan="tambah" data-i="' + idx + '" aria-label="Tambah">+</button>' +
          '</div>' +
          '<div class="kk-total">' + rupiah(item.harga * item.qty) + '</div>' +
          '<button type="button" class="kk-hapus" data-tindakan="hapus" data-i="' + idx + '">Hapus</button>';
        daftar.appendChild(div);
      });
      var sub = total(items);
      subtotalEl.textContent = rupiah(sub);
      totalEl.textContent = rupiah(sub);
      var kosong = !items.length;
      kosongEl.style.display = kosong ? 'block' : 'none';
      isiEl.style.display = kosong ? 'none' : 'block';
    };

    daftar.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-tindakan]');
      if (!btn) return;
      var items = baca();
      var i = parseInt(btn.getAttribute('data-i'), 10);
      if (!items[i]) return;
      var aksi = btn.getAttribute('data-tindakan');
      if (aksi === 'tambah') items[i].qty++;
      else if (aksi === 'kurang') {
        items[i].qty--;
        if (items[i].qty <= 0) items.splice(i, 1);
      } else {
        items.splice(i, 1);
      }
      simpan(items);
      render();
      perbaruiBadge();
    });

    render();
  }

  var formCheckout = document.getElementById('formCheckout');
  if (formCheckout) {
    var tanggalEl = document.getElementById('coTanggal');
    if (tanggalEl) tanggalEl.min = new Date().toISOString().split('T')[0];

    function kirimWA(orderId) {
      var items = baca();
      var nama = document.getElementById('coNama').value.trim();
      var hp = document.getElementById('coHp').value.trim();
      var alamat = document.getElementById('coAlamat').value.trim();
      var tanggal = document.getElementById('coTanggal').value;
      var catatan = document.getElementById('coCatatan').value.trim();
      var metode = document.querySelector('input[name="pembayaran"]:checked');
      var baris = items.map(function (i) {
        return '- ' + i.nama + ' x' + i.qty + ' = ' + rupiah(i.harga * i.qty);
      }).join('\n');
      var teks =
        '*PESANAN BARU - Naila\'s Cake*\n' +
        (orderId ? '*No. Pesanan: ' + orderId + '*\n' : '') +
        'Halo, saya ingin memesan:\n\n' +
        baris + '\n\n' +
        '*Total: ' + rupiah(total(items)) + '*\n\n' +
        '------------------------------\n' +
        '*Nama:* ' + nama + '\n' +
        '*No. WhatsApp:* ' + hp + '\n' +
        '*Alamat Pengiriman:* ' + alamat + '\n' +
        '*Tanggal Pengiriman:* ' + tanggal + '\n' +
        '*Metode Pembayaran:* ' + (metode ? metode.value : '-') + '\n' +
        (catatan ? '*Catatan:* ' + catatan : '');
      window.open('https://wa.me/' + WA_NOMOR + '?text=' + encodeURIComponent(teks), '_blank');

      if (orderId) {
        var waPelanggan = normalisasiWa(hp);
        if (waPelanggan) {
          var linkLacak = window.location.origin + '/pesanan.html?id=' + encodeURIComponent(orderId);
          var teksNotif =
            'Halo ' + nama + '! Pesanan Anda di Naila\'s Cake telah kami terima.\n\n' +
            '*No. Pesanan:* ' + orderId + '\n' +
            '*Total:* ' + rupiah(total(items)) + '\n\n' +
            'Silakan selesaikan pembayaran sesuai metode yang Anda pilih (' + (metode ? metode.value : '-') + ').\n' +
            'Lacak status pesanan Anda di: ' + linkLacak + '\n\n' +
            'Terima kasih!\n- Naila\'s Cake';
          window.open('https://wa.me/' + waPelanggan + '?text=' + encodeURIComponent(teksNotif), '_blank');
        }
      }

      localStorage.removeItem(KUNCI);
      perbaruiBadge();
      var pesanEl = document.getElementById('formPesan');
      if (pesanEl) {
        if (orderId) {
          pesanEl.innerHTML = 'Terima kasih! Pesanan Anda telah kami terima dengan <strong>No. Pesanan ' + orderId + '</strong>. Email berisi nomor pesanan telah dikirim, dan chat WhatsApp ke nomor Anda telah dibuka untuk notifikasi — silakan tekan kirim di WhatsApp. Anda juga bisa <a href="pesanan.html?id=' + orderId + '">lacak status pesanan Anda</a>.';
        } else {
          pesanEl.textContent = 'Terima kasih! Pesanan Anda terkirim via WhatsApp. Tim Naila\'s Cake akan segera menghubungi Anda.';
        }
        pesanEl.classList.add('tampil');
      }
      formCheckout.reset();
      render();
    }

    formCheckout.addEventListener('submit', function (e) {
      e.preventDefault();
      var items = baca();
      if (!items.length) {
        alert('Keranjang Anda masih kosong.');
        return;
      }
      var nama = document.getElementById('coNama').value.trim();
      var hp = document.getElementById('coHp').value.trim();
      var alamat = document.getElementById('coAlamat').value.trim();
      var tanggal = document.getElementById('coTanggal').value;
      var metode = document.querySelector('input[name="pembayaran"]:checked');
      if (!nama || !hp || !alamat || !tanggal) {
        alert('Mohon lengkapi nama, nomor WhatsApp, alamat, dan tanggal pengiriman.');
        return;
      }
      var email = document.getElementById('coEmail').value.trim();
      if (!email || email.indexOf('@') === -1) {
        alert('Mohon isi email penerima yang valid untuk notifikasi status pesanan.');
        return;
      }
      var orderData = {
        nama: nama,
        email: email,
        hp: hp,
        alamat: alamat,
        tanggal: tanggal,
        metode: metode ? metode.value : '',
        catatan: document.getElementById('coCatatan').value.trim(),
        items: items.map(function (i) { return { nama: i.nama, harga: i.harga, qty: i.qty }; }),
        total: total(items)
      };
      var xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/order', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onload = function () {
        var orderId = null;
        if (xhr.status === 200) {
          try { orderId = JSON.parse(xhr.responseText).id; } catch (err) {}
        }
        kirimWA(orderId);
      };
      xhr.onerror = function () { kirimWA(null); };
      xhr.send(JSON.stringify(orderData));
    });
  }

  perbaruiBadge();
})();
