(function () {
  var STATUS = [
    { nilai: 'menunggu', label: 'Menunggu Pembayaran' },
    { nilai: 'konfirmasi', label: 'Konfirmasi Pembayaran' },
    { nilai: 'dikemas', label: 'Dikemas' },
    { nilai: 'dikirim', label: 'Dikirim' },
    { nilai: 'diterima', label: 'Diterima' }
  ];

  function rupiah(n) {
    return 'Rp ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  var tabelBody = document.getElementById('tabelBody');
  var infoEl = document.getElementById('info');
  var modal = document.getElementById('modalKonfirmasi');
  var modalId = document.getElementById('modalId');
  var modalStatus = document.getElementById('modalStatus');
  var tombolYa = document.getElementById('modalYa');
  var tombolBatal = document.getElementById('modalBatal');
  var pending = null;

  function tampilkanPesan(teks, ok) {
    infoEl.textContent = teks;
    infoEl.style.display = 'block';
    infoEl.style.background = ok ? '#e8f9ee' : '#fdeaea';
    infoEl.style.color = ok ? '#1b7a3d' : '#a93226';
  }

  function tutupModal() {
    modal.style.display = 'none';
    pending = null;
  }

  function simpanStatus() {
    if (!pending) return;
    var o = pending.o;
    var btn = pending.btn;
    var statusBaru = pending.status;
    var labelBaru = pending.label;
    tutupModal();
    btn.disabled = true;
    var xhr = new XMLHttpRequest();
    xhr.open('PUT', '/api/order/' + encodeURIComponent(o.id), true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function () {
      btn.disabled = false;
      if (xhr.status === 200) {
        tampilkanPesan('Status pesanan ' + o.id + ' diperbarui menjadi "' + labelBaru + '". Email notifikasi telah dikirim ke pelanggan.', true);
        muat();
      } else {
        tampilkanPesan('Gagal memperbarui status pesanan ' + o.id + '.', false);
      }
    };
    xhr.onerror = function () {
      btn.disabled = false;
      tampilkanPesan('Gagal memperbarui status. Periksa koneksi.', false);
    };
    xhr.send(JSON.stringify({ status: statusBaru }));
  }

  function mintaKonfirmasi(o, btn, status, label) {
    modalId.textContent = o.id;
    modalStatus.textContent = label;
    pending = { o: o, btn: btn, status: status, label: label };
    modal.style.display = 'flex';
  }

  tombolYa.addEventListener('click', simpanStatus);
  tombolBatal.addEventListener('click', tutupModal);
  modal.addEventListener('click', function (e) {
    if (e.target === modal) tutupModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') tutupModal();
  });

  function muat() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/orders', true);
    xhr.onload = function () {
      if (xhr.status !== 200) {
        tampilkanPesan('Gagal memuat daftar pesanan.', false);
        return;
      }
      var orders = JSON.parse(xhr.responseText);
      tabelBody.innerHTML = '';
      if (!orders.length) {
        tabelBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--abu)">Belum ada pesanan.</td></tr>';
        return;
      }
      orders.forEach(function (o) {
        var tr = document.createElement('tr');

        var sel = document.createElement('select');
        STATUS.forEach(function (s) {
          var op = document.createElement('option');
          op.value = s.nilai;
          op.textContent = s.label;
          if (s.nilai === o.status) op.selected = true;
          sel.appendChild(op);
        });
        var tdSel = document.createElement('td');
        tdSel.appendChild(sel);

        var tdAksi = document.createElement('td');
        tdAksi.style.whiteSpace = 'nowrap';

        if (o.status === 'menunggu') {
          var terima = document.createElement('button');
          terima.type = 'button';
          terima.className = 'btn btn-wa';
          terima.textContent = 'Terima Pembayaran';
          terima.style.marginRight = '8px';
          terima.addEventListener('click', function () {
            mintaKonfirmasi(o, terima, 'konfirmasi', 'Konfirmasi Pembayaran');
          });
          tdAksi.appendChild(terima);
        }

        var simpan = document.createElement('button');
        simpan.type = 'button';
        simpan.className = 'btn btn-emas';
        simpan.textContent = 'Simpan';
        simpan.addEventListener('click', function () {
          var label = sel.options[sel.selectedIndex].text;
          mintaKonfirmasi(o, simpan, sel.value, label);
        });
        tdAksi.appendChild(simpan);

        var tdId = document.createElement('td');
        tdId.textContent = o.id;

        var tdNama = document.createElement('td');
        tdNama.textContent = o.nama + ' (' + o.hp + ')';

        var tdTotal = document.createElement('td');
        tdTotal.textContent = rupiah(o.total);

        tr.appendChild(tdId);
        tr.appendChild(tdNama);
        tr.appendChild(tdTotal);
        tr.appendChild(tdSel);
        tr.appendChild(tdAksi);
        tabelBody.appendChild(tr);
      });
    };
    xhr.onerror = function () {
      tampilkanPesan('Gagal terhubung ke server.', false);
    };
    xhr.send();
  }

  var auth = new XMLHttpRequest();
  auth.open('GET', '/api/admin/status', true);
  auth.onload = function () {
    if (auth.status === 200) {
      muat();
    } else {
      window.location.href = 'login.html';
    }
  };
  auth.onerror = function () {
    window.location.href = 'login.html';
  };
  auth.send();
})();
