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

	var	playingAudio,
		selectedAudio;

	var canvas,
		canvasCtx,
		WIDTH, HEIGHT, 
		canvasColor = "black", 
		view = 1,
		drawVisual;

	var menu = document.getElementById("menu"),
		showMenu;

	function setup() {
		// set up the audio 
		audioCtx = new (window.AudioContext || window.webkitAudioContext)();
		
		var songs = document.getElementsByTagName("input");
		for (var i = 0; i < songs.length; i++) {
			console.log(songs[i]);
			songs[i].onclick = function(e) {
				displayMenu(false);
				loadSoundFile(e.target.value);
			};
		}
		
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
					if(source) play(source.buffer);
				}
			} 
			// M for menu
			else if(e.keyCode == 77 && !playing ) {
				displayMenu(showMenu);
			}
		};
	}


	function displayMenu(visible) {
		if(visible) {
			menu.classList.remove("hide");
			showMenu = false;
		}
		else {
			menu.classList.add("hide");
			showMenu = true;
		}
	}

	// load the selected audio file 
	function loadSoundFile(path) {
		// show the loader																																		
		document.getElementById("loader").classList.add("show");
		
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
		//document.getElementById("menu").classList.add("hide");
		//displayMenu(false);

		var offset = pausedAt;

		source = audioCtx.createBufferSource();
		// connect the source to the context's destination (speakers)
		source.connect(audioCtx.destination);
		source.buffer = buffer;
		source.start(0, offset);

		source.onended = function(e) {
			stop();
			displayMenu(true);
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
		analyserLeft.fftSize = 256;
		leftBufferLength = analyserLeft.frequencyBinCount;
		leftDataArray = new Uint8Array(leftBufferLength);

		analyserRight = audioCtx.createAnalyser();
		analyserRight.fftSize = 256;
		rightBufferLength = analyserRight.frequencyBinCount;
		rightDataArray = new Uint8Array(rightBufferLength);

		console.log("left bins: " + leftBufferLength);
		console.log("right bins: " + rightBufferLength);
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

		var leftBarHeight,
			rightBarHeight;

		var	leftX = 0,
			rightX = 0;

		var leftY = 0,
			rightY = 0;

		var leftAngle = 0,
			rightAngle = 0;


		canvasCtx.fillStyle = canvasColor;
		canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

		for (var i = 0; i < leftBufferLength; i++) {
			leftBarHeight = leftDataArray[i]; 
			rightBarHeight = rightDataArray[i]; 

	
			// draw line for the left data
			drawLine(
				WIDTH/2, HEIGHT/2, 
				leftBarHeight, 
				leftAngle,
				"rgba(" + leftBarHeight + ", 0, "+ leftBarHeight+ ", 1)"
			);

			// draw line for the right data
			drawLine(
				WIDTH/2, HEIGHT/2, 
				rightBarHeight, 
				rightAngle,
				"rgba(0, " + rightBarHeight + ", 0, 1)"
			);

			// angles up to half the circle
			leftAngle += ( (3/2) * Math.PI) / leftBufferLength;
			rightAngle -= ( (3/2) * Math.PI) / rightBufferLength;

			// full cirlce
			//angle += ((2*Math.PI)/leftBufferLength );
		}
	}


	// returns coordinates for a point on a circle's circumference
	function pointOnCircle(cx, cy, r, angle) {
		var x = cx - (r * Math.sin(angle)),
			y = cy - (r * Math.cos(angle));

		return {x: x, y: y};
	}

	
	// Draw a line at a specific angle
	function drawLine(x, y, r, angle, color) {
		var radiusOffset = 200,
			// instead of making the starting point the center of canvas,
			// the starting point will be the point from a circle's circumference with radius=200
			startPoint = pointOnCircle(x, y, radiusOffset, angle),
			endPoint = pointOnCircle(x, y, radiusOffset + r, angle);

		canvasCtx.lineWidth = 4;
		canvasCtx.strokeStyle = color;
		canvasCtx.beginPath();
		canvasCtx.moveTo(startPoint.x, startPoint.y);
		canvasCtx.lineTo(endPoint.x, endPoint.y);
		canvasCtx.stroke();
	}



	return {
		setup: setup,
		loadSoundFile: loadSoundFile,
		stop: stop,
		play: play,
		pause: pause,
		draw: draw
	};
})();