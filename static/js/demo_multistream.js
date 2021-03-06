//
//Copyright (c) 2014, Priologic Software Inc.
//All rights reserved.
//
//Redistribution and use in source and binary forms, with or without
//modification, are permitted provided that the following conditions are met:
//
//    * Redistributions of source code must retain the above copyright notice,
//      this list of conditions and the following disclaimer.
//    * Redistributions in binary form must reproduce the above copyright
//      notice, this list of conditions and the following disclaimer in the
//      documentation and/or other materials provided with the distribution.
//
//THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
//AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
//IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
//ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
//LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
//CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
//SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
//INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
//CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
//ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
//POSSIBILITY OF SUCH DAMAGE.
//

var selfEasyrtcid = "";
var haveSelfVideo = false;
var otherEasyrtcid = null;

var formats= [
  {
    width: 320,
    height: 180
  },
  {
    width: 320,
    height: 240
  },
  {
    width: 640,
    height: 360
  },
  {
    width: 640,
    height: 480
  },
  {
    width: 960,
    height: 720
  },
  {
    width: 1280,
    height: 720,
}];

var properties = {
  video: formats[5],
  frameRate: 30,
};


(function($, window){
  $(document).ready(function(){
    // Properties
    addFormatsSelector();
    $('#formats').on('change', function(){
      var res = formats[$('#formats').val()];
      easyrtc._desiredVideoProperties.width = res.width;
      easyrtc._desiredVideoProperties.height = res.height;
      console.log("easyrtc._desiredVideoProperties:", easyrtc._desiredVideoProperties);
    });
    $('#framerate').on('change', function(){
      easyrtc._desiredVideoProperties.frameRate = parseInt($(this).val());
    });
    // Set up DOM
    function addFormatsSelector(){
      for (var i = 0; i < formats.length; i++) {
        var option = $('<option value="'+i+'">'+formats[i].width+'x'+formats[i].height+'</option>');
          option.appendTo($('select#formats'));
      };
    }
  });
  
})($, window);

function buildSdp(sdp){
  // here is how to use it
  var bandwidth = {
      audio: parseInt($('#audio-bandwidth').val()),   // 50kbits  minimum
      video: parseInt($('#video-bandwidth').val())   // 256kbits (both min-max)
  };
  sdp = BandwidthHandler.setVideoBitrates(sdp, bandwidth);

  sdp = sdp.replace(/b=AS([^\r\n]+\r\n)/g, '');
  sdp = sdp.replace(/a=mid:audio\r\n/g, 'a=mid:audio\r\nb=AS:' + bandwidth.audio + '\r\n');
  sdp = sdp.replace(/a=mid:video\r\n/g, 'a=mid:video\r\nb=AS:' + bandwidth.video + '\r\n');
  console.log("sdp:", sdp);
  return sdp;
};

easyrtc.setSdpFilters(buildSdp, buildSdp);

function disable(domId) {
  console.log("about to try disabling "  +domId);
  document.getElementById(domId).disabled = "disabled";
}


function enable(domId) {
  console.log("about to try enabling "  +domId);
  document.getElementById(domId).disabled = "";
}


function createLabelledButton(buttonLabel) {
  var button = document.createElement("button");
  button.appendChild(document.createTextNode(buttonLabel));
  document.getElementById("videoSrcBlk").appendChild(button);
  return button;
}


function addMediaStreamToDiv(divId, stream, streamName, isLocal)
{
  var container = document.createElement("div");
  var container = $('<div class="video-wrapper"/>');
  var formattedName = streamName.replace("(", "<br>").replace(")", "");
  var details = $('<div class="video-details"/>');
  container.append(details);
  var video = document.createElement("video");
  video.muted = isLocal;
  container.append(video);
  var controls = $('<div class="controls"/>');
  // controls
  // close
  var closeButton = createLabelledButton("");
  var icon = $('<i class="fa fa-times-circle"/>');
  closeButton.appendChild(icon[0]);
  closeButton.onclick = function() {
    easyrtc.closeLocalStream(streamName);
    details.parent('.video-wrapper').remove();
  }

  // fullscreen
  var fullscreen = $('<button><i class="fa fa-arrows-alt"></i></button>');
  fullscreen.on('click', function(){
    container.toggleClass('fullscreen');
    var vid = $(container).find('video').first().get(0);
    $(vid).css('min-width', Math.min(window.innerWidth, vid.videoWidth));
    $(vid).css('min-height', Math.min(window.innerHeight, vid.videoHeight));
  });

  controls.append($('<div>'+formattedName+'</div>'));
  if(!isLocal)
  {

    var mute = $('<button><i class="fa fa-microphone"></i></button>');
    mute.on('click', function(){
      video.muted = !video.muted;
      mute.find('i').toggleClass('fa-microphone fa-microphone-slash')
      //mute.find('i').toggleClass('fa-microphone', !video.muted)
    });
    controls.append(mute);
  }
  else{
    var videoMuted = false;
    var muteVideo = $('<button><i class="fa fa-pause"></i></button>');
    muteVideo.on('click', function(){
      videoMuted = !videoMuted;
      if(!videoMuted){
        easyrtc.setVideoObjectSrc(video, stream);
      }
      else{
        easyrtc.setVideoObjectSrc(video, ''); 
      }
      muteVideo.find('i').toggleClass('fa-video-camera fa-pause')
    });
    controls.append(muteVideo);
  };
  controls.append(fullscreen[0]);
  controls.append(closeButton);
  controls.appendTo(details);
  console.log("created local video, stream.streamName = " + stream.streamName);


  var stats = $('<div class="stats"/>');
  details.append(stats);
  var statsInterval = calculateStats(video, stats);

  document.getElementById(divId).appendChild(container[0]);
  video.autoplay = true;
  easyrtc.setVideoObjectSrc(video, stream);
  return details[0];
}



function createLocalVideo(stream, streamName) {
  return addMediaStreamToDiv("localVideos", stream, streamName, true);
}

function addSrcButton(buttonLabel, videoId) {
  var button = createLabelledButton(buttonLabel);
  button.onclick = function() {
    // check audio state
    var currentAudio = $('#audio-'+videoId).is(':checked');
    var currentVideo = $('#video-'+videoId).is(':checked');
    easyrtc.enableAudio(currentAudio);
    easyrtc.enableVideo(currentVideo);
    easyrtc.setVideoSource(videoId);
    easyrtc.initMediaSource(
      function(stream) {
        var classes = [currentVideo ? 'video' : 'no-video', currentAudio ? 'audio' : 'no-audio'] 
        var block = createLocalVideo(stream, buttonLabel);
        console.log("block:", block);
        block.className += ' ' + classes.join(' ');
        if( otherEasyrtcid) {
          easyrtc.addStreamToCall(otherEasyrtcid, buttonLabel, function(easyrtcid, streamName){
            easyrtc.showError("Informational", "other party " + easyrtcid + " acknowledges receiving " + streamName);
          });
        }
      },
      function(errCode, errText) {
        easyrtc.showError(errCode, errText);
      }, buttonLabel);
  };
}

function connect() {
  console.log("Initializing.");
  $('body').removeClass('disconnected');
  easyrtc.setRoomOccupantListener(convertListToButtons);
  easyrtc.connect("easyrtc.multistream", loginSuccess, loginFailure);
  easyrtc.setAutoInitUserMedia(false);
  easyrtc.getVideoSourceList(function(videoSrcList) {
    for (var i = 0; i < videoSrcList.length; i++) {
     var src = $('<div class="src">');
     var videoEle = videoSrcList[i];
     var videoLabel = (videoEle.label && videoEle.label.length > 0)?
     (videoEle.label):("src_" + i);
     var audioName = 'audio-'+videoEle.id;
     var audioCheckbox = $('<input type="checkbox" name='+audioName+'" id="'+audioName+'"/>');
     var audioLabel = $('<label for="'+audioName+'">audio</label>');

     var videoName = 'video-'+videoEle.id;
     var videoCheckbox = $('<input type="checkbox" name='+videoName+'" id="'+videoName+'"/>');
     var videoCheckboxLabel = $('<label for="'+videoName+'">video</label>');

     src.append(videoLabel);
     src.append(audioLabel);
     $('#videoSrcBlk').append(audioCheckbox).append(audioLabel);
     $('#videoSrcBlk').append(videoCheckbox).append(videoCheckboxLabel);
     addSrcButton(videoLabel, videoEle.id);
    }
  });
}


function hangup() {
  easyrtc.hangupAll();
  var remotes = document.querySelectorAll('#remoteVideos .video-wrapper');
  for (var i = remotes.length - 1; i >= 0; i--) {
    remotes[i].remove();
  };
  disable('hangupButton');
}


function clearConnectList() {
  var otherClientDiv = document.getElementById('otherClients');
  while (otherClientDiv.hasChildNodes()) {
    otherClientDiv.removeChild(otherClientDiv.lastChild);
  }
}


function convertListToButtons(roomName, occupants, isPrimary) {
  clearConnectList();
  var otherClientDiv = document.getElementById('otherClients');
  for (var easyrtcid in occupants) {
    var button = document.createElement('button');
    button.onclick = function(easyrtcid) {
      return function() {
        performCall(easyrtcid);
      };
    }(easyrtcid);

    var label = document.createTextNode("Call " + easyrtc.idToName(easyrtcid));
    button.appendChild(label);
    otherClientDiv.appendChild(button);
  }
}


function performCall(targetEasyrtcId) {
  var acceptedCB = function(accepted, easyrtcid) {
    if (!accepted) {
      easyrtc.showError("CALL-REJECTED", "Sorry, your call to " + easyrtc.idToName(easyrtcid) + " was rejected");
      enable('otherClients');
    }
    else {
      otherEasyrtcid = targetEasyrtcId;
    }
  };

  var successCB = function() {
    enable('hangupButton');
  };
  var failureCB = function() {
    enable('otherClients');
  };
  var keys = easyrtc.getLocalMediaIds();

  easyrtc.call(targetEasyrtcId, successCB, failureCB, acceptedCB, keys);
  enable('hangupButton');
}

function getStats(peer) {
    _getStats(peer, function (results) {
        for (var i = 0; i < results.length; ++i) {
            var res = results[i];

            if (res.googCodecName == 'opus') {
                if (!window.prevBytesSent) 
                    window.prevBytesSent = res.bytesSent;

                var bytes = res.bytesSent - window.prevBytesSent;
                window.prevBytesSent = res.bytesSent;

                var kilobytes = bytes / 1024;
                console.log(kilobytes.toFixed(1) + ' kbits/s');
            }
        }

        setTimeout(function () {
            getStats(peer);
        }, 1000);
    });
}
// a wrapper around getStats which hides the differences (where possible)
// following code-snippet is taken from somewhere on the github
function _getStats(peer, cb) {
    if (!!navigator.mozGetUserMedia) {
        peer.getStats(
            function (res) {
                var items = [];
                res.forEach(function (result) {
                    items.push(result);
                });
                cb(items);
            },
            cb
        );
    } else {
        peer.getStats(function (res) {
            var items = [];
            res.result().forEach(function (result) {
                var item = {};
                result.names().forEach(function (name) {
                    item[name] = result.stat(name);
                });
                item.id = result.id;
                item.type = result.type;
                item.timestamp = result.timestamp;
                items.push(item);
            });
            cb(items);
        });
    }
};

function calculateStats(video, container) {
  var decodedFrames = 0,
          droppedFrames = 0,
          startTime = new Date().getTime(),
          initialTime = new Date().getTime();

  var interval = window.setInterval(function(){
      console.log("renderedVideoDimensions(video):", renderedVideoDimensions(video));
      //see if webkit stats are available; exit if they aren't
      if (!video.webkitDecodedFrameCount){
          console.log("Video FPS calcs not supported");
          return;
      }
      //get the stats
      else{
          var currentTime = new Date().getTime();
          var deltaTime = (currentTime - startTime) / 1000;
          var totalTime = (currentTime - initialTime) / 1000;
          startTime = currentTime;

          // Calculate decoded frames per sec.
          var currentDecodedFPS  = (video.webkitDecodedFrameCount - decodedFrames) / deltaTime;
          var decodedFPSavg = video.webkitDecodedFrameCount / totalTime;
          decodedFrames = video.webkitDecodedFrameCount;

          // Calculate dropped frames per sec.
          var currentDroppedFPS = (video.webkitDroppedFrameCount - droppedFrames) / deltaTime;
          var droppedFPSavg = video.webkitDroppedFrameCount / totalTime;
          droppedFrames = video.webkitDroppedFrameCount;

          //write the results to a table
          $(container)[0].innerHTML =
                  "<table><tr><th>Type</th><th>Total</th><th>Avg</th><th>Current</th></tr>" +
                  "<tr><td>Decoded</td><td>" + decodedFrames + "</td><td>" + decodedFPSavg.toFixed() + "</td><td>" + currentDecodedFPS.toFixed()+ "</td></tr>" +
                  "<tr><td>Dropped</td><td>" + droppedFrames + "</td><td>" + droppedFPSavg.toFixed() + "</td><td>" + currentDroppedFPS.toFixed() + "</td></tr>" +
                  "<tr><td>All</td><td>" + (decodedFrames + droppedFrames) + "</td><td>" + (decodedFPSavg + droppedFPSavg).toFixed() + "</td><td>" + (currentDecodedFPS + currentDroppedFPS).toFixed() + "</td></tr></table>" +
                  "Camera resolution: " + video.videoWidth + " x " + video.videoHeight +
                  "<div class='actual-dimensions'>"+renderedVideoDimensions(video)+"</div>";

      }
  }, 1000);
  return interval;
}
function renderedVideoDimensions(video){
  var $this = $(video);
  var h = $this.height();
  var w = $this.width();
  return 'Display Resolution: '+w+' x '+h;
}

function loginSuccess(easyrtcid) {
  disable("connectButton");
    //  enable("disconnectButton");
    enable('otherClients');
    selfEasyrtcid = easyrtcid;
    document.getElementById("iam").innerHTML = "I am " + easyrtc.cleanId(easyrtcid);
    $('.bandwidth').attr('disabled', true);
  }


  function loginFailure(errorCode, message) {
    easyrtc.showError(errorCode, message);
  }


  function disconnect() {
    document.getElementById("iam").innerHTML = "logged out";
    easyrtc.disconnect();
    enable("connectButton");
    //    disable("disconnectButton");
    clearConnectList();
    easyrtc.setVideoObjectSrc(document.getElementById('selfVideo'), "");
  }

easyrtc.setStreamAcceptor(function(easyrtcid, stream, streamName) {
  var labelBlock = addMediaStreamToDiv("remoteVideos", stream, streamName, false);
  labelBlock.parentNode.id = "remoteBlock" + easyrtcid + streamName;
  console.log("accepted incoming stream with name " + stream.streamName);
  console.log("checking incoming " + easyrtc.getNameOfRemoteStream(easyrtcid, stream));
});


easyrtc.setOnStreamClosed(function(easyrtcid, stream, streamName) {
  var item = document.getElementById("remoteBlock" + easyrtcid + streamName);
  item.parentNode.removeChild(item);
});


var callerPending = null;

easyrtc.setCallCancelled(function(easyrtcid) {
  if (easyrtcid === callerPending) {
    document.getElementById('acceptCallBox').style.display = "none";
    callerPending = false;
  }
});

easyrtc.setAcceptChecker(function(easyrtcid, callback) {
  otherEasyrtcid = easyrtcid;
  if (easyrtc.getConnectionCount() > 0) {
    easyrtc.hangupAll();
  }
  callback(true, easyrtc.getLocalMediaIds());
});
