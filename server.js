require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const indexRouter = require('./src/routes/index');
const articlesRouter = require('./src/routes/articles');
const resourcesRouter = require('./src/routes/resources');
const contactRouter = require('./src/routes/contact');
const llmsRouter = require('./src/routes/llms');
const adminRouter = require('./src/routes/admin');
const site = require('./src/content/site.json');

const app = express();
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET must be set in production.');
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));
app.set('trust proxy', 1);
app.use(express.static(path.join(__dirname, 'src', 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-only-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000,
  },
}));

app.use('/', indexRouter);
app.use('/articles', articlesRouter);
app.use('/resources', resourcesRouter);
app.use('/api/contact', contactRouter);
app.use('/llms.txt', llmsRouter);
app.use('/admin', adminRouter);

app.use((req, res) => {
  res.status(404).render('404', { site, pageDescription: 'This page could not be found.', noindex: true });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong. Please try again later.');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
