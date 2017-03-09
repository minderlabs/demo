//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';
import express from 'express';
import favicon from 'serve-favicon';
import handlebars from 'express-handlebars';
import http from 'http';
import path from 'path';

const app = express();

//
// https://github.com/ericf/express-handlebars#configuration-and-defaults
//
app.engine('handlebars', handlebars({
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, '/views/layouts'),
  partialsDir: path.join(__dirname, '/views/partials'),
  helpers: {
    section: function(name, options) {
      if (!this.sections) {
        this.sections = {};
      }
      this.sections[name] = options.fn(this);
    }
  }
}));

app.use('/node_modules', express.static(path.join(__dirname, '../../node_modules')));

app.use(favicon(path.join(__dirname, 'public/favicon.ico')));
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

app.get('/', function(req, res) {
  res.render('home', {});
});

const server = http.Server(app);

server.listen(4000, '127.0.0.1', () => {
  console.log('Started.');
});
