'use strict';

const
  bodyParser = require('body-parser'),
  config = require('config'),
  crypto = require('crypto'),
  express = require('express'),
  https = require('https'),
  request = require('request'),
  fs = require('fs'),
  Canvas = require('canvas');

// Get Google Cloud Vision project ID to check the sender
const PROJECT_ID =
  (process.env.GOOGLE_PROJECT_ID) ?
  (process.env.GOOGLE_PROJECT_ID) :
  config.get('projectID');

var gcloud = require('gcloud')({
  keyFilename: 'fb-vision-bot-credentials.json',
  projectId: PROJECT_ID
});

var vision = gcloud.vision();

module.exports = {

  detectFaces: function (inputFile, callback) {
    // Make a call to the Vision API to detect the faces
    vision.detectFaces(inputFile, function (err, faces) {
      if (err) {
        return callback(err, faces);
      }
      var numFaces = faces.length;
      console.log('Found ' + numFaces + (numFaces === 1 ? ' face' : ' faces'));
      callback(null, faces);
    });
  },

  highlightFaces: function (inputFile, faces, outputFile, callback) {
    fs.readFile(inputFile, function (err, image) {
      if (err) {
        return callback(err);
      }

      var Image = Canvas.Image;
      // Open the original image into a canvas
      var img = new Image();
      img.src = image;
      var canvas = new Canvas(img.width, img.height);
      var context = canvas.getContext('2d');

      context.drawImage(img, 0, 0, img.width, img.height);

      // Now draw boxes around all the faces
      context.strokeStyle = 'rgba(0,255,0,0.8)';
      context.lineWidth = '5';

      faces.forEach(function (face) {
        context.beginPath();
        face.bounds.face.forEach(function (bounds) {
          context.lineTo(bounds.x, bounds.y);
        });
        context.lineTo(face.bounds.face[0].x, face.bounds.face[0].y);
        context.stroke();
      });

      // Write the result to a file
      canvas.toBuffer(function(err, buf){
        if (err) {
          return callback(err);
        }
        else {
          fs.writeFile(outputFile, buf, (err) => {
            if (err) {
              console.error('face_detection.png save error');
              return callback(err);
            }
            else return callback(null);
          });
        }
      });

    });
  },

  detectObjects: function (inputFile, callback) {
    // Make a call to the Vision API to detect the labels
    vision.detectLabels(inputFile, { verbose: true }, function (err, labels) {
      if (err) {
        return callback(err);
      }
      console.log('result:', JSON.stringify(labels, null, 2));
      return callback(null, labels);
    });
  },

  detectLandmarks: function (inputFile, callback) {
    // Make a call to the Vision API to detect the landmarks
    vision.detectLandmarks(inputFile, { verbose: true }, function (err, landmarks) {
      if (err) {
        return callback(err, landmarks);
      }
      var numLandmarks = landmarks.length;
      console.log(landmarks);
      console.log('Found ' + numLandmarks + (numLandmarks === 1 ? ' landmark' : ' landmarks'));
      callback(null, landmarks);
    });
  },

  highlightLandmarks: function (inputFile, landmarks, outputFile, callback) {
    fs.readFile(inputFile, function (err, image) {
      if (err) {
        return callback(err);
      }

      var Image = Canvas.Image;
      // Open the original image into a canvas
      var img = new Image();
      img.src = image;
      var canvas = new Canvas(img.width, img.height);
      var context = canvas.getContext('2d');

      context.drawImage(img, 0, 0, img.width, img.height);

      // Now draw boxes around all the faces
      context.strokeStyle = 'rgba(0,255,0,0.8)';
      context.lineWidth = '5';

      landmarks.forEach(function (landmark) {
        context.beginPath();
        landmark.bounds.forEach(function (bound) {
          context.lineTo(bound.x, bound.y);
        });
        context.lineTo(landmark.bounds[0].x, landmark.bounds[0].y);
        context.stroke();
      });

      // Write the result to a file
      canvas.toBuffer(function(err, buf){
        if (err) {
          return callback(err);
        }
        else {
          fs.writeFile(outputFile, buf, (err) => {
            if (err) {
              console.error('landmark_detection.png save error');
              return callback(err);
            }
            else return callback(null);
          });
        }
      });

    });
  },

  detectLogos: function (inputFile, callback) {
    // Make a call to the Vision API to detect the logos
    vision.detectLogos(inputFile, { verbose: true }, function (err, logos) {
      if (err) {
        return callback(err, logos);
      }
      var numLogos = logos.length;
      console.log('Found ' + numLogos + (numLogos === 1 ? ' logo' : ' logos'));
      callback(null, logos);
    });
  },

  detectTexts: function (inputFile, callback) {
    // Make a call to the Vision API to detect the logos
    vision.detectText(inputFile, { verbose: true }, function (err, texts) {
      if (err) {
        return callback(err, texts);
      }
      var numTexts = texts.length;
      console.log('Found ' + numTexts + (numTexts === 1 ? ' text' : ' texts'));
      callback(null, texts);
    });
  },

  filterSafeSearch: function (inputFile, callback) {
    // Make a call to the Vision API to detect the faces
    vision.detectSafeSearch(inputFile, function (err, safeSearch) {
      if (err) {
        return callback(err, safeSearch);
      }
      callback(null, safeSearch);
    });
  },

  imageProperties: function (inputFile, callback) {
    // Make a call to the Vision API to detect the faces
    vision.detectProperties(inputFile, function (err, props) {
      if (err) {
        return callback(err, props);
      }
      callback(null, props);
    });
  }

};

