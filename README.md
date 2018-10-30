# StoryTEQ-connector-jw-player
A JWPlayer connector for the StoryTEQ API to simplify the loading of video data and tracking video analytics. The connector uses the unique hash generated by StoryTEQ API when creating a video as a reference to load video data and generate analytics. 

The analytics are visible in the StoryTEQ dashboard which is currently in beta. Please [contact us](mailto:teq@storyteq.com) if you haven't received a login yet.

## Dependencies
Loading the connector into your page is fairly easy, you can include the script directly from our CDN. Make sure to include the  script in the head of your page like this:
```
<script  type="text/javascript"  src="https://storage.googleapis.com/storyteq/platform/connector/storyteq-connector-jw-player.min.js"></script>
```
Otherwise you can install the connector as an npm package using the following command:
```
npm install storyteq-connector-jw-player
```
Or manually import the connector by downloading this repository.
```
<script  type="text/javascript"  src="storyteq-connector-jw-player.js"></script>
```
Altough JW player is included in the connector, it's possible to use your own JW player license (version 8). In that case please include the StoryTEQ connector after loading your own JW player.
```
<script type="text/javascript" src="https://content.jwplatform.com/libraries/aBC1DEf2.js"></script>
<script type="text/javascript" src="https://storage.googleapis.com/storyteq/platform/connector/storyteq-connector-jw-player.min.js"></script>
```
## Usage
After loading the script into your page, the connector needs to be configured. This is done by defining values for a few parameters in the following fashion:

```
var connector = new StoryteqConnectorJwPlayer({
	videoPlayerId : 'jwplayer',
	videoParameterName : 'key'
});
``` 
Not all parameters are required. Please check out the table below and  ```example.html``` in this repository for an example of a fully specced connector.

|parameter|type|description|required|
|--|--|--|--|
|videoPlayerId|string|The id of the HTML-element where the video player should be loaded.|yes|
|videoHash|string|The hash used to directly retrieve the video and send analytics events to.|not required if videoParameterName is filled|
|videoParameterName|string|The URL parameter where the hash is obtained from.|not required if videoHash is filled|
|mediaid|string|JWPlayer mediaid, used for JWPlayer tracking.|no|
|dataCallbackFunction|string|The name of the function which is called after video data has been loaded from the StoryTEQ API. This video data can for example be used for greeting the visitor with a personal message or prefilling a form. Video data parameter keys are similar to your template parameter keys.|no|
|verbose|bool|Enable console logging for the connector.|no|
|defaultUrls|object|Define fallback URL's for when no hash is provided in the URL.|no|
## Testing
If everything is set up correctly, you can test the connector. To create a valid URL, attach the videoParameterName as a GET parameter to your base URL, then add the video's unique hash as a value. For example:
```
https://domain.com?key=544208b722061e75fea340ba08210ba8
```
When you visit your page, the generated video should automatically be loaded.
## Support
If you run into trouble using the connector, please [contact us](mailto:teq@storyteq.com).
