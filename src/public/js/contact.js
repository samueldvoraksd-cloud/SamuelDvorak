document.addEventListener('DOMContentLoaded', function () {
  var link = document.getElementById('contact-email-link');
  if (!link) return;
  var user = link.getAttribute('data-user');
  var domain = link.getAttribute('data-domain');
  link.setAttribute('href', 'mailto:' + user + '@' + domain);
});
