document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('subscribe-form');
  var submitBtn = document.getElementById('subscribe-submit');
  var message = document.getElementById('subscribe-message');
  if (!form) return;

  function show(text, kind) {
    message.textContent = text;
    message.className = 'subscribe__message' + (kind ? ' subscribe__message--' + kind : '');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var email = form.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      show('Please enter a valid email address.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing up...';
    show('');

    fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, website: form.website.value }),
    })
      .then(function (res) { return res.json().then(function (body) { return { ok: res.ok, body: body }; }); })
      .then(function (result) {
        if (result.ok && result.body.ok) {
          show('You\'re on the list — I\'ll email you when I post something new.', 'success');
          form.reset();
        } else if (result.body.reason === 'not_configured') {
          show('Sign-ups aren\'t connected yet — please check back soon.', 'error');
        } else {
          show('Something went wrong. Please try again in a bit.', 'error');
        }
      })
      .catch(function () {
        show('Something went wrong. Please try again in a bit.', 'error');
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Notify me';
      });
  });
});
