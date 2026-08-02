(function () {
  var navToggle = document.getElementById('navToggle');
  var navList = document.getElementById('navList');
  if (navToggle && navList) {
    navToggle.addEventListener('click', function () {
      navList.classList.toggle('buka');
    });
    navList.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { navList.classList.remove('buka'); });
    });
  }

  var slider = document.getElementById('slider');
  if (slider) {
    var slides = slider.querySelectorAll('.slide');
    var dots = slider.querySelectorAll('.hero-dots button');
    var index = 0;
    var timer = null;

    function tampil(n) {
      index = (n + slides.length) % slides.length;
      slides.forEach(function (s, i) { s.style.display = i === index ? 'block' : 'none'; });
      dots.forEach(function (d, i) { d.classList.toggle('aktif', i === index); });
    }

    function mulai() {
      timer = setInterval(function () { tampil(index + 1); }, 5000);
    }

    dots.forEach(function (d, i) {
      d.addEventListener('click', function () {
        clearInterval(timer);
        tampil(i);
        mulai();
      });
    });

    tampil(0);
    mulai();
  }

  var filterBtn = document.querySelectorAll('.filter-btn');

  function terapkanFilter() {
    var kategori = document.querySelector('.filter-btn.aktif');
    if (!kategori) return;
    var k = kategori.dataset.kategori;
    var produkCards = document.querySelectorAll('.kartu-produk');
    var produkKosong = document.getElementById('produkKosong');
    var terlihat = 0;
    produkCards.forEach(function (card) {
      var cocok = k === 'semua' || card.dataset.kategori === k;
      card.style.display = cocok ? 'flex' : 'none';
      if (cocok) terlihat++;
    });
    if (produkKosong) produkKosong.style.display = terlihat ? 'none' : 'block';
  }

  window.terapkanFilter = terapkanFilter;

  filterBtn.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterBtn.forEach(function (b) { b.classList.remove('aktif'); });
      btn.classList.add('aktif');
      terapkanFilter();
    });
  });

  var hash = window.location.hash.replace('#', '');
  if (hash && ['kue', 'praline', 'snacks', 'hampers', 'cookies'].indexOf(hash) !== -1) {
    filterBtn.forEach(function (btn) {
      btn.classList.toggle('aktif', btn.dataset.kategori === hash);
    });
    terapkanFilter();
    var target = document.getElementById('produkGrid');
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  }

  var regionSelect = document.getElementById('regionSelect');
  if (regionSelect) {
    regionSelect.addEventListener('change', function () {
      alert('Terima kasih! Pesanan Anda di ' + regionSelect.value + ' akan kami proses setelah konfirmasi via WhatsApp.');
    });
  }

  var formKontak = document.getElementById('formKontak');
  var formPesan = document.getElementById('formPesan');
  if (formKontak && formPesan) {
    formKontak.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = new FormData(formKontak);
      var xhr = new XMLHttpRequest();
      xhr.open('POST', formKontak.action, true);
      xhr.onload = function () {
        if (xhr.status === 200) {
          formPesan.textContent = 'Terima kasih! Pesan Anda telah terkirim ke email kami. Tim Naila\'s Cake akan segera menghubungi Anda.';
          formPesan.classList.add('tampil');
          formKontak.reset();
        } else {
          formPesan.textContent = 'Maaf, pesan gagal terkirim. Silakan coba lagi atau hubungi kami via WhatsApp.';
          formPesan.classList.add('tampil');
        }
      };
      xhr.onerror = function () {
        formPesan.textContent = 'Maaf, pesan gagal terkirim. Periksa koneksi internet Anda.';
        formPesan.classList.add('tampil');
      };
      xhr.send(data);
    });
  }

  document.querySelectorAll('.tahun').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
