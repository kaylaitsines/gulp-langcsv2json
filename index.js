'use strict';

// Import modules
var gutil = require('gulp-util');
var through = require('through2');
var csv = require('pac-csv-array');
var mkdirp = require('mkdirp');
var fs  = require('fs');
var https = require('https');

// Consts
var PLUGIN_NAME = 'gulp-langcsv2json';

// Exports
module.exports = function (options) {
  options.filePath    = options.filePath || '';
  options.dest        = options.dest || '';
  options.columnKey   = options.columnKey || '';
  options.columnValue = options.columnValue || [];
  options.output      = options.output || ['json'];
  options.callback    = options.callback || function() {};
  options.debug       = options.debug || false;

  return through.obj(function (file, enc, cb) {

    if (file.isNull()) {
      this.push(file);
      return cb();
    }

    if (file.isStream()) {
      this.emit('error', new gutil.PluginError(PLUGIN_NAME, 'Streaming not supported'));
      return cb();
    }

    // Make dest dir
    mkdirp(options.dest, function(err) {
      if (err) return console.log(err);
    });

    // Fetch remote csv file
    options.fileName = __dirname + '/lang.csv';
    var csvFile = fs.createWriteStream(options.fileName);
    var request = https.get(options.filePath, function(response) {
      response.pipe(csvFile);

      csvFile.on('finish', function() {
        csvFile.close(cb_success);
      });
    }).on('error', function(err) {
      fs.unlink(options.fileName);
      if (cb_error) cb_error(err.message);
    });

    // Callback success
    function cb_success() {
      csv.parseCSV(options.fileName, function(data) {
        if (options.debug === 1) {
          console.log('====================data====================');
          console.log(JSON.stringify(data, null, 2));
        };

        var lang = {};
        var langString = {};

        for (var i in data) {
          for (var j in options.columnValue) {
            var language = options.columnValue[j];
            var key      = data[i][options.columnKey]
            var value    = data[i][language] == '' ? data[i]['en'] : data[i][language];
            if (typeof lang[language] == 'undefined') {
              lang[language] = {};
              langString[language] = '';
            };

            lang[language][key] = escape_quot(value);
            langString[language] += '"' + key + '" = "' + escape_quot(value, true) + '";\n';

            if (options.debug === 2) {
              console.log('=> ' + language, key, value);
            };
          };
        };

        var outputJson = options.output.indexOf('json') != -1;
        var outputStrings = options.output.indexOf('strings') != -1;

        for (var language in lang) {
          if (options.debug === 3) {
            console.log('====================' + language + '====================');
            console.log(JSON.stringify(lang[language], null, 2));
          };

          (function(language) {
            if (outputJson) {
              fs.writeFile(options.dest + language + '.json', JSON.stringify(lang[language], null, 2), function(err) {
                if (err) return console.log(err);
                console.info(logTime() + ' Translation generated! > \'' + logText('./' + options.dest + language + '.json', 'cyan') + '\'');
                cb_saved();
              });
            };

            if (outputStrings) {
              mkdirp(options.dest + language + '.lproj', function(err) {
                fs.writeFile(options.dest + language + '.lproj/Localizable.strings', langString[language], function(err) {
                  if (err) return console.log(err);
                  console.info(logTime() + ' Translation generated! > \'' + logText('./' + options.dest + language + '.lproj/Localizable.strings', 'cyan') + '\'');
                  cb_saved();
                });
              });
            };
          })(language);
        };
      });
    }

    // Callback error
    function cb_error(err) {
      console.log(err);
    }

    var countFiles = options.columnValue.length * options.output.length;
    var countSavedFiles = 0;

    function cb_saved() {
      if (++countSavedFiles == countFiles) {
        options.callback();
      };
    }

    // Helper
    function escape_quot(str, doubleSlashes) {
      doubleSlashes = doubleSlashes | false;

      if (doubleSlashes) {
        return str.replace(/&quot;/g, '\\"');
      } else {
        return str.replace(/&quot;/g, '\"');
      };
    }

    var styles = {
      'white'     : ['\x1B[37m', '\x1B[39m'],
      'grey'      : ['\x1B[90m', '\x1B[39m'],
      'black'     : ['\x1B[30m', '\x1B[39m'],
      'blue'      : ['\x1B[34m', '\x1B[39m'],
      'cyan'      : ['\x1B[36m', '\x1B[39m'],
      'green'     : ['\x1B[32m', '\x1B[39m'],
      'magenta'   : ['\x1B[35m', '\x1B[39m'],
      'red'       : ['\x1B[31m', '\x1B[39m'],
      'yellow'    : ['\x1B[33m', '\x1B[39m']
    };

    function logText(str, style) {
      return styles[style][0] + str + styles[style][1];
    }

    function logTime(str) {
      var tzoffset = (new Date()).getTimezoneOffset() * 60000;
      var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(11,-5);

      return '[' + logText(localISOTime, 'grey') + ']';
    }

    this.push(file);

    cb();
  });
};
