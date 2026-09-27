function initials(name) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

function stars(rating) {
  return '★★★★★☆☆☆☆☆'.slice(5 - rating, 10 - rating);
}

module.exports = { initials, stars };
