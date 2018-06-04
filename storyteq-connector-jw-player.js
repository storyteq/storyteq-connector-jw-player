function StoryteqConnectorJwPlayer(parameters) {
    var $vm = this;
    $vm.videoPlayerId = parameters.videoPlayerId;
    $vm.videoHash = $vm.getUrlParameter(parameters.videoParameterName);

    if (parameters.track) {
        $vm.track = true;
    }

    if (parameters.verbose) {
        $vm.verbose = true;
    }

    if (parameters.dataCallbackFunction) {
        $vm.dataCallbackFunction = parameters.dataCallbackFunction;
    }

    $vm.jwplayerId = 'oNX7JPx1';
    if (parameters.jwplayerId) {
        $vm.jwplayerId = parameters.jwplayerId;
    }

    // Video event variables
    $vm.delta = 20;
    $vm.durationOfVideo = null;
    $vm.timecodes = [];
    $vm.videoStarted = false;

    (function() {
        var script = document.createElement('script');
        script.type = 'text/javascript';
        if (script.readyState) { // IE
            if (script.readyState === 'loaded') {
                // Get video data from StoryTEQ API
                $vm.getVideoData();
            }
        } else { // Others
            script.onload = function() {
                // Get video data from StoryTEQ API
                $vm.getVideoData();
            }
        }
        script.src = 'https://content.jwplatform.com/libraries/' + $vm.jwplayerId + '.js';
        document.getElementsByTagName('head')[0].appendChild(script);
    }());
}

StoryteqConnectorJwPlayer.prototype.setJwPlayerInstance = function(response) {
    var connector = this;
    var jwPlayerInstance = jwplayer(this.videoPlayerId);
    jwPlayerInstance.setup({
        file: this.videoUrl,
        image: this.posterUrl,
        events: {
            onComplete: function() {
                if (this.verbose) {
                    console.log('Video watched for 100% (complete)');
                }
                connector.videoStarted = false;
                connector.createAnalyticView(100);
            },
            onPlay: function() {
                if (connector.videoStarted == false) {
                    if (this.verbose) {
                        console.log('Video watched for 0% (playstart)');
                    }

                    connector.videoStarted = true;

                    if (this.track) {
                        connector.createAnalyticView(0);
                    }
                }
            },
        }
    });

    // Create StoryTEQ button in player
    this.createPlayerButton(response, jwPlayerInstance);

    //Get environment details
    this.setEnvironment(jwPlayerInstance.getEnvironment());

    // Fire off video event emitter
    this.videoEventEmitter(jwPlayerInstance);
}

StoryteqConnectorJwPlayer.prototype.createPlayerButton = function(response, jwPlayerInstance) {
    if (response.data.player_logo == true) {
        jwPlayerInstance.addButton(
            'https://storage.googleapis.com/storyteq-shared-assets/video-player/logo.png',
            'Powered by StoryTEQ',
            function() {
                window.open('https://storyteq.com/?utm_source=stplayer', '_blank');
            },
            'about'
        );
    }
}

StoryteqConnectorJwPlayer.prototype.round = function(value, precision) {
    var multiplier = Math.pow(100, precision || 0);
    return Math.round(value * multiplier) / multiplier;
}

StoryteqConnectorJwPlayer.prototype.videoEventEmitter = function(jwPlayerInstance) {
    var connector = this;
    jwPlayerInstance.onTime(function(event) {
        //Dynamically fetch duration of video
        if (event.position > 1 && connector.durationOfVideo == null) {
            connector.durationOfVideo = jwPlayerInstance.getDuration();
            for (var i = 1; i < connector.delta; i = i + 1) {
                connector.timecodes[i] = {
                    percentage: i * 1 / connector.delta,
                    value: i / connector.delta * connector.durationOfVideo,
                    passed: false
                };
            }
        }

        //Check if percentage points are passed
        if (connector.durationOfVideo != null) {
            connector.timecodes.forEach(function(element) {
                if (event.position > element.value && (event.position - element.value) < connector.durationOfVideo / connector.delta && element.passed == false) {
                    var percentage = connector.round(element.percentage * 100, 1);
                    if (this.verbose) {
                        console.log('Video watched for ' + percentage + '%');
                    }
                    connector.createAnalyticView(percentage);
                    element.passed = true;
                }
            });
        }
    });
}

StoryteqConnectorJwPlayer.prototype.analyticPostRequest = function(type, meta) {
    var xhr = new XMLHttpRequest();
    var url = 'https://api.storyteq.com/api/v3/open/video/' + this.videoHash;

    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.send(JSON.stringify({
        'type': type,
        'meta': meta
    }));
}

StoryteqConnectorJwPlayer.prototype.getVideoData = function() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://api.storyteq.com/api/v3/open/video/' + this.videoHash);

    xhr.onload = (data) => {
        var response = JSON.parse(xhr.response);

        // Process response
        this.setVideoUrl(response.data.video_url);
        this.setPosterUrl(response.data.poster_url);
        this.setParameterData(response.data.parameters);

        // Instantiate JW player
        this.setJwPlayerInstance(response);

        // Create device event
        if (this.track) {
            this.createAnalyticDevice();
        }

        if (this.dataCallbackFunction) {
            // Run data callback function
            eval('window.' + this.dataCallbackFunction + '()');
        }
    }

    xhr.send();
}

StoryteqConnectorJwPlayer.prototype.createAnalyticDevice = function() {

    var meta = {
        'browser': {},
        'os': {}
    };

    // Read browser
    var browsers = this.environment.Browser;
    Object.keys(browsers).forEach(function(browser) {
        if (browsers[browser] == true) {
            meta.browser.name = browser;
            meta.browser.version = browsers.version.version;
        }
    });

    // Read operating system
    var operatingSystems = this.environment.OS;
    Object.keys(operatingSystems).forEach(function(os) {
        if (operatingSystems[os] == true) {
            if (os != 'mobile') {
                meta.os.name = os;
                meta.os.version = operatingSystems.version.version;
            }
        }
    });

    // Get platform spec
    if (this.environment.OS.mobile == false) {
        meta.platform = 'desktop';
    } else if (this.environment.OS.mobile == true) {
        meta.platform = 'mobile';
    }

    if (this.verbose) {
        console.log(meta);
    }

    // Create analytic event
    this.analyticPostRequest('device', meta);
}

StoryteqConnectorJwPlayer.prototype.createAnalyticView = function(percentage) {

    var meta = {
        'percentage': percentage
    };

    if (this.verbose) {
        console.log('tracking');
        console.log(meta);
    }
    
    // Create analytic event
    this.analyticPostRequest('view', meta);
}

StoryteqConnectorJwPlayer.prototype.getParameterValueByName = function(parameterName) {
    for (var i = 0; i < this.parameterData.length; i++) {
        if (this.parameterData[i].name == parameterName) {
            return this.parameterData[i].value;
        }
    }
}

StoryteqConnectorJwPlayer.prototype.getUrlParameter = function(name) {
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

StoryteqConnectorJwPlayer.prototype.setEnvironment = function(environmentData) {
    this.environment = environmentData;
}

if (typeof module === "object" && module && typeof module.exports === "object") {
    // commonjs / browserify
    module.exports = StoryteqConnectorJwPlayer;
} else if (typeof require != 'undefined') {
    // AMD
    define(StoryteqConnectorJwPlayer);
}
