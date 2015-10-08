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
    width: 640,
    height: 480
  },
  {
    width: 640*1.5,
    height: 360*1.5
  },
  {
    width: 1280,
    height: 720,
}];

var properties = {
  video: formats[0],
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
    $('#bandwidth').on('change', function(){
      var bandwidth = $(this).value();
      easyrtc.setVideoBandwidth(parseInt(bandwidth));
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
      screen: 300, // 300kbits minimum
      audio: parseInt($('#audio-bandwidth').val()),   // 50kbits  minimum
      video: parseInt($('#video-bandwidth').val())   // 256kbits (both min-max)
  };
  sdp = BandwidthHandler.setVideoBitrates(sdp, bandwidth);
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
  var details = $('<div class="video-details">'+formattedName+'</div>');
  container.append(details);
  var video = document.createElement("video");
  video.muted = isLocal;
  container.append(video);

  var stats = $('<div class="stats"/>');
  details.append(stats);
  var statsInterval = calculateStats(video, stats);

  document.getElementById(divId).appendChild(container[0]);
  video.autoplay = true;
  easyrtc.setVideoObjectSrc(video, stream);
  return details[0];
}



function createLocalVideo(stream, streamName) {
  var labelBlock = addMediaStreamToDiv("localVideos", stream, streamName, true);
  var closeButton = createLabelledButton("close");
  closeButton.onclick = function() {
    easyrtc.closeLocalStream(streamName);
    labelBlock.parentNode.parentNode.removeChild(labelBlock.parentNode);
  }

  var fullscreen = $('<button>Fullscreen</button>');
  fullscreen.on('click', function(){
    $(this).parents('.video-wrapper').toggleClass('fullscreen');
  });
  labelBlock.appendChild(fullscreen[0]);
  labelBlock.appendChild(closeButton);

  console.log("created local video, stream.streamName = " + stream.streamName);
}

function addSrcButton(buttonLabel, videoId) {
  var button = createLabelledButton(buttonLabel);
  button.onclick = function() {
    easyrtc.setVideoSource(videoId);
    easyrtc.initMediaSource(
      function(stream) {
        createLocalVideo(stream, buttonLabel);
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
  easyrtc.setRoomOccupantListener(convertListToButtons);
  easyrtc.connect("easyrtc.multistream", loginSuccess, loginFailure);
  easyrtc.setAutoInitUserMedia(false);
  easyrtc.getVideoSourceList(function(videoSrcList) {
    for (var i = 0; i < videoSrcList.length; i++) {
     var videoEle = videoSrcList[i];
     var videoLabel = (videoSrcList[i].label &&videoSrcList[i].label.length > 0)?
     (videoSrcList[i].label):("src_" + i);
     addSrcButton(videoLabel, videoSrcList[i].id);
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
                  "Camera resolution: " + video.videoWidth + " x " + video.videoHeight;
      }
  }, 1000);
  return interval;
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