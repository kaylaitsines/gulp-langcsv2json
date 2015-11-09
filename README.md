# gulp-langcsv2json

## Options
```sh
  gulp.src('./package.json')
    .pipe(langcsv2json({
      filePath:    '',
      dest:        'app/languages/',
      columnKey:   'json_id',
      columnValue: ['en', 'de', 'it', 'fr', 'es']
    }));
```
