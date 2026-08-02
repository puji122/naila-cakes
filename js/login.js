(function () {
  var form = document.getElementById('formLogin');
  var input = document.getElementById('password');
  var pesan = document.getElementById('pesan');

  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var pw = input.value;
    if (!pw) {
      pesan.textContent = 'Mohon isi password.';
      pesan.style.display = 'block';
      pesan.style.background = '#fdeaea';
      pesan.style.color = '#a93226';
      return;
    }
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/login', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function () {
      if (xhr.status === 200) {
        window.location.href = 'admin.html';
      } else if (xhr.status === 401) {
        pesan.textContent = 'Password salah. Silakan coba lagi.';
        pesan.style.display = 'block';
        pesan.style.background = '#fdeaea';
        pesan.style.color = '#a93226';
        input.select();
      } else {
        pesan.textContent = 'Terjadi kesalahan. Coba lagi.';
        pesan.style.display = 'block';
        pesan.style.background = '#fdeaea';
        pesan.style.color = '#a93226';
      }
    };
    xhr.onerror = function () {
      pesan.textContent = 'Gagal terhubung ke server.';
      pesan.style.display = 'block';
      pesan.style.background = '#fdeaea';
      pesan.style.color = '#a93226';
    };
    xhr.send(JSON.stringify({ password: pw }));
  });
})();
