const { src, dest, watch, series, parallel } = require('gulp');
const nunjucks = require('nunjucks');
const imagemin = require('gulp-imagemin');
const server = require('browser-sync').create();
const parser = require('posthtml-parser');
const render = require('posthtml-render');
const chalk = require('chalk');
const fetch = require('node-fetch');
const { HtmlValidate } = require('html-validate');
const gulpIf = require('gulp-if');

let firstRun = true;
const validateHtml = new HtmlValidate();
const SeverityLevel = {
	error: 2,
	info: 1
};
const Severity = {
  1: {
    logOutput: chalk.yellow.bold,
    title: 'WARNING'
  },
  2: {
    logOutput: chalk.red.bold,
    title: 'ERROR'
  }
};
const W3C_TIMEOUT = 1000;
const isDev = process.env.NODE_ENV === 'development';
const getPage = (tree) => tree.options.from.replace(/^.*source(\\+|\/+)(.*)\.html$/, '$2');

const buildHTML = () => src(['source/**/*.html', '!source/**/_*.html'])
  .pipe(require('gulp-posthtml')([
    (() => (tree) => {
      nunjucks.configure('source', { autoescape: false });

      return parser(nunjucks.renderString(render(tree), {
        isDev,
        page: getPage(tree)
      }));
    })(),
    (() => async (tree) => {
      let output = '';
      const html = render(tree);
      const page = `${getPage(tree)}.html`;
      const controller = new AbortController();
      setTimeout(() => {
        controller.abort();
      }, W3C_TIMEOUT);

      try {
        // Онлайн-валидатор HTML

        const validRes = await fetch('https://validator.nu/?out=json', {
          body: html,
          headers: { 'Content-Type': 'text/html' },
          method: 'POST',
          signal: controller.signal
        });
        const { messages = [] } = await validRes.json();
        messages.forEach(({ extract, firstColumn, lastLine, message, type }) => {
          const { logOutput, title } = Severity[SeverityLevel[type]];
          const prefix = `\n[${chalk.cyan('Validate HTML Online')}] ${page} (${lastLine}:${firstColumn + 1})`;
          const selectorMsg = ` ${chalk.cyan(extract)}`;

          output += `${prefix}${selectorMsg}:\n${logOutput.underline(title)}: ${logOutput(message)}\n`;
        });
      } catch (err) {
        // Оффлайн-валидатор HTML

        const report = validateHtml.validateString(html, {
          extends: [
            'html-validate:recommended',
            'html-validate:document'
          ],
          rules: {
            'attribute-boolean-style': 'off',
            'no-trailing-whitespace': 'off',
            'input-missing-label': 'off',
            'require-sri': 'off'
          }
        });
        report.results.forEach(({ messages }) => {
          messages.forEach(({ column, line, message, selector, severity }) => {
            if (Severity[severity]) {
              const { logOutput, title } = Severity[severity];
              const prefix = `\n[${chalk.cyan('Validate HTML Offline')}] ${page} (${line}:${column})`;
              const selectorMsg = selector ? ` ${chalk.cyan(selector)}` : '';

              output += `${prefix}${selectorMsg}:\n${logOutput.underline(title)}: ${logOutput(message)}\n`;
            }
          });
        });
      } if (output) {
				console.log(output);
			}

      return tree;
    })()
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
  .pipe(gulpIf(firstRun, dest('source')))
  .pipe(dest('.'));

const reload = (done) => {
  server.reload();
  done();
};

const startServer = () => {
  firstRun = false;

  server.init({
    cors: true,
    server: '.',
    ui: false
  });

  watch('source/**/*.html', series(buildHTML, reload));
  watch('source/**/*.css', series(buildCSS, testBuildedCSS, reload));
  watch('source/**/*.{svg,png,jpg}', series(optimizeImages, reload));
};

exports.test = testBuildedCSS;
exports.default = series(parallel(buildHTML, buildCSS, optimizeImages), testBuildedCSS, startServer);
