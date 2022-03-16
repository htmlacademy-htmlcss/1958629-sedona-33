const { src, dest, watch, series, parallel } = require('gulp');
const nunjucks = require('nunjucks');
const imagemin = require('gulp-imagemin');
const server = require('browser-sync').create();
const parser = require('posthtml-parser');
const render = require('posthtml-render');
const { getPosthtmlW3c } = require('pineglade-w3c');

const isDev = process.env.NODE_ENV === 'development';
const getPageName = (tree) => tree.options.from
  .replace(/^.*source(\\+|\/+)(.*)\.html$/, '$2')
  .replace(/\\/g, '/');

const buildHTML = () => src(['source/**/*.html', '!source/**/_*.html'])
  .pipe(require('gulp-posthtml')([
    (() => (tree) => {
      nunjucks.configure('source', { autoescape: false });

      return parser(nunjucks.renderString(render(tree), {
        isDev,
        page: getPageName(tree)
      }));
    })(),
    getPosthtmlW3c({
      getSourceName: (tree) => `${getPageName(tree)}.html`
    })
  ]))
  .pipe(require('gulp-html-beautify')())
  .pipe(dest('.'));

const buildCSS = () => src(['source/**/*.css', '!source/**/_*.css'])
  .pipe(require('gulp-postcss')([
    require('postcss-easy-import')(),
    require('stylelint')(),
    require('autoprefixer')(),
    require('postcss-reporter')({
      clearAllMessages: true,
      throwError: false
    })
  ]))
  .pipe(dest('.'));

const testBuildedCSS = () => src(['**/*.css', '!source/**/*.css', '!node_modules/**/*.css'])
  .pipe(require('gulp-postcss')([
    require('stylelint')({ fix: true }),
    require('postcss-reporter')({
      clearAllMessages: true,
      throwError: false
    })
  ]));

const optimizeImages = () => src('source/**/*.{svg,png,jpg}')
  .pipe(imagemin([
    imagemin.svgo({
      plugins: [
        {
          removeViewBox: false
        },
        {
          removeTitle: true
        },
        {
          cleanupNumericValues: {
            floatPrecision: 2
          }
        },
        {
          cleanupNumericValues: {
            floatPrecision: 2
          }
        },
        {
          convertPathData: {
            floatPrecision: 2
          }
        },
        {
          transformsWithOnePath: {
            floatPrecision: 2
          }
        },
        {
          convertTransform: {
            floatPrecision: 2
          }
        },
        {
          cleanupListOfValues: {
            floatPrecision: 2
          }
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

  watch('source/**/*.{html,svg}', series(buildHTML, reload));
  watch('source/**/*.css', series(buildCSS, testBuildedCSS, reload));
  watch('source/**/*.{svg,png,jpg}', series(optimizeImages, reload));
};

exports.test = testBuildedCSS;
exports.default = series(parallel(buildHTML, buildCSS, optimizeImages), testBuildedCSS, startServer);
