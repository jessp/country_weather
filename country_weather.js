const fs = require('fs');
const http = require('http');


getWeather("montreal");



var tempArray, precipArray;
var thresholds;

var isWeatherReturned = false;
var isThreshReturned = false;

var totalHeight = 520; //multiple of 52
var maxWidth = 20;
var minWidth = 4;
var index = 0;
let segmentHeight = totalHeight/52;
var carrier;
var previousCarrier;


//city can be toronto, montreal, vancouver, or yellow_knife
function getWeather(city){
	doRequest("./formatted_data/" + city + ".json", (e) => doNextStep(e, "weather", city));
	doRequest("./thresholds.json" , (e) => doNextStep(e, "thresh", city));
}

function doNextStep(newVal, type, city){

	if (type === "weather"){
		isWeatherReturned = true;
		precipArray = newVal["precipArray"];
		tempArray = newVal["tempArray"];
	} else if (type === "thresh"){
		isThreshReturned = true;
		thresholds = newVal;
	}

	if (isThreshReturned && isWeatherReturned){
		makeShape(city);
	}
	
}

function scale(num, in_min, in_max, out_min, out_max) {
	let mappedNum = (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
	let evenNum = 2 * Math.round(mappedNum / 2);
  	return evenNum;
}

function makeShape(city){
	let kCode = "";


	let newArray = [];
	for (var i = 0; i < tempArray.length; i++){
		let newNum = scale(tempArray[i], thresholds["temp"][0], thresholds["temp"][1], minWidth, maxWidth);
		newArray.push(newNum);
	}

	kCode += setup();

	let min = 0;
	let max = maxWidth;

	
	kCode += doCastOn(newArray[0], determineCarrier(precipArray[0]));
	

	for (var i = 0; i < newArray.length; i++){
		let startTube = newArray[i];
		let endTube = newArray[(i+1)%newArray.length];

		carrier = determineCarrier(precipArray[i]);
		let doRelease = false; 

		if (carrier != previousCarrier && i > 0){
			kCode += doCastOff(previousCarrier);
			doRelease = true;
			kCode += ("inhook " + carrier + "\n");
			/*
			This is a hack.
			By default "inhook" parks the yarn inserting hook before the first knitting 
			operation. If we're increasing width, even if we releasehook before making any transfers,
			we run the risk of getting an "inserting hook and knitting hook interfere" error.
			So, we create a "miss" at the outside edge of where the knit object is.
			*/
			if (endTube > startTube){
				kCode += ("miss - f" + (maxWidth * 2) + " " + carrier + "\n");
			}
		}

		if (endTube > startTube) {
			kCode += makeWider(startTube, endTube, carrier, doRelease);
		} else if (endTube == startTube){
			kCode += makeTube(startTube, endTube, carrier, doRelease);
		} else {
			kCode += makeNarrower(startTube, endTube, carrier, doRelease);
		}

		previousCarrier = carrier;
	}
	
	kCode += doCastOff(carrier);

	writeFile(kCode, city);

}

function determineCarrier(val){

	if (val < thresholds["precip"][0]){
		return "3";
	} else if (val < thresholds["precip"][1]){
		return "2";
	} else {
		return "1";
	}

}

function doCastOff(carrier){
	let code = "";
	code += ("outhook " + carrier + "\n");
	return code;
}

function makeWider(_min, _max, carrier, doRelease){
	let code = "";

	let startingMin = maxWidth - _min;
	let startingMax = maxWidth + _min;

	let endingMin = maxWidth - _max;
	let endingMax = maxWidth + _max;

	var actingMin = startingMin;
	var actingMax = startingMax;

	let numDecreases = Math.ceil((segmentHeight)/(_max - _min));
	let proportionDecreases = numDecreases/(segmentHeight) * (segmentHeight);


	for (var i = 0; i < (segmentHeight); i++){
		if (index % 2 === 0){
			for (let n = actingMax; n >= actingMin; --n) {
				//remember we're knitting on every other needle
				if (n % 2 == 0){
					code += ("knit - f" + n + " " + carrier + "\n");
				}
			}
		} else {
			for (let n = actingMin; n <= actingMax; ++n) {
				if (n % 2 == 0){
					code += ("knit + b" + n + " " + carrier + "\n");
				}
			}
		}

		if (i % proportionDecreases === 0){
			if ((actingMax + 2) <= endingMax){
				code += rack([actingMax, actingMax - 2], "f", "+");
				code += rack([actingMax, actingMax - 2], "b", "+");
				actingMax = actingMax + 2; 
			}

			if ((actingMin - 2) >= endingMin){
				code += rack([actingMin, actingMin + 2], "b", "-");
				code += rack([actingMin, actingMin + 2], "f", "-");
				actingMin = actingMin - 2;
			}
		}

		if (doRelease && i === 0){
			code += ("releasehook " + carrier + "\n");
		}

		index ++;
	}

	return code;
}

function makeTube(_min, _max, carrier, doRelease){
	let code = "";
	let min = maxWidth - _min;
	let max = maxWidth + _min;

	for (var i = 0; i < segmentHeight; i++){
		if (index % 2 == 0) {
			for (let n = max; n >= min; --n) {
				//remember we're knitting on every other needle
				if (n % 2 == 0){
					code += ("knit - f" + n + " " + carrier + "\n");
				}
			}
		} else {
			for (let n = min; n <= max; ++n) {
				if (n % 2 == 0){
					code += ("knit + b" + n + " " + carrier + "\n");
				}
			}
		}

		if (doRelease && i === 0){
			code += ("releasehook " + carrier + "\n");
		}
		index ++;
	}
	return code;
}

function makeNarrower(_min, _max, carrier, doRelease){
	let code = "";

	let startingMin = maxWidth - _min;
	let startingMax = maxWidth + _min;

	let endingMin = maxWidth - _max;
	let endingMax = maxWidth + _max;

	var actingMin = startingMin;
	var actingMax = startingMax;

	let numDecreases = Math.ceil(segmentHeight/(_min - _max));
	let proportionDecreases = (numDecreases/segmentHeight) * segmentHeight;


	for (var i = 0; i < segmentHeight; i++){
		if (index % 2 === 0){
			for (let n = actingMax; n >= actingMin; --n) {
				//remember we're knitting on every other needle
				if (n % 2 == 0){
					code += ("knit - f" + n + " " + carrier + "\n");
				}
			}
		} else {
			for (let n = actingMin; n <= actingMax; ++n) {
				if (n % 2 == 0){
					code += ("knit + b" + n + " " + carrier + "\n");
				}
			}
		}

		//release carrier hook before xfers
		if (doRelease && i === 0){
			code += ("releasehook " + carrier + "\n");
		}

		if (i % proportionDecreases === 0){
			if ((actingMax - 2) >= endingMax){
				code += rack([actingMax, actingMax - 2], "f", "-");
				code += rack([actingMax, actingMax - 2], "b", "-");
				actingMax = actingMax - 2; 
			}

			if ((actingMin + 2) <= endingMin){
				code += rack([actingMin, actingMin + 2], "b", "+");
				code += rack([actingMin, actingMin + 2], "f", "+");
				actingMin = actingMin + 2;
			}
		}

		index ++;
	}

	return code;
}

//simple function to move a range of needles in a direction by transfering them to the opposing bed
function rack(needles, bed, direction, doRelease){
	let secondBed = bed === "f" ? "b" : "f";

	let code = "";

	if (bed === "f"){
		code += ("rack " + (direction === "+" ? "-1" : "1") + "\n");
	} else {
		code += ("rack " + (direction === "+" ? "1" : "-1") + "\n");
	}

	for (var n = 0; n < needles.length; n++){
		code += ("xfer " + bed + needles[n] + " "  + secondBed + (needles[n] + (direction == "+" ? 1 : -1)) + "\n");
	}

	if (bed === "f"){
		code += ("rack " + (direction === "+" ? "1" : "-1") + "\n");
	} else {
		code += ("rack " + (direction === "+" ? "-1" : "1") + "\n");
	}

	for (var n = 0; n < needles.length; n++){
		code += ("xfer "  + secondBed + (needles[n] + (direction == "+" ? 1 : -1)) + " " + bed + (needles[n] + (direction == "+" ? 2 : -2)) + "\n");
	}

	code += ("rack 0" + "\n");

	return code;
}


function setup(){
	let code = "";
	code += (";!knitout-2" + "\n");
	code += (";;Carriers: 1 2 3 4 5 6 7 8 9 10" + "\n");
	return code;
}

function doCastOn(val, carrier){
	let code = "";
	code += ("inhook " + carrier + "\n");
	let min = maxWidth - val;
	let max = maxWidth + val;
	//cast-on on the front bed first...
	for (let n = max; n >= min; --n) {
		if ((max-n) % 4 == 0) {
			code += ("tuck - f" + n + " " + carrier + "\n");
		}
	}
	for (let n = min; n <= max; ++n) {
		if ((max-n) % 4 == 2) {
			code += ("tuck + f" + n + " " + carrier + "\n");
		}
	}

	//and then on the back bed
	for (let n = max; n >= min; --n) {
		if ((max-n) % 4 == 0) {
			code += ("tuck - b" + n + " " + carrier + "\n");
		}
	}
	for (let n = min; n <= max; ++n) {
		if ((max-n) % 4 == 2) {
			code += ("tuck + b" + n + " " + carrier + "\n");
		}
	}

	code += ("miss + f" + max + " " + carrier + "\n");

	code += ("releasehook " + carrier + "\n");

	for (var i = 0; i < 2; i++){
		if (i % 2 == 0) {
			for (let n = max; n >= min; --n) {
				//remember we're knitting on every other needle
				if (n % 2 == 0){
					code += ("knit - f" + n + " " + carrier + "\n");
				}
			}
		} else {
			for (let n = min; n <= max; ++n) {
				if (n % 2 == 0){
					code += ("knit + b" + n + " " + carrier + "\n");
				}
			}
		}
	}

	return code;
}





function doRequest(file, callback){

	fs.readFile( file, function(err, data) {
	  var json = JSON.parse(data);

	  callback(json);
	});

}



function writeFile(code, city){
	//write to file
	fs.writeFile("./../knitout-backend-swg/examples/in/country_weather_" + city + ".knitout", code, function(err) {
	    if(err) {
	        return console.log(err);
	    }

	    console.log("The file was saved!");
	}); 
}
