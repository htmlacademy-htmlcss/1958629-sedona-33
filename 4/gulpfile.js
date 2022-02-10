const { src, dest, watch, series, parallel } = require('gulp');
const nunjucks = require('nunjucks');
const imagemin = require('gulp-imagemin');
const server = require('browser-sync').create();

const buildHTML = () => src(['source/**/*.html', '!source/**/_*.html'])
  .pipe(require('gulp-posthtml')([
    (() => (tree) => {
      nunjucks.configure('source', { autoescape: false });

      return require('posthtml-parser')(nunjucks.renderString(require('posthtml-render')(tree), {}));
    })()
  ]))
  .pipe(require('gulp-w3c-html-validator')())
  .pipe(require('gulp-html-beautify')())
  .pipe(dest('.'));

const buildCSS = () => src(['source/**/*.css', '!source/**/_*.css'])
  .pipe(require('gulp-postcss')([
    require('postcss-easy-import')(),
    require('stylelint')({ fix: true }),
    require('autoprefixer')(),
    require('postcss-reporter')({
      clearAllMessages: true,
      throwError: false
    })
  ]))
  .pipe(dest('.'));

const optimizeImages = () => src('source/**/*.{svg,png,jpg}')
  .pipe(imagemin([
    imagemin.svgo({
      plugins: [
        {
          name: 'removeViewBox',
          active: false
        },
        {
          name: 'removeTitle',
          active: true
        },
        {
          name: 'cleanupNumericValues',
          params: { floatPrecision: 2 }
        },
        {
          name: 'convertPathData',
          params: { floatPrecision: 2 }
        },
        {
          name: 'convertTransform',
          params: { floatPrecision: 2 }
        },
        {
          name: 'cleanupListOfValues',
          params: { floatPrecision: 2 }
        }
      ]
    }),
    imagemin.mozjpeg({ quality: 75, progressive: true }),
    imagemin.optipng()
  ]))
  .pipe(dest('.'));

const reload = (done) => {
  server.reload();
  done();
};

const startServer = () => {
  server.init({
    cors: true,
    server: '.',
    ui: false
  });

  watch('source/**/*.html', series(buildHTML, reload));
  watch('source/**/*.css', series(buildCSS, reload));
  watch('source/**/*.{svg,png,jpg}', series(optimizeImages, reload));
};

exports.default = series(parallel(buildHTML, buildCSS, optimizeImages), startServer);
