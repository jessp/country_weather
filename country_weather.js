const fs = require('fs');
const http = require('http');

let country = "NOR";
getWeather(country);



var tempArray, precipArray;
var totalHeight = 120; //multiple of 12
var maxWidth = 20;
var minWidth = 4;
var index = 0;
let segmentHeight = totalHeight/12;


function getWeather(country){
	doRequest(country, true, (e) => doNextStep(e, "temp"));
	doRequest(country, false, (e) => doNextStep(e, "precip"));
}

function doNextStep(newVal, type){

	if (type === "temp"){
		tempArray = newVal;
	} else if (type === "precip"){
		precipArray = newVal;
	}

	if (tempArray && precipArray){
		makeShape();
	}
	
}

function scale(num, in_min, in_max, out_min, out_max) {
	let mappedNum = (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
	let evenNum = 2 * Math.round(mappedNum / 2);
  	return evenNum;
}

function makeShape(){
	let kCode = "";

	let minVal = Math.min(...tempArray[0]["monthVals"]);
	let maxVal = Math.max(...tempArray[0]["monthVals"]);
	let meanPrecipiation = precipArray[0]["monthVals"].reduce((sume, el) => sume + el, 0) / precipArray[0]["monthVals"].length;


	let newArray = [];
	for (var i = 0; i < tempArray[0]["monthVals"].length; i++){
		let newNum = scale(tempArray[0]["monthVals"][i], minVal, maxVal, minWidth, maxWidth);
		newArray.push(newNum);
	}
	kCode += setup();

	let min = 0;
	let max = maxWidth;

	
	kCode += doCastOn(newArray[0], "3");
	kCode += introduceOtherCarrier(newArray[0], "2");
	

	for (var i = 0; i < newArray.length; i++){
		let startTube = newArray[i];
		let endTube = newArray[(i+1)%newArray.length];
		let carrier = precipArray[0]["monthVals"][i] > meanPrecipiation ? "3" : "2"; 

		if (endTube > startTube) {
			kCode += makeWider(startTube, endTube, carrier);
		} else if (endTube == startTube){

			kCode += makeTube(startTube, endTube, carrier);
		} else {
			kCode += makeNarrower(startTube, endTube, carrier);
		}
	}
	
	kCode += doCastOff("3");
	kCode += doCastOff("2");

	writeFile(kCode, country);

}

function introduceOtherCarrier(val, carrier){
	let code = "";
	code += ("inhook " + carrier + "\n");
	let min = maxWidth - val;
	let max = maxWidth + val;
	//cast-on on the front bed first...
	for (let n = max; n >= min; --n) {
		if ((max-n) % 2 == 0) {
			code += ("knit - f" + n + " " + carrier + "\n");
		}
	}
	for (let n = min; n <= max; ++n) {
		if ((max-n) % 2 == 2) {
			code += ("knit + f" + n + " " + carrier + "\n");
		}
	}

	//and then on the back bed
	for (let n = max; n >= min; --n) {
		if ((max-n) % 2 == 0) {
			code += ("knit - b" + n + " " + carrier + "\n");
		}
	}
	for (let n = min; n <= max; ++n) {
		if ((max-n) % 2 == 2) {
			code += ("knit + b" + n + " " + carrier + "\n");
		}
	}

	code += ("miss + f" + max + " " + carrier + "\n");

	code += ("releasehook " + carrier + "\n");

	return code;

}

function doCastOff(carrier){
	let code = "";
	code += ("outhook " + carrier + "\n");
	return code;
}

function makeWider(_min, _max, carrier){
	let code = "";

	let startingMin = maxWidth - _min;
	let startingMax = maxWidth + _min;

	let endingMin = maxWidth - _max;
	let endingMax = maxWidth + _max;

	var actingMin = startingMin;
	var actingMax = startingMax;

	let numDecreases = Math.ceil(segmentHeight/(_max - _min));
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

		index ++;
	}

	return code;
}

function makeTube(_min, _max, carrier){
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
		index ++;
	}
	return code;
}

function makeNarrower(_min, _max, carrier){
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
function rack(needles, bed, direction){
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

	return code;
}





function doRequest(country, isTemp, callback){
	let url = "http://climatedataapi.worldbank.org/climateweb/rest/v1/country/mavg/bccr_bcm2_0/" + (isTemp ? "tas" : "pr") + "/1980/1999/" + country + ".json";
	
	getData(url, callback);
}



function getData(url, callback){
	http.get(url, (resp) => {
	  let data = '';

	  // A chunk of data has been recieved.
	  resp.on('data', (chunk) => {
	    data += chunk;
	  });

	  // The whole response has been received. Print out the result.
	  resp.on('end', () => {
	    callback(JSON.parse(data));
	  });

	}).on("error", (err) => {
	  console.log("Error: " + err.message);
	});
}


function writeFile(code, country){
	//write to file
	fs.writeFile("./../knitout-backend-swg/examples/in/country_weather_" + country + ".knitout", code, function(err) {
	    if(err) {
	        return console.log(err);
	    }

	    console.log("The file was saved!");
	}); 
}
