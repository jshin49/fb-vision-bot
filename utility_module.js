'use strict';

const
  https = require('https'),
  request = require('request'),
  Stream = require('stream').Transform,
  fs = require('fs');


module.exports = {

  /*
   * Download image from url to filename and returns callback.
   *
   */
  download: function (uri, filename, callback) {
    https.request(uri, function(response) {
      var data = new Stream();

      response.on('data', function(chunk) {
        data.push(chunk);
      });

      response.on('error', function(err) {
        console.error(err);
        return callback(err);
      });

      response.on('end', function() {
        fs.writeFile(filename, data.read(), (err) => {
            if (err) {
              console.error(filename +' save error');
              return callback(err);
            }
            else return callback(null);
        });
      });
    }).end();
  },

  /*
   * Writes the Session file and returns callback.
   *
   */
  writeSession: function (mode, senderID, callback) {
    var __writeSession = (err, __callback) => {
      fs.stat('sessions/'+senderID, (err, stats) => {
        if (err) {
          if (err.code == "ENOENT") {
            fs.mkdir('sessions/'+senderID, () => {
              fs.writeFile('sessions/'+senderID+'/'+senderID+'.txt', mode, 'utf8', (err) => {
                if (err) return __callback(err);
                console.log('sessions/'+senderID+'/'+senderID+'.txt saved');
                return __callback(null)
              });
            });
          }
          else throw err;
        }
        else {
          if (stats.isDirectory()){
            fs.writeFile('sessions/'+senderID+'/'+senderID+'.txt', mode, 'utf8', (err) => {
              if (err) return __callback(err);
              console.log('sessions/'+senderID+'.txt saved');
              return __callback(null)
            });
          }
        }
      });
    }

    fs.stat('sessions', (err,stats) => {
      if (err) {
        if (err.code == "ENOENT") {
          __writeSession(mode, (err) => {
            if (err) return callback(err);
            return callback(null);
          });
        }
        else return callback(err);
      }
      else {
        __writeSession(mode, (err) => {
          if (err) return callback(err);
          return callback(null);
        });
      }
    });
  },

  /*
   * Reads the Session file and returns the callback.
   *
   */
  readSession: function (senderID, callback) {
    fs.readFile('sessions/'+senderID+'/'+senderID+'.txt', 'utf8', (err, mode) => {
      if (err) return callback(err);
      return callback(null, mode);
    })
  }

};

