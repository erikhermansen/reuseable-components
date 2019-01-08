'use strict'

import gulp from 'gulp'
import nodemon from 'gulp-nodemon'
import browserSync from 'browser-sync'

import source from 'vinyl-source-stream'
import buffer from 'vinyl-buffer'
import browserify from 'browserify'
import babel from 'babelify'
import fs from 'fs'

import sass from 'gulp-sass'
import postcss from 'gulp-postcss'
import lostgrid from 'lost'
import postcssFocus from 'postcss-focus'
import autoprefixer from 'autoprefixer'
import sourcemaps from 'gulp-sourcemaps'

import modernizr from 'gulp-modernizr'

// WATCH TASKS -----------------------------------------------------------------
gulp.task('default', ['browser-sync', 'stylesheets', 'modernizr', 'scripts'], () => {
  gulp.watch('./source/stylesheets/**/*.scss', ['stylesheets'])
  gulp.watch('./source/javascripts/**/*.js', ['scripts'])
  gulp.watch('./views/**/*.ejs').on('change', browserSync.reload)
})

// BUILD TASKS -----------------------------------------------------------------
gulp.task('build', ['stylesheets', 'modernizr', 'scripts'])

// STYLESHEETS -----------------------------------------------------------------
gulp.task('stylesheets', () => {
  return gulp.src('./source/stylesheets/style.scss')
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(postcss([
      lostgrid(),
      postcssFocus(),
      autoprefixer({ browsers: ['last 2 versions', 'ie 6-8', 'Firefox > 20'] })
    ]))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('./dist/stylesheets'))
      .on('end', (e) => {
        console.log('*** STYLESHEETS bundled and transpiled ***')
      })
    .pipe(browserSync.stream())
})

// SCRIPTS ---------------------------------------------------------------------
gulp.task('scripts', () => {
  let bundler = browserify({
    debug: true,
    entries: ['./source/javascripts/script.js']
  })
    .transform(
      babel,
      {presets: ['es2015']}
    )
  let p = bundler.bundle()
    .on('error', function (err) {
      console.log(err)
      this.emit('end')
    })
    .pipe(source('script.js'))
    .pipe(buffer())

  return p.pipe(gulp.dest('./dist/javascripts/'))
    .on('end', (e) => {
      console.log('*** SCRIPTS bundled and transpiled ***')
    })
    .pipe(browserSync.stream())

})

// MODERNIZR -------------------------------------------------------------------
gulp.task('modernizr', () => {
  return gulp.src('./source/javascripts/*.js')
    .on('error', (err) => {
      console.log(err)
      this.emit('end')
    })
    .pipe(modernizr({
      'cache': true,
      'options': [
        'setClasses'
      ],
      'tests': [
        'touchevents',
        'classlist',
        'cssfilters',
        'flexbox'
      ]
    }))
    .pipe(gulp.dest('dist/javascripts/'))
    .on('end', (e) => {
      console.log('*** MODERNIZR SCRIPT bundled and transpiled ***')
    })
})

// BROWSER SYNC ----------------------------------------------------------------
gulp.task('browser-sync', ['nodemon'], () => {
  browserSync.init({
    proxy: {
      target: 'http://localhost:3000'
    },
    port: 7000
  })
})

// RUN APP (NODEMON) -----------------------------------------------------------
gulp.task('nodemon', (cb) => {
  let started = false

  return nodemon({
    script: 'app.js'
  }).on('start', () => {
    if (!started) {
      cb()
      started = true
    }
  })
})
