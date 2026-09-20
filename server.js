require('dotenv').config();
const express = require('express');
const path = require('path');
const indexRouter = require('./src/routes/index');
const articlesRouter = require('./src/routes/articles');
const subscribeRouter = require('./src/routes/subscribe');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));
app.use(express.static(path.join(__dirname, 'src', 'public')));
app.use(express.urlencoded({ extended: false }));

app.use('/', indexRouter);
app.use('/articles', articlesRouter);
app.use('/api/subscribe', subscribeRouter);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
