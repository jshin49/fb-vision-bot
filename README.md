# fb-vision-bot
Facebook Messenger Bot that consumes Google Cloud Vision API and provides insights on images.

This bot integrates a NLP platform Wit.ai with Facebook Messenger to provide a richer and smarter user experience.

Features of Google Cloud Vision API are the following:

- Face Detection
  - Detect multiple faces within an image, along with the associated key facial attributes like emotional state or wearing headwear. Facial Recognition is not supported.
- Label Detection
  - Detects broad sets of categories within an image, ranging from modes of transportation to animals.
- Landmark Detection
  - Detect popular natural and man-made structures within an image.
- Logo Detection
  - Detect popular product logos within an image.
- Optical Character Recognition
  - Detect and extract text within an image, with support for a broad range of languages, along with support for automatic language identification.
- Explicit Content Detection
  - Detect explicit content like adult content or violent content within an image.
- Image Attributes
  - Detect general attributes of the image, such as dominant color.

First, check out the [Quickstart Guide](https://developers.facebook.com/docs/messenger-platform/quickstart) provided by Facebook.

Second, mkdir config and add a default.json inside config with the following contents:

```javascript
{
  "projectID": "YOUR GOOGLE CLOUD PROJECT ID",
  "pageID": "YOUR PAGE ID",
  "validationToken": "YOUR OWN TOKEN" (by default, "just_do_it")
  "appSecret": "YOUR APP SECRET",
  "pageAccessToken": "YOUR PAGEACCESS TOKEN",
  "validationToken": "YOUR VALIDATION TOKEN"
}
```

Third, since you have to install node-canvas for image processing, follow the instructions from here: [Node-canvas](https://github.com/Automattic/node-canvas)

Finally, if you are on Windows, JPEG support doesn't work correctly with node-canvas. Therefore you have to use ImageMagick to manually convert .jpg to .png.
Follow the instructions of this: [EasyImage](https://github.com/hacksparrow/node-easyimage)


## Running Locally
0. Install Node.js, NPM, and [ngrok](https://ngrok.com/) (or [localtunnel](https://localtunnel.me/))
1. Run "sudo npm install" command to install external modules locally
2. Run "node app.js" to run the app
3. Enter localhost:8080 on the web url to check (All static files are served in the 'public' folder)
4. Enter ngrok http 8080 to tunnel a connection from https://foo.ngrok.io to localhost
5. Give https://foo.ngrok.io/webhook for your webhook verificaiton URL in the Messenger App settings
6. Now for every message, you can check the response and request through your console.

## Running on Heroku
0. Do steps 0~1 from above and install Heroku toolbelt from the Heroku website
1. Run "heroku login"
2. If existing repository, simply add a remote to heroku with this command: heroku git:remote -a YOUR_HEROKU_APP
3. Else, run the following codes

  - heroku git:clone -a image-bot-test && cd image-bot-test
  - git add . && git commit -am "make it better" && git push heroku master

4. Give https://yourheroku.herokuapp.com/webhook for your webhook verificaiton URL in the Messenger App settings
5. Voila :)
6. Alternatively, you can connect your herokuapp to GitHub, and set it to automatically deploy whenever a commit is made.

Or you can simply click

(Will add deploy to heroku button here later)
