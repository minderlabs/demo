//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';
import express from 'express';
import favicon from 'serve-favicon';
import handlebars from 'express-handlebars';
import http from 'http';
import path from 'path';

const env = _.get(process.env, 'NODE_ENV', 'development');

const rootdir = _.get(process.env, 'NODE_ROOT_DIR', __dirname);

const app = express();

//
// https://github.com/ericf/express-handlebars#configuration-and-defaults
//
app.engine('handlebars', handlebars({
  defaultLayout: 'main',
  layoutsDir: path.join(rootdir, '/views/layouts'),
  partialsDir: path.join(rootdir, '/views/partials'),
  helpers: {
    section: function(name, options) {
      if (!this.sections) {
        this.sections = {};
      }
      this.sections[name] = options.fn(this);
    }
  }
}));

app.set('view engine', 'handlebars');
app.set('views', path.join(rootdir, 'views'));

app.use('/node_modules', express.static(path.join(rootdir, '../../node_modules')));

app.use('/assets', express.static((env === 'production') ? rootdir : path.join(rootdir, '../../dist')));

app.use(favicon(path.join(rootdir, 'public/favicon.ico')));
app.use(express.static(path.join(rootdir, 'public')));

app.get('/', function(req, res) {
  res.render('home', {});
});

const server = http.Server(app);

server.listen(4000, '127.0.0.1', () => {
  console.log('Started.');
});
