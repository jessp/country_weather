var fs = require('fs');
var Path = require('path');

function getFilenames(path, extension) {
    return fs
        .readdirSync(path)
        .filter(
            item =>
                fs.statSync(Path.join(path, item)).isFile() &&
                (extension === undefined || Path.extname(item) === extension)
        )
        .sort();
}

function getThresh(){
	var count = 0;
	let precipArray = [];
	let tempArray = [];
	const filenames = getFilenames("./formatted_data", ".json");
	const finalCount = filenames.length;

	function pushAndApply(a, b){
		count++;
		precipArray = precipArray.concat(a);
		tempArray = tempArray.concat(b);
		if (count == 4){
			processThresh(precipArray, tempArray);
		}
	}

	for (var i = 0; i < filenames.length; i++){
		readFile("./formatted_data/" + filenames[i], (a, b) => pushAndApply(a, b) );
	}

}

function processThresh(pArray, tArray){
	let tempMin = Math.min(...tArray);
	let tempMax = Math.max(...tArray);
	let q33 = quantile(pArray, .33);
	let q67 = quantile(pArray, .67);

	let thresh = {
		"temp": [tempMin, tempMax],
		"precip": [q33, q67]
	}
	writeThreshToFile(thresh);
}

function writeThreshToFile(data){
	fs.writeFile("./thresholds.json", JSON.stringify(data), function(err) {
	    if(err) {
	        return console.log(err);
	    }

	    console.log("The file was saved!");
	}); 
}


//from https://stackoverflow.com/a/55297611/3899852
const asc = arr => arr.sort((a, b) => a - b);
const sum = arr => arr.reduce((a, b) => a + b, 0);
const mean = arr => sum(arr) / arr.length;


// sample standard deviation
const std = (arr) => {
    const mu = mean(arr);
    const diffArr = arr.map(a => (a - mu) ** 2);
    return Math.sqrt(sum(diffArr) / (arr.length - 1));
};

const quantile = (arr, q) => {
    const sorted = asc(arr);
    const pos = ((sorted.length) - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if ((sorted[base + 1] !== undefined)) {
        return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    } else {
        return sorted[base];
    }
};


function readFile(file, callback){
	fs.readFile( file, function(err, data) {
	  var json = JSON.parse(data);

	  callback(json["precipArray"], json["tempArray"]);
	});
}

getThresh();