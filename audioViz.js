/*
	1. Create contorls -  radio buttons and play/stop buttons
	2. Select the audio to play
	3. load that aduio data/buffer
	4a. display the visualizatoin
	4b. play the audio file

*/

var audioViz = (function() {
	var audionCtx,
		source = null,
		splitter,
		analyserLeft, analyserRight,
		leftBufferLength, rightBufferLength,
		leftDataArray, rightDataArray,
		
		startedAt = 0,
		pausedAt = 0,
		playing = false;

	var	soundFiles = [
			"song_1.mp3",
			"song_2.mp3",
			"song_3.mp3",
			"song_4.mp3",
			"song_5.mp3"
		],
		playingAudio,
		selectedAudio;

	var canvas,
		canvasCtx,
		WIDTH, HEIGHT, 
		canvasColor = "rgb(128,128,128)",
		view = 1,
		drawVisual;


	function setup() {
		// set up the audio 
		audioCtx = new (window.AudioContext || window.webkitAudioContext)();
		
		// set up controls
		createControls();
		
		// set up the canvas
		canvas = document.getElementById("vizCanvas");
		canvasCtx = canvas.getContext("2d");
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		WIDTH = canvas.width;
		HEIGHT = canvas.height;
		CENTER = WIDTH/2;

		// setup the play & pause events
		document.body.onkeyup = function(e) {
			// Spacebar for pausing
			if (e.keyCode == 32) { 
				if( playing ) pause();
				else {
					play(source.buffer);
				}
			}
			// V for changing the view 
			if (e.keyCode == 86) { 
				if (view == 1) view = 2;
				else if (view == 2) view = 3;
				else if (view == 3) view = 1;
			} 
		};
	}

	function createControls() {		
		// buttons for the sound files
		var songs = document.getElementById("songs");
		for (var i = 0; i < soundFiles.length; i++) {
			var label = document.createElement("label");
			var radioBtn = document.createElement("input");
			radioBtn.type = "radio";
			radioBtn.name = "song";
			radioBtn.value = "data/" + soundFiles[i];
			label.appendChild(radioBtn);
			var text = document.createTextNode(soundFiles[i]);
			label.appendChild(text);
			songs.appendChild(label);
			radioBtn.onclick = function(e) {
				loadSoundFile(e.target.value);
			};
		}	
	}


	// load the selected audio file 
	function loadSoundFile(path) {
		selectedAudio = path;
		console.log("playingAudio: ", playingAudio);
		console.log("selectedAudio: ", selectedAudio);
		
		// stop the current audio buffer before loading the selected audio
		if(source) stop();

		var request = new XMLHttpRequest();
		request.open("GET", path, true);
		request.responseType = "arraybuffer";

		request.onload = function() {
			var audioData = request.response;

			document.getElementById("loader").classList.add("show");

			audioCtx.decodeAudioData(audioData, function(buffer) {

				document.getElementById("loader").classList.remove("show");
				document.getElementById("loader").classList.add("hide");

				play(buffer);
			}, function(error) {
				console.log("Error with decoding audio data: " + error);
			});
		};
		request.send();
	}

	function play(buffer) {
		playingAudio = document.querySelector('input[name=song]:checked').value;
		console.log(buffer);
		// hide the menu while the file is playing
		document.getElementById("menu").classList.add("hide");


		var offset = pausedAt;

		source = audioCtx.createBufferSource();
		// connect the source to the context's destination (speakers)
		source.connect(audioCtx.destination);
		source.buffer = buffer;
		source.start(0, offset);

		source.onended = function(e) {
			stop();
		};
			
		startedAt = audioCtx.currentTime - offset;
		pausedAt = 0;
		playing = true;
		
		analyseAudio();
		draw(); 
	}

	function pause() {
		var elapsed = audioCtx.currentTime - startedAt;
		stop();
		pausedAt = elapsed;
	}

	function stop() {
		document.getElementById("menu").classList.remove("hide");
		
		if (source) {
			source.disconnect();
			source.stop(0);
			cancelAnimationFrame(drawVisual);
			console.log("STOP");
		}
		pausedAt = 0;
		startedAt = 0;
		playing = false;		
	}

	

	function analyseAudio() {
		splitter = audioCtx.createChannelSplitter(2);

		// create analyser node for 2 channels
		analyserLeft = audioCtx.createAnalyser();
		analyserLeft.fftSize = 1024;
		leftBufferLength = analyserLeft.frequencyBinCount;
		leftDataArray = new Uint8Array(leftBufferLength);

		analyserRight = audioCtx.createAnalyser();
		analyserRight.fftSize = 1024;
		rightBufferLength = analyserRight.frequencyBinCount;
		rightDataArray = new Uint8Array(rightBufferLength);
		
		source.connect(splitter);
		splitter.connect(analyserLeft, 0);
		splitter.connect(analyserRight, 1);
	} 


	// the visualization happens here
	function draw() {		
		// keep looping the draw function once it has been started
		drawVisual = requestAnimationFrame(draw);

		// get the frequency data and copy it into the arrays
		analyserLeft.getByteFrequencyData(leftDataArray);
		analyserRight.getByteFrequencyData(rightDataArray);

		var barWidth = (WIDTH / leftBufferLength),
			leftBarHeight,
			rightBarHeight,
			leftX = 0,
			rightX = 0;

		var leftY = 0,
			rightY = 0;

		canvasCtx.fillStyle = canvasColor;
		canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

		for (var i = 0; i < leftBufferLength; i++) {
			
			leftBarHeight = leftDataArray[i]; 
			rightBarHeight = rightDataArray[i]; 

			if (view == 1) {				
				canvasCtx.fillStyle = "rgba(" + leftBarHeight + ", 0, "+ leftBarHeight+ ", 1)";
				canvasCtx.fillRect(0, HEIGHT-leftY, leftBarHeight, barWidth);
				leftY += barWidth;
				
				canvasCtx.fillStyle = "rgba(0, " + rightBarHeight + ", 0, 1)";
				canvasCtx.fillRect(WIDTH-rightBarHeight, HEIGHT-rightY, rightBarHeight, barWidth);
				rightY += barWidth;

			} else if (view == 2) {
				canvasCtx.fillStyle = "rgba(" + leftBarHeight + ", 0, "+ leftBarHeight+ ", 1)";
				canvasCtx.fillRect(leftX, HEIGHT-leftBarHeight, barWidth, leftBarHeight);
				leftX += barWidth + 1;

				canvasCtx.fillStyle = "rgba(0, " + rightBarHeight + ", 0, .8)";
				canvasCtx.fillRect(rightX, HEIGHT-rightBarHeight, barWidth, rightBarHeight);
				rightX += barWidth + 1;

			} else if (view == 3) {
				canvasCtx.fillStyle = "rgba(" + leftBarHeight + ", 0, "+ leftBarHeight+ ", 1)";
				canvasCtx.fillRect(CENTER-leftBarHeight, HEIGHT-leftY, leftBarHeight, barWidth);
				leftY += barWidth;
				
				canvasCtx.fillStyle = "rgba(0, " + rightBarHeight + ", 0, 1)";
				canvasCtx.fillRect(CENTER, HEIGHT-rightY, rightBarHeight, barWidth);
				rightY += barWidth;
			}
		}
	}
	
	return {
		setup: setup,
		loadSoundFile: loadSoundFile,
		createControls: createControls,
		stop: stop,
		play: play,
		pause: pause,
		draw: draw
	};
})();