var fs = require('fs');
var parser = require('xml2json');


//parses xml from http://climate.weather.gc.ca

function parseFile(file, callback){

	fs.readFile( file, function(err, data) {
	  var json = JSON.parse(parser.toJson(data, {reversible: true}));
	  let days = json["climatedata"]["stationdata"];
	  let formattedData = {"tempArray": [], "precipArray":[]};
	  var weekIndex = 0;

	  var actingTempArray = [];
	  var actingPrecipArray = [];

	  for (var i = 0; i < days.length; i++){
	  	if (i % 7 === 0 && i > 0){
	  		weekIndex++;
	  	}
	  	actingTempArray.push(days[i]["meantemp"]["$t"]);
	  	actingPrecipArray.push(days[i]["totalprecipitation"]["$t"]);
	  	if (i % 7 === 0 && i > 0){
	  		formattedData["tempArray"].push(actingTempArray);
	  		actingTempArray = [];
	  		formattedData["precipArray"].push(actingPrecipArray);
	  		actingPrecipArray = [];
	  	}
	  }

	  formattedData["tempArray"] = averageArray(formattedData["tempArray"]);
	  formattedData["precipArray"] = averageArray(formattedData["precipArray"]);

	  callback(formattedData);

	});

}

function averageArray(array){
	let newArray = [];
	for (var i = 0; i < array.length; i++){
		array[i] = array[i].filter(function(d){ return d != undefined});
		array[i] = array[i].map((e) => parseFloat(e));
		array[i] = array[i].reduce((prev, curr) => prev + curr) / array[i].length;

	}
	newArray = array;

	return newArray;

}

function writeData(data, city){
	fs.writeFile("./formatted_data/" + city + ".json", JSON.stringify(data), function(err) {
	    if(err) {
	        return console.log(err);
	    }

	    console.log("The file was saved!");
	}); 
}


function readAndWriteData(file, city){
	parseFile(file, (d) => writeData(d, city));

}

readAndWriteData('./city_data/eng-daily-01012018-12312018.xml', "toronto");
readAndWriteData('./city_data/montreal_eng-daily-01012018-12312018.xml', "montreal");
readAndWriteData('./city_data/van_eng-daily-01012018-12312018.xml', "vancouver");
readAndWriteData('./city_data/yk_eng-daily-01012018-12312018.xml', "yellow_knife");