// global
import { src, dest, watch, series, parallel } from 'gulp';
import yargs from 'yargs';
import gulpIf from 'gulp-if';
import del from 'del';
import browserSync from "browser-sync";
import zip from "gulp-zip";
import info from "./package.json";
import replace from "gulp-replace";
import rename from 'gulp-rename';
//styles
import sass from 'gulp-sass';
import cleanCss from 'gulp-clean-css';
import postcss from 'gulp-postcss';
import sourcemaps from 'gulp-sourcemaps';
import autoprefixer from 'autoprefixer';
//scripts
import webpack from 'webpack-stream';
import named from 'vinyl-named';
//media
import imagemin from 'gulp-imagemin';
//template
import pug from 'gulp-pug'

const WP = yargs.argv.wpDev;
const PRODUCTION = yargs.argv.prod;
  const server = browserSync.create();
  export const serve = done => {
    server.init({
      // proxy: "http://localhost/texniko/DEV_F3/public_html",
      server:{baseDir: "./"},
      browser: "chrome",
    });
    done();
  };
  export const reload = done => {
    server.reload();
    done()
  };
  export const clean = () => del(['dist']);

  //templates
  export const templates = () => {
    return src('src/pug/**/*.pug')
      .pipe(pug())
      .pipe(gulpIf(WP,rename((path)=>path.extname = ".php")))
      .pipe(dest('./'))
      .pipe(server.stream())
    }

  //styles  
  export const styles = () => {
  return src(['src/scss/bundle.scss', /*'src/scss/admin.scss' */])
    .pipe(gulpIf(!PRODUCTION, sourcemaps.init()))
    .pipe(sass().on('error', sass.logError))
    .pipe(gulpIf(PRODUCTION, postcss([ autoprefixer ])))
    .pipe(gulpIf(PRODUCTION, cleanCss({compatibility:'ie8'})))
    .pipe(gulpIf(!PRODUCTION, sourcemaps.write()))
    .pipe(dest('dist/css'))
    .pipe(server.stream())
  }

  //images
  export const images = () => {
  return src('src/images/**/*.{jpg,jpeg,png,svg,gif}')
    .pipe(gulpIf(PRODUCTION, imagemin()))
    .pipe(dest('dist/images'));
  }
  //copy
  export const copy = () => {
    return src(['src/**/*','!src/{images,js,scss,pug}','!src/{images,js,scss,pug}/**/*'])
    .pipe(dest('dist'));
  }

  //scripts
    export const scripts = () => {
      return src(['src/js/bundle.js'/*,'src/js/admin.js'*/])
      .pipe(named())
      .pipe(webpack({
        module: {
        rules: [
          {
            test: /\.js$/,
            use: {
              loader: 'babel-loader',
              options: {
                presets: []
                }
              }
            }
          ]
        },
        mode: PRODUCTION ? 'production' : 'development',
        devtool: !PRODUCTION ? 'inline-source-map' : false,
        output: {
          filename: '[name].js'
        },
        externals: {
          jquery: 'jQuery'
        },
      }))
      .pipe(dest('dist/js'));
    }
    // zip
    export const compress = () => {
      return src([
        "**/*",
        "!node_modules{,/**}",
        "!bundled{,/**}",
        "!src{,/**}",
        "!.babelrc",
        "!.gitignore",
        "!gulpfile.babel.js",
        "!package.json",
        "!package-lock.json",
      ])
      .pipe(
        gulpIf(
          file => file.relative.split(".").pop() !== "zip",
          replace("_themename", info.name)
        )
      )
      .pipe(zip(`${info.name}.zip`))
      .pipe(dest('bundled'));
    };

    // watch
    export const watchForChanges = () => {
      watch('src/scss/**/*.scss', styles);
      watch('src/images/**/*.{jpg,jpeg,png,svg,gif}', series(images, reload));
      watch(['src/**/*','!src/{images,js,scss}','!src/{images,js,scss}/**/*'], series(copy, reload));
      watch('src/js/**/*.js', series(scripts, reload));
      watch("src/**/*.pug", series(templates, reload));
    } 
    export const dev = series(clean, parallel(styles, images, copy, scripts,templates),serve, watchForChanges);
    export const build = series(clean, parallel(styles, images, copy, scripts,templates), compress);
    export default dev;