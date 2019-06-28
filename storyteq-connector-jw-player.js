function StoryteqConnectorJwPlayer(parameters) {
    var connector = this;
    if (!parameters.videoPlayerId) {
        throw new Error('Missing videoPlayerID.');
    }
    connector.videoPlayerId = parameters.videoPlayerId;
    connector.tracking = true;

    if (parameters.mediaData) {
        connector.mediaData = parameters.mediaData;
    } else if (parameters.videoHash) {
        connector.videoHash = parameters.videoHash;
    } else if (parameters.videoParameterName) {
        connector.videoHash = connector.getUrlParameter(parameters.videoParameterName);
    } else {
        throw new Error('Missing videoParameterName or videoHash or mediaData.');
    }

    if (parameters.mediaid) {
        connector.mediaid = parameters.mediaid;
    } else {
        connector.mediaid = 'WYwyv8s9';
    }

    if (parameters.verbose) {
        connector.verbose = parameters.verbose;
    }

    if (parameters.tracking == false) {
        connector.tracking = parameters.tracking;
    }

    if (parameters.dataCallbackFunction) {
        connector.dataCallbackFunction = parameters.dataCallbackFunction;
    }

    if (parameters.defaultUrls) {
        connector.defaultUrls = parameters.defaultUrls;
    }

    connector.jwplayerId = 'oNX7JPx1';
    if (parameters.jwplayerId) {
        connector.jwplayerId = parameters.jwplayerId;
    }

    if (parameters.subs) {
        connector.subs = parameters.subs;
    }

    if (parameters.playerSetup) {
        connector.playerSetup = parameters.playerSetup;
    }

    if (parameters.events) {
        connector.events = parameters.events;
    }

    // Video event variables
    connector.delta = 20;
    connector.durationOfVideo = null;
    connector.timecodes = [];
    connector.videoStarted = false;
    connector.firstPlay = true;

    (function() {
        var script = document.createElement('script');
        script.type = 'text/javascript';
        if (script.readyState) { // IE
            if (script.readyState === 'loaded') {
                // Get video data from StoryTEQ API
                connector.getVideoData();
            }
        } else { // Others
            script.onload = function() {
                // Get video data from StoryTEQ API
                connector.getVideoData();
            }
        }
        script.src = 'https://content.jwplatform.com/libraries/' + connector.jwplayerId + '.js';
        document.getElementsByTagName('head')[0].appendChild(script);
    }());
}

StoryteqConnectorJwPlayer.prototype.setJwPlayerInstance = function(response) {
    var connector = this;
    var jwPlayerInstance = jwplayer(connector.videoPlayerId);

    var config = {
        file: connector.videoUrl,
        image: connector.posterUrl,
        mediaid: connector.mediaid,
        events: {
            onReady: function() {
                connector.createAnalyticEmbed();
                
                if (connector.events && connector.events.onReady) {
                    connector.events.onReady();
                }
            },
            onComplete: function() {
                connector.videoStarted = false;
                if (connector.verbose) {
                    console.log('Video watched for 100% (complete)');
                }
                connector.createAnalyticView(100);
                
                if (connector.events && connector.events.onComplete) {
                    connector.events.onComplete();
                }
            },

            onPlay: function() {
                if (connector.videoStarted == false) {
                    connector.videoStarted = true;
                    if (connector.verbose) {
                        console.log('Video watched for 0% (playstart)');
                    }
                    if (connector.firstPlay){
                        connector.createAnalyticView(0);
                        connector.firstPlay = false;
                    }                    
                }
                
                if (connector.events && connector.events.onPlay) {
                    connector.events.onPlay();
                }
            },
            
            onPause: function() {
                if (connector.events && connector.events.onPause) {
                    connector.events.onPause();
                }
            }
        }
    };

    if (connector.playerSetup) {
        for(var key in connector.playerSetup){
            config[key] = connector.playerSetup[key];
        }
    }
    
    if (connector.subs) {
        config.captions = {
            backgroundOpacity: 0,
            edgeStyle: 'uniform'
        };
        config.tracks = [{
            file: connector.subs.path,
            label: connector.subs.language,
            kind: 'captions',
            default: true,
        }];
    }

    jwPlayerInstance.setup(config);

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
                    if (connector.verbose) {
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
    if ((this.mediaData != null || (this.videoHash != null && this.videoHash != '')) && this.tracking != false) {
        var hash = this.videoHash;
        if (this.mediaData != null) {
            hash = mediaData.hash;
        }
        var xhr = new XMLHttpRequest();
        var url = 'https://api.storyteq.com/v4/open/media/' + hash;

        xhr.open('POST', url);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('X-Content-Type-Options', 'nosniff');

        xhr.send(JSON.stringify({
            'type': type,
            'meta': meta
        }));
    } else {
        if (connector.verbose) {
            console.log('No analytics will be created since no unique hash has been provided or tracking has been disabled.');
        }
    }
}

StoryteqConnectorJwPlayer.prototype.getVideoData = function() {
    var connector = this;
    if (!connector.videoHash || connector.videoHash === null) {

        if (connector.mediaData) {
            if (connector.mediaData.urls) {
                connector.setVideoUrl(connector.mediaData.urls.video);
                if (connector.mediaData.urls.gif) {
                    connector.setPosterUrl(connector.mediaData.urls.gif);
                } else if (connector.mediaData.urls.image) {
                    connector.setPosterUrl(connector.mediaData.urls.image);
                }
            } else {
                connector.setVideoUrl(connector.mediaData.video_url);
                connector.setPosterUrl(connector.mediaData.poster_url);
            }
            connector.setJwPlayerInstance({data:connector.mediaData});

            // Create device event
            connector.createAnalyticDevice();
        } else if (connector.defaultUrls) {
            connector.setVideoUrl(connector.defaultUrls.video_url);
            connector.setPosterUrl(connector.defaultUrls.poster_url);
    
            // Instantiate JW player
            connector.setJwPlayerInstance({data:{}});
        } else {
            document.getElementById(connector.videoPlayerId).innerHTML = 'No video hash has been given';
            document.getElementById(connector.videoPlayerId).style = 'text-align: center;background:#000;color:#fff;font-weight:900;height:200px;line-height:200px;'
        }
    } else {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'https://api.storyteq.com/v4/open/media/' + connector.videoHash);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('X-Content-Type-Options', 'nosniff');
    
        xhr.onload = function(data) {
            var response = JSON.parse(xhr.response);
    
            // Process response
            connector.setVideoUrl(response.data.urls.video);
            connector.setPosterUrl(response.data.urls);
            connector.setParameterData(response.data.parameters);
    
            // Instantiate JW player
            connector.setJwPlayerInstance(response);
            
            // Create device event
            connector.createAnalyticDevice();
    
            if (connector.dataCallbackFunction) {
                // Run data callback function
                eval('window.' + connector.dataCallbackFunction + '()');
            }
        }
    
        xhr.send();
    }
}

StoryteqConnectorJwPlayer.prototype.createAnalyticDevice = function() {
    var connector = this;

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

    if (connector.verbose) {
        console.log(meta);
    }

    // Create analytic event
    this.analyticPostRequest('device', meta);
}

StoryteqConnectorJwPlayer.prototype.createAnalyticView = function(percentage) {
    var connector = this;

    var meta = {
        'percentage': percentage
    };

    if (connector.verbose) {
        console.log(meta);
    }
    
    // Create analytic event
    connector.analyticPostRequest('view', meta);
}

StoryteqConnectorJwPlayer.prototype.createAnalyticEmbed = function() {
    var connector = this;

    // Create analytic event
    connector.analyticPostRequest('embed', null);
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

StoryteqConnectorJwPlayer.prototype.setPosterUrl = function(urls) {
    if (urls.hasOwnProperty('gif')){
         this.posterUrl = urls.gif;
    } else if (urls.hasOwnProperty('image')){
         this.posterUrl = urls.image;
    }
}

StoryteqConnectorJwPlayer.prototype.getVideoUrl = function() {
    return this.videoUrl;
}

StoryteqConnectorJwPlayer.prototype.getPosterUrl = function() {
    return this.posterUrl;
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
} else {
    window.StoryteqConnectorJwPlayer = StoryteqConnectorJwPlayer;
}
