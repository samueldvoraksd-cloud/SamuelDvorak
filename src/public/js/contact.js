document.addEventListener('DOMContentLoaded', function () {
  var link = document.getElementById('contact-email-link');
  if (!link) return;
  var user = link.getAttribute('data-user');
  var domain = link.getAttribute('data-domain');
  var email = user + '@' + domain;
  link.setAttribute('href', 'mailto:' + email);

  var status = document.getElementById('contact-status');
  link.addEventListener('click', function () {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email).then(function () {
        if (status) status.textContent = 'Copied ' + email + ' to your clipboard, in case your email app didn\'t open.';
      }).catch(function () {});
    }
  });
});
