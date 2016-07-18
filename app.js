/*
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/* jshint node: true, devel: true */
'use strict';
// @TODO: add gcloud in config file -> done
// @TODO: set cases for other modes
// @TODO: check for other modes and process accordingly. Check for session first
// @TODO: polish for github -> in progress
// @TODO: run cleanups for session ids or put them into a database -> very far far later. maybe never
// @TODO: Fix the 'others' button -> done

const
  bodyParser = require('body-parser'),
  config = require('config'),
  crypto = require('crypto'),
  express = require('express'),
  https = require('https'),
  request = require('request'),
  jsonfile = require('jsonfile'),
  easyimg = require('easyimage'),
  fs = require('fs');

var vision = require('./vision_module.js');
var util = require('./utility_module.js');

var app = express();

app.set('port', process.env.PORT || 8000);
app.use(bodyParser.json({ verify: verifyRequestSignature }));
app.use(express.static('public'));
app.use('/static', express.static('sessions'));


/*
 * Be sure to setup your config values before running this code. You can
 * set them using environment variables or modifying the config file in /config.
 *
 */

// App Secret can be retrieved from the App Dashboard
const APP_SECRET =
  (process.env.MESSENGER_APP_SECRET) ?
  process.env.MESSENGER_APP_SECRET :
  config.get('appSecret');

// Arbitrary value used to validate a webhook
const VALIDATION_TOKEN =
  (process.env.MESSENGER_VALIDATION_TOKEN) ?
  (process.env.MESSENGER_VALIDATION_TOKEN) :
  config.get('validationToken');

// Generate a page access token for your page from the App Dashboard
const PAGE_ACCESS_TOKEN =
  (process.env.MESSENGER_PAGE_ACCESS_TOKEN) ?
  (process.env.MESSENGER_PAGE_ACCESS_TOKEN) :
  config.get('pageAccessToken');

// Get Facebook page ID to check the sender
const PAGE_ID =
  (process.env.MESSENGER_PAGE_ID) ?
  (process.env.MESSENGER_PAGE_ID) :
  config.get('pageID');

// Get base URL of server
const BASE_URL =
  (process.env.BASE_URL) ?
  (process.env.BASE_URL) :
  config.get('baseURL');

if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN)) {
  console.error("Missing config values");
  process.exit(1);
}

/*
 * Calls the google vision api, and processes image accordingly here
 * Use the client library.
 *
 */
function processImage(senderID, operationType) {
  switch(operationType) {
    case "face_detection":
      // Convert jpg to png
      easyimg.convert({src:'sessions/'+senderID+'/'+senderID+'_'+operationType+'.jpg', dst:'sessions/'+senderID+'/'+senderID+'_'+operationType+'.png', quality:100})
      .then(function() {
        vision.detectFaces('sessions/'+senderID+'/'+senderID+'_'+operationType+'.png', (err, faces) => {
          if (err) {
            console.error('Failed to detect faces.');
            return;
          }
          else {
            console.log(faces);
            vision.highlightFaces('sessions/'+senderID+'/'+senderID+'_'+operationType+'.png', faces,'sessions/'+senderID+'/'+operationType+'.png', (err) => {
              if (err) {
                console.error("Failed to highlight faces.");
                return;
              }
              else {
               fs.stat('sessions/'+senderID+'/'+operationType+'.png', (err, stats) => {
                  if (err) console.error(operationType+'.png does not exist');
                  else {
                    if (stats.isFile()){
                      console.log(operationType+'.png found');
                      sendImageMessage(senderID, senderID+'/'+operationType+'.png');
                    }
                  }
                });
              }
            });
          }
        });
      });
      break;

    case "object_detection":
      vision.detectObjects('sessions/'+senderID+'/'+senderID+'_'+operationType+'.jpg', (err, labels) => {
        if (err) {
          console.error(err);
          return;
        }
        else {
          var message = "Detected objects: ";
          labels.forEach((label) => {
            console.log('Found label: ' + label.desc);
            message += "'"+label.desc+"'"+ " "
          });
          sendTextMessage(senderID, message);
        }
      });

      break;

    case "landmark_detection":
      // easyimg.convert({src:'sessions/'+senderID+'/'+senderID+'_'+operationType+'.jpg', dst:'sessions/'+senderID+'/'+senderID+'_'+operationType+'.png', quality:100})
      // .then(function() {
      //   vision.detectLandmarks('sessions/'+senderID+'/'+senderID+'_'+operationType+'.png', (err, landmarks) => {
      //     if (err) {
      //       console.log('Failed to detect landmarks.');
      //     }
      //     else {
      //       console.log(landmarks);
      //       vision.highlight('sessions/'+senderID+'/'+senderID+'_'+operationType+'.png', landmarks,'sessions/'+senderID+'/'+operationType+'.png', operationType, (err) => {
      //         if (err) {
      //           console.log("Failed to highlight landmarks.")
      //         }
      //         else {
      //          fs.stat('sessions/'+senderID+'/'+operationType+'.png', (err, stats) => {
      //             if (err) console.error('landmark_detection.png does not exist');
      //             else {
      //               if (stats.isFile()){
      //                 console.log(operationType+'.png found');
      //                 sendImageMessage(senderID, senderID+'/'+operationType+'.png');
      //                 var message = "Detected landmarks: ";
      //                 landmarks.forEach((landmark) => {
      //                   console.log('Found landmark: ' + landmark.desc);
      //                   message += "'"+landmark.desc+"'"+ " "
      //                 });
      //                 sendTextMessage(senderID, message);
      //               }
      //             }
      //           });
      //         }
      //       });
      //     }
      //   });
      // });
      vision.detectLandmarks('sessions/'+senderID+'/'+senderID+'_'+operationType+'.jpg', (err, landmarks) => {
        if (err) {
          console.error(err);
          return;
        }
        else {
          var message = "Detected landmarks: ";
          landmarks.forEach((landmark) => {
            console.log('Found landmark: ' + landmark.desc);
            message += "'"+landmark.desc+"'"+ " "
          });
          sendTextMessage(senderID, message);
        }
      });
      break;

    case "logo_detection":
      vision.detectLogos('sessions/'+senderID+'/'+senderID+'_'+operationType+'.jpg', (err, logos) => {
        if (err) {
          console.error(err);
          return;
        }
        else {
          console.log(logos);
          var message = "Detected logos: ";
          logos.forEach((logo) => {
            console.log('Found logo: ' + logo.desc);
            message += "'"+logo.desc+"'"+ " "
          });
          sendTextMessage(senderID, message);
        }
      });
      break;

    case "text_detection":
      vision.detectTexts('sessions/'+senderID+'/'+senderID+'_'+operationType+'.jpg', (err, texts) => {
        if (err) {
          console.error(err);
          return;
        }
        else {
          // console.log(texts);
          var message = "Detected text: " + texts[0].desc;
          console.log('Found text: ' + texts[0].desc);
          if (texts[0].desc.length > 305)
            sendTextMessage(senderID, "Text length must be less than 305 characters.");
          else
            sendTextMessage(senderID, message);
        }
      });
      break;

    case "filter_safe_search":
      vision.filterSafeSearch('sessions/'+senderID+'/'+senderID+'_'+operationType+'.jpg', (err, safeSearch) => {
        if (err) {
          console.error(err);
        }
        else {
          console.log(safeSearch);
          var message = "Adult: " + safeSearch.adult;
          message += "\nMedical: " + safeSearch.medical;
          message += "\nSpoof: " + safeSearch.spoof;
          message += "\nViolence: " + safeSearch.violence;
          sendTextMessage(senderID, message);
        }
      });
      break;

    case "image_properties":
      vision.imageProperties('sessions/'+senderID+'/'+senderID+'_'+operationType+'.jpg', (err, props) => {
        if (err) {
          console.error(err);
          return;
        }
        else {
          console.log(props);
          var message = "Dominant colors detected (in hex): ";
          props.colors.forEach((color) => {
            message += "\n"+color;
          });
          sendTextMessage(senderID, message);
        }
      });
      break;

    default:
      console.error("Such operation does not exist");
      break;
  }


}

/*
 * Use your own validation token. Check that the token used in the Webhook
 * setup is the same token used here.
 *
 */
app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === VALIDATION_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);
  }
});

/*
 * All callbacks for Messenger are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks
 * for your page.
 * https://developers.facebook.com/docs/messenger-platform/implementation#subscribe_app_pages
 *
 */
app.post('/webhook', function (req, res) {
  var data = req.body;
  // Make sure this is a page subscription
  if (data.object == 'page') {
    console.log(data.entry);
    // Iterate over each entry
    // There may be multiple if batched
    data.entry.forEach(function(pageEntry) {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;

      // Iterate over each messaging event
      pageEntry.messaging.forEach(function(messagingEvent) {
        if (messagingEvent.optin) {
          receivedAuthentication(messagingEvent);
        } else if (messagingEvent.message) {
          receivedMessage(messagingEvent);
        } else if (messagingEvent.delivery) {
          receivedDeliveryConfirmation(messagingEvent);
        } else if (messagingEvent.postback) {
          receivedPostback(messagingEvent);
        } else {
          console.log("Webhook received unknown messagingEvent: ", messagingEvent);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know you've
    // successfully received the callback. Otherwise, the request will time out.
    res.sendStatus(200);
  }
});

/*
 * Verify that the callback came from Facebook. Using the App Secret from
 * the App Dashboard, we can verify the signature that is sent with each
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];
  console.log(signature);
  if (!signature) {
    // For testing, let's log an error. In production, you should throw an
    // error.
    console.error("Couldn't validate the signature.");
  } else {
    var elements = signature.split('=');
    var method = elements[0];
    var signatureHash = elements[1];

    var expectedHash = crypto.createHmac('sha1', APP_SECRET)
                        .update(buf)
                        .digest('hex');

    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
}

/*
 * Authorization Event
 *
 * The value for 'optin.ref' is defined in the entry point. For the "Send to
 * Messenger" plugin, it is the 'data-ref' field. Read more at
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference#auth
 *
 */
function receivedAuthentication(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfAuth = event.timestamp;

  if (senderID == PAGE_ID) {
    console.error("Sender is self.");
    return;
  }
  // The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
  // The developer can set this to an arbitrary value to associate the
  // authentication callback with the 'Send to Messenger' click event. This is
  // a way to do account linking when the user clicks the 'Send to Messenger'
  // plugin.
  var passThroughParam = event.optin.ref;

  console.log("Received authentication for user %d and page %d with pass " +
    "through param '%s' at %d", senderID, recipientID, passThroughParam,
    timeOfAuth);

  // When an authentication is received, we'll send a message back to the sender
  // to let them know it was successful.
  sendTextMessage(senderID, "Authorizationentication successful");
}

/*
 * Message Event
 *
 * This event is called when a message is sent to your page. The 'message'
 * object format can vary depending on the kind of message that was received.
 * Read more at https://developers.facebook.com/docs/messenger-platform/webhook-reference#received_message
 *
 * For this example, we're going to echo any text that we get. If we get some
 * special keywords ('button', 'generic', 'receipt'), then we'll send back
 * examples of those bubbles to illustrate the special message bubbles we've
 * created. If we receive a message with an attachment (image, video, audio),
 * then we'll simply confirm that we've received the attachment.
 *
 */
function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  if (senderID == PAGE_ID) {
    console.error("Sender is self.");
    return;
  }

  console.log("Received message for user %d and page %d at %d with message:",
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var messageId = message.mid;

  // You may get a text or attachment but not both
  var messageText = message.text;
  var messageAttachments = message.attachments;

  if (messageText) {

    // If we receive a text message, check to see if it matches any special
    // keywords and send back the corresponding example. Otherwise, just echo
    // the text we received.
    switch (messageText) {
      // @TODO: Implement Wit.ai or Api.ai to save all this trouble

      case 'Help':
      case 'help':
      case 'hello':
      case 'hi':
      case 'Hello':
      case 'Hi':
        sendTextMessage(senderID, "Set a mode you want from the menu. You can also type as following: 'Face Detection' or 'Landmark Detection'. After you set the mode, send an image you want to process, and Voila!");
        break;

      case 'Face Detection':
      case 'Face detection':
      case 'face detection':
        util.writeSession('face_detection', senderID, (err) => {
          if (err) {
            console.error('Session ' + senderID + ' writing error');
            return;
          }
          sendTextMessage(senderID, "Face Detection mode is set. Please send us an image.");
        });
      break;

      case 'Object Detection':
      case 'Object detection':
      case 'object detection':
        util.writeSession('object_detection', senderID, (err) => {
          if (err) {
            console.error('Session ' + senderID + ' writing error');
            return;
          }
          sendTextMessage(senderID, "Object Detection mode is set. Please send us an image.");
        });
      break;

      case 'Landmark Detection':
      case 'Landmark detection':
      case 'landmark detection':
        util.writeSession('landmark_detection', senderID, (err) => {
          if (err) {
            console.error('Session ' + senderID + ' writing error');
            return;
          }
          sendTextMessage(senderID, "Landmark Detection mode is set. Please send us an image.");
        });
      break;

      case 'Logo Detection':
      case 'Logo detection':
      case 'logo detection':
        util.writeSession('logo_detection', senderID, (err) => {
          if (err) {
            console.error('Session ' + senderID + ' writing error');
            return;
          }
          sendTextMessage(senderID, "Logo Detection mode is set. Please send us an image.");
        });
      break;

      case 'Text Detection':
      case 'Text detection':
      case 'text detection':
        util.writeSession('text_detection', senderID, (err) => {
          if (err) {
            console.error('Session ' + senderID + ' writing error');
            return;
          }
          sendTextMessage(senderID, "Text Detection mode is set. Please send us an image.");
        });
      break;

      case 'Filter':
      case 'filter':
      case 'Safe Search':
      case 'Safe search':
      case 'safe search':
      case 'Filter Safe Search':
      case 'filter safe search':
        util.writeSession('filter_safe_search', senderID, (err) => {
          if (err) {
            console.error('Session ' + senderID + ' writing error');
            return;
          }
          sendTextMessage(senderID, "Filter Safe Search mode is set. Please send us an image.");
        });
      break;

      case 'Image Properties':
      case 'Image properties':
      case 'image properties':
        util.writeSession('image_properties', senderID, (err) => {
          if (err) {
            console.error('Session ' + senderID + ' writing error');
            return;
          }
          sendTextMessage(senderID, "Image Properties mode is set. Please send us an image.");
        });
      break;

      default:
        sendTextMessage(senderID, "Please type 'Help' or open the menu.");
    }
  } else if (messageAttachments) {
    messageAttachments.forEach(function(messageAttachment) {
      var attachmentUrl = messageAttachment.payload.url;
      console.log("Received Attachment");

      // Check if image / audio / video / file (messageAttachment.type)
      switch (messageAttachment.type) {
        case 'image':
          // read session.txt and parse
          util.readSession(senderID, (err, mode) => {
            if (err) console.error(err);
            else {
              console.log(mode + " found " + typeof(mode));
              util.download(attachmentUrl, 'sessions/'+senderID+'/'+senderID+'_'+mode+'.jpg', (error, filename) => {
                if (error) {
                  console.log('Failed to download ' + attachmentUrl);
                }
                else {
                  processImage(senderID, mode);
                }
              });
            }
          });
          break;

        default:
          console.log("No matching attachment type");
          sendTextMessage(senderID, "Message with no matching attachment type received. Please send an image.");
          break;
      }
    });
  }
}


/*
 * Delivery Confirmation Event
 *
 * This event is sent to confirm the delivery of a message. Read more about
 * these fields at https://developers.facebook.com/docs/messenger-platform/webhook-reference#message_delivery
 *
 */
function receivedDeliveryConfirmation(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var delivery = event.delivery;
  var messageIDs = delivery.mids;
  var watermark = delivery.watermark;
  var sequenceNumber = delivery.seq;

  if (messageIDs) {
    messageIDs.forEach(function(messageID) {
      console.log("Received delivery confirmation for message ID: %s",
        messageID);
    });
  }

  console.log("All message before %d were delivered.", watermark);
}


/*
 * Postback Event
 *
 * This event is called when a postback is tapped on a Structured Message. Read
 * more at https://developers.facebook.com/docs/messenger-platform/webhook-reference#postback
 *
 */
function receivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;

  if (senderID == PAGE_ID) {
    console.error("Sender is self.");
    return;
  }

  // The 'payload' param is a developer-defined field which is set in a postback
  // button for Structured Messages.
  var payload = event.postback.payload;

  console.log("Received postback for user %d and page %d with payload '%s' " +
    "at %d", senderID, recipientID, payload, timeOfPostback);

  switch (payload) {
    case 'PERSISTENT_MENU_HELP':
      sendTextMessage(senderID, "Set a mode you want from the menu. You can also type as following: 'Face Detection' or 'Landmark Detection'. After you set the mode, send an image you want to process, and Voila!");
      break;

    // @TODO: Create session file that holds user data (later replace with database)
    case 'PERSISTENT_MENU_FACE_DETECTION':
      util.writeSession('face_detection', senderID, (err) => {
        if (err) {
          console.error('Session ' + senderID + ' writing error');
          return;
        }
        sendTextMessage(senderID, "Face Detection mode is set. Please send us an image.");
      });
      break;

    case 'PERSISTENT_MENU_OBJECT_DETECTION':
      util.writeSession('object_detection', senderID, (err) => {
        if (err) {
          console.error('Session ' + senderID + ' writing error');
          return;
        }
        sendTextMessage(senderID, "Object Detection mode is set. Please send us an image.");
      });
      break;

    case 'PERSISTENT_MENU_LANDMARK_DETECTION':
      util.writeSession('landmark_detection', senderID, (err) => {
        if (err) {
          console.error('Session ' + senderID + ' writing error');
          return;
        }
        sendTextMessage(senderID, "Landmark Detection mode is set. Please send us an image.");
      });
      break;

    case 'PERSISTENT_MENU_LOGO_DETECTION':
      util.writeSession('logo_detection', senderID, (err) => {
        if (err) {
          console.error('Session ' + senderID + ' writing error');
          return;
        }
        sendTextMessage(senderID, "Logo Detection mode is set. Please send us an image.");
      });
      break;

    case 'PERSISTENT_MENU_TEXT_DETECTION':
      util.writeSession('text_detection', senderID, (err) => {
        if (err) {
          console.error('Session ' + senderID + ' writing error');
          return;
        }
        sendTextMessage(senderID, "Text Detection mode is set. Please send us an image.");
      });
      break;

    case 'PERSISTENT_MENU_FILTER_SAFE_SEARCH':
      util.writeSession('filter_safe_search', senderID, (err) => {
        if (err) {
          console.error('Session ' + senderID + ' writing error');
          return;
        }
        sendTextMessage(senderID, "Filter Safe Search mode is set. Please send us an image.");
      });
      break;

    case 'PERSISTENT_MENU_IMAGE_PROPERTIES':
      util.writeSession('image_properties', senderID, (err) => {
        if (err) {
          console.error('Session ' + senderID + ' writing error');
          return;
        }
        sendTextMessage(senderID, "Image Properties mode is set. Please send us an image.");
      });
      break;

    case 'PERSISTENT_MENU_OTHERS':
      sendMenuOthersMessage(senderID, "You can also try out the following modes: 'Text Detection', 'Filter Safe Search', and 'Image Properties'.");
      break;

    default:
      // When a postback is called, we'll send a message back to the sender to
      // let them know it was successful
      console.log("Postback called");
      sendTextMessage(senderID, "Please type 'Help' or open the menu.");
      break;
  }
}

/*
 * Send a button message using the Send API.
 *
 */
function sendMenuOthersMessage(recipientId, messageText) {
  var buttons = [{
    type: "postback",
    title: "Text Detection",
    payload: "PERSISTENT_MENU_TEXT_DETECTION"
  },{
    type: "postback",
    title: "Filter Safe Search",
    payload: "PERSISTENT_MENU_FILTER_SAFE_SEARCH"
  },{
    type: "postback",
    title: "Image Properties",
    payload: "PERSISTENT_MENU_IMAGE_PROPERTIES"
  }];

  sendButtonMessage(recipientId, messageText, buttons);
}

/*
 * Send a message with an image attachment using the Send API.
 *
 */
function sendImageMessage(recipientId, imageFile) {
  var baseUrl = BASE_URL;
  var url = baseUrl + imageFile;
  var messageDataTemplate = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "image",
        payload: {
          url: url
        }
      }
    }
  };

  callSendAPI(messageDataTemplate);
}

/*
 * Send a button message using the Send API.
 *
 */
function sendButtonMessage(recipientId, messageText, buttons) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: messageText,
          buttons: buttons
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a text message using the Send API.
 *
 */
function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a Structured Message (Generic Message type) using the Send API.
 *
 */
function sendGenericMessage(recipientId, messageText, attachment, payload) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "rift",
            subtitle: "Next-generation virtual reality",
            item_url: "https://www.oculus.com/en-us/rift/",
            image_url: "http://messengerdemo.parseapp.com/img/rift.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/rift/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for first bubble",
            }],
          }, {
            title: "touch",
            subtitle: "Your Hands, Now in VR",
            item_url: "https://www.oculus.com/en-us/touch/",
            image_url: "http://messengerdemo.parseapp.com/img/touch.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/touch/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for second bubble",
            }]
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Call the Send API. The message data goes in the body. If successful, we'll
 * get the message id in a response
 *
 */
function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      console.log("Successfully sent generic message with id %s to recipient %s",
        messageId, recipientId);
    } else {
      console.error("Unable to send message. Trying again.");
      request({
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: PAGE_ACCESS_TOKEN },
        method: 'POST',
        json: messageData

      }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          var recipientId = body.recipient_id;
          var messageId = body.message_id;

          console.log("Successfully sent generic message with id %s to recipient %s",
            messageId, recipientId);
        } else {
          console.error("Unable to send message.");
          // console.error(response);
          console.error(error);
        }
      });
      // console.error(response);
      console.error(error);
    }
  });
}

// Start server
// Webhooks must be available via SSL with a certificate signed by a valid
// certificate authority.
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

module.exports = app;
