(function () {
  var grid = document.getElementById('produkGrid');
  if (!grid) return;

  var KATEGORI_LABEL = {
    kue: 'Kue Reguler',
    praline: 'Praline',
    snacks: 'Snacks',
    hampers: 'Hampers',
    cookies: 'Cookies'
  };

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function rupiah(n) {
    return 'Rp ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function render(items) {
    grid.innerHTML = '';
    var kosongEl = document.createElement('p');
    kosongEl.className = 'produk-kosong';
    kosongEl.id = 'produkKosong';
    kosongEl.style.display = 'none';
    kosongEl.textContent = 'Tidak ada produk pada kategori ini.';
    grid.appendChild(kosongEl);

    items.forEach(function (p) {
      if (!p.aktif) return;
      var kartu = document.createElement('div');
      kartu.className = 'kartu-produk';
      kartu.dataset.kategori = p.kategori;
      kartu.innerHTML =
        '<div class="foto">' +
        '<img src="' + esc(p.gambar) + '" alt="' + esc(p.nama) + '">' +
        '<span class="badge-kategori">' + esc(KATEGORI_LABEL[p.kategori] || p.kategori) + '</span>' +
        '</div>' +
        '<div class="kartu-produk-body">' +
        '<h3>' + esc(p.nama) + '</h3>' +
        '<p>' + esc(p.deskripsi) + '</p>' +
        '<span class="harga">' + rupiah(p.harga) + '</span>' +
        '<a class="btn btn-wa" href="https://wa.me/6285189962001?text=' + encodeURIComponent("Halo Naila's Cake, saya ingin memesan " + p.nama) + '" target="_blank" rel="noopener">Tambah ke Keranjang</a>' +
        '</div>';
      grid.appendChild(kartu);
    });

    if (window.terapkanFilter) window.terapkanFilter();
  }

  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/products', true);
  xhr.onload = function () {
    if (xhr.status === 200) {
      try {
        render(JSON.parse(xhr.responseText));
      } catch (e) {
        grid.textContent = 'Terjadi kesalahan saat memuat produk.';
      }
    } else {
      grid.textContent = 'Gagal memuat produk. Pastikan server berjalan.';
    }
  };
  xhr.onerror = function () {
    grid.textContent = 'Gagal memuat produk. Periksa koneksi internet Anda.';
  };
  xhr.send();
})();
