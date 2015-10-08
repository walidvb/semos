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
  height: 360
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
  console.log("$:", $);
  $(document).ready(function(){


    // Properties
    addFormatsSelector();
    $('#formats').on('change', function(){
      easyrtc._desiredVideoProperties.video = formats[$('#formats').val()];
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

console.log("easyrtc:", easyrtc);
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
  container.classList.add('video-wrapper');
  container.style.marginBottom = "10px";
  var formattedName = streamName.replace("(", "<br>").replace(")", "");
  var labelBlock = document.createElement("div");
  labelBlock.classList.add('video-details');
  labelBlock.style.width = "220px";
  labelBlock.style.cssFloat = "left";
  labelBlock.innerHTML = "<pre>" + formattedName + "</pre><br>";
  container.appendChild(labelBlock);
  var video = document.createElement("video");
  video.muted = isLocal;
  video.style.verticalAlign= "middle";
  container.appendChild(video);
  document.getElementById(divId).appendChild(container);
  video.autoplay = true;
  easyrtc.setVideoObjectSrc(video, stream);
  return labelBlock;
}



function createLocalVideo(stream, streamName) {
  var labelBlock = addMediaStreamToDiv("localVideos", stream, streamName, true);
  var closeButton = createLabelledButton("close");
  closeButton.onclick = function() {
    easyrtc.closeLocalStream(streamName);
    labelBlock.parentNode.parentNode.removeChild(labelBlock.parentNode);
  }
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
        //
        // add an extra button for screen sharing
        //
        var screenShareButton = createLabelledButton("Screen capture/share");
        var numScreens = 0;
        if (!chrome.desktopCapture) {
          screenShareButton.disabled = true;
        }
        else {
          screenShareButton.onclick = function() {
            numScreens++;
            var streamName = "screen" + numScreens;
            easyrtc.initScreenCapture(
              function(stream) {
                createLocalVideo(stream, streamName);
                if( otherEasyrtcid) {
                  easyrtc.addStreamToCall(otherEasyrtcid, "screen");
                }
              },
              function(errCode, errText) {
                easyrtc.showError(errCode, errText);
              }, streamName);
          };
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


function loginSuccess(easyrtcid) {
  disable("connectButton");
    //  enable("disconnectButton");
    enable('otherClients');
    selfEasyrtcid = easyrtcid;
    document.getElementById("iam").innerHTML = "I am " + easyrtc.cleanId(easyrtcid);
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


document.addEventListener('DOMContentLoaded', function(){
  return;
  var comparer = document.querySelector('#localVideos');


  function gumSuccess(stream) {
    var video = document.createElement('video');
      // window.stream = stream;
      if ('mozSrcObject' in video) {
        video.mozSrcObject = stream;
      } else if (window.webkitURL) {
        video.src = window.webkitURL.createObjectURL(stream);
      } else {
        video.src = stream;
      }
      comparer.appendChild(video);
      video.play();
    }

    function gumError(error) {
      console.error('Error on getUserMedia', error);
    }

    var constraints = [{
      video: {
        mandatory:{
          maxWidth: 1280,
          maxHeight: 720
        }
      } 
    },
    {
      video: {
        mandatory:{
          maxWidth: 1280/2,
          maxHeight: 720/2
        }
      } 
    },
    {
      video: {
        mandatory:{
          maxWidth: 160,
          maxHeight: 120
        }
      } 
    },];
    function gumInit() {
      navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

      if (navigator.getUserMedia) {
        for (var i = constraints.length - 1; i >= 0; i--) {
          navigator.getUserMedia(constraints[i], gumSuccess, gumError);
        };
      }
    }
    gumInit();
  });