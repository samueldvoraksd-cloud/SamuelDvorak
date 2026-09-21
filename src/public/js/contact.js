document.addEventListener('DOMContentLoaded', function () {
  var dialog = document.getElementById('contact-dialog');
  var openBtn = document.getElementById('open-contact-dialog');
  var closeBtn = document.getElementById('close-contact-dialog');
  var form = document.getElementById('contact-form');
  var submitBtn = document.getElementById('contact-form-submit');
  var formMessage = document.getElementById('contact-form-message');
  if (!dialog || !openBtn || !form) return;

  openBtn.addEventListener('click', function () {
    formMessage.textContent = '';
    formMessage.className = 'contact-form__message';
    dialog.showModal();
  });

  closeBtn.addEventListener('click', function () {
    dialog.close();
  });

  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) dialog.close();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var data = {
      name: form.name.value,
      email: form.email.value,
      message: form.message.value,
      website: form.website.value,
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    formMessage.textContent = '';
    formMessage.className = 'contact-form__message';

    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then(function (res) { return res.json().then(function (body) { return { ok: res.ok, body: body }; }); })
      .then(function (result) {
        if (result.ok && result.body.ok) {
          formMessage.textContent = 'Message sent — I\'ll get back to you soon.';
          formMessage.className = 'contact-form__message contact-form__message--success';
          form.reset();
          setTimeout(function () { dialog.close(); }, 1800);
        } else if (result.body.reason === 'not_configured') {
          formMessage.textContent = 'The contact form isn\'t connected yet — please check back soon.';
          formMessage.className = 'contact-form__message contact-form__message--error';
        } else {
          formMessage.textContent = 'Something went wrong. Please try again in a bit.';
          formMessage.className = 'contact-form__message contact-form__message--error';
        }
      })
      .catch(function () {
        formMessage.textContent = 'Something went wrong. Please try again in a bit.';
        formMessage.className = 'contact-form__message contact-form__message--error';
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send';
      });
  });
});
