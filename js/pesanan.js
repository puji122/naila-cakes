(function () {
  var URUTAN = ['menunggu', 'konfirmasi', 'dikemas', 'dikirim', 'diterima'];
  var LABEL = {
    menunggu: 'Menunggu Pembayaran',
    konfirmasi: 'Konfirmasi Pembayaran',
    dikemas: 'Dikemas',
    dikirim: 'Dikirim',
    diterima: 'Diterima'
  };

  function rupiah(n) {
    return 'Rp ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  var formCari = document.getElementById('formCari');
  var inputId = document.getElementById('inputId');
  var hasilEl = document.getElementById('hasil');
  var kosongEl = document.getElementById('tidakDitemukan');
  var muatEl = document.getElementById('memuat');

  function cari(id) {
    if (!id) return;
    hasilEl.style.display = 'none';
    kosongEl.style.display = 'none';
    muatEl.style.display = 'block';
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/order/' + encodeURIComponent(id), true);
    xhr.onload = function () {
      muatEl.style.display = 'none';
      if (xhr.status === 200) {
        tampil(JSON.parse(xhr.responseText));
      } else {
        kosongEl.style.display = 'block';
      }
    };
    xhr.onerror = function () {
      muatEl.style.display = 'none';
      kosongEl.style.display = 'block';
    };
    xhr.send();
  }

  function tampil(o) {
    document.getElementById('oId').textContent = o.id;
    document.getElementById('oNama').textContent = o.nama;
    document.getElementById('oTanggal').textContent = o.tanggal;
    document.getElementById('oMetode').textContent = o.metode || '-';
    document.getElementById('oTotal').textContent = rupiah(o.total);
    document.getElementById('statusLabel').textContent = LABEL[o.status] || o.status;

    var itemsEl = document.getElementById('oItems');
    itemsEl.innerHTML = '';
    o.items.forEach(function (i) {
      var li = document.createElement('li');
      li.innerHTML = '<span>' + i.nama + ' x' + i.qty + '</span><span>' + rupiah(i.harga * i.qty) + '</span>';
      itemsEl.appendChild(li);
    });

    var idx = URUTAN.indexOf(o.status);
    document.querySelectorAll('.status-step').forEach(function (s, i) {
      s.classList.toggle('selesai', i < idx);
      s.classList.toggle('aktif', i === idx);
    });

    hasilEl.style.display = 'block';
  }

  if (formCari) {
    formCari.addEventListener('submit', function (e) {
      e.preventDefault();
      cari(inputId.value.trim().toUpperCase());
    });
  }

  var param = new URLSearchParams(window.location.search).get('id');
  if (param) {
    inputId.value = param;
    cari(param);
  }
})();
