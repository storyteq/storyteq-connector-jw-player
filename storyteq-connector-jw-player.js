function StoryteqConnectorJwPlayer (parameters) {
	this.videoPlayerId = parameters.videoPlayerId;
	this.videoHash = this.getUrlParameter(parameters.videoParameterName);
	this.dataCallbackFunction = parameters.dataCallbackFunction;

	// Get video data from StoryTEQ API
	this.getVideoData();

}

StoryteqConnectorJwPlayer.prototype.setJwPlayerInstance = function() {
	var jwPlayerInstance = jwplayer(this.videoPlayerId);
	jwPlayerInstance.setup({
		file: this.videoUrl, 
		image: this.posterUrl,
		events: {
			onComplete: function() {
				console.log("Video completed");
				//logProgress(100);
			},
			onPlay: function() {
				console.log("Video started");
				//logProgress(0);
			},
		}
	});

	//Get environment details
	this.setEnvironment(jwPlayerInstance.getEnvironment());
}

StoryteqConnectorJwPlayer.prototype.analyticPostRequest = function(type, meta) {
	var xhr = new XMLHttpRequest();
	var url = 'https://production.storyteq.com/storyteq/storyteq-connector-jw-player/analyticEvent.php';
		
	xhr.open('POST', url);
	xhr.setRequestHeader('Content-Type', 'application/json');

	xhr.send(JSON.stringify({
		'type' : type,
		'meta' : meta
	}));
}

StoryteqConnectorJwPlayer.prototype.getVideoData = function() {
	var xhr = new XMLHttpRequest();
	xhr.open('GET', 'https://production.storyteq.com/storyteq/storyteq-connector-jw-player/getVideoData.php');
	 
	xhr.onload = (data) => {
	    var response = JSON.parse(xhr.response);

	    // Process response
	    this.setVideoUrl(response.data.video_url);
	    this.setPosterUrl(response.data.poster_url);
	    this.setParameterData(response.data.parameters);

	    // Instantiate JW player
	    this.setJwPlayerInstance();

	    // Create device event
	    this.createAnalyticDevice();

	    // Run data callback function
	    eval('window.' + this.dataCallbackFunction + '()');
	}

	xhr.send();
}

StoryteqConnectorJwPlayer.prototype.createAnalyticDevice = function () {

	var meta = {'browser' : {}, 'os' : {}};
	
	// Read browser
	var browsers = this.environment.Browser;
	Object.keys(browsers).forEach(function(browser) {
			if (browsers[browser] == true){
				meta.browser.name = browser;
				meta.browser.version = browsers.version.version;
			}
	});

	// Read operating system
	var operatingSystems = this.environment.OS;
	Object.keys(operatingSystems).forEach(function(os) {
			if (operatingSystems[os] == true){
				if (os != 'mobile'){
					meta.os.name = os;
					meta.os.version = operatingSystems.version.version;
				}
			}
	});

	// Get platform spec
	if (this.environment.OS.mobile == false){
		meta.platform = 'desktop';
	} else if (this.environment.OS.mobile == true){
		meta.platform = 'mobile';
	}

	// Create analytic event
	this.analyticPostRequest('device', meta);
}

StoryteqConnectorJwPlayer.prototype.getParameterValueByName = function(parameterName) {
	for (var i = 0; i < this.parameterData.length; i++){
		if (this.parameterData[i].name == parameterName){
	     	return this.parameterData[i].value;
	  	}
	}
 }

StoryteqConnectorJwPlayer.prototype.getUrlParameter = function (name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
};

StoryteqConnectorJwPlayer.prototype.setVideoUrl = function(videoUrl) {
	this.videoUrl = videoUrl;
}

StoryteqConnectorJwPlayer.prototype.setPosterUrl = function(posterUrl) {
	this.posterUrl = posterUrl;
}

StoryteqConnectorJwPlayer.prototype.setParameterData = function(parameterData) {
	this.parameterData = parameterData;
}

StoryteqConnectorJwPlayer.prototype.kaasje = function(browser) {
	this.browser = browser;
}

StoryteqConnectorJwPlayer.prototype.setEnvironment = function(environmentData) {
	this.environment = environmentData;
}


