var wordsInSentence = [],
	sentenceListIndex = 0,
	theList = [],
	sentenceToTest = "Incandiferous",
	findAnswerCalled;




function buildListOfSentences(source) {
	console.log("buildListOfSentences() called");
	
	//theList = [];
	
	source.results.forEach(function(item, index) {
		theList.push(item.abstract);
	});
	
	//In case a result is not returned from NYT
	if(theList!=undefined) {
		findSentence(theList);
	} else {
		alert("theList is empty. This means the NYT API call was unsuccessful. Page will refresh. Try again."); 
		location.reload(true); 
		return;
	}
	
}

function findSentence(listOfSentences) {
	console.log("findSentence called");
		
	if(sentenceListIndex >= theList.length) {
		alert("End of list. Page will refresh.");
		location.reload(true);
		return;
	}  else {
	
		clearScreen();
		
		var theSentence =  listOfSentences[sentenceListIndex];
		
		//Convert theSentence into a form compatible with the Wordnik API
		format(theSentence);
		
		sentenceListIndex++;
		
		//check if it is one sentence and lacks excess punctuation. return false if so, array if its usable		
		if(canUseSentence(theSentence)) {
			
			sentenceToTest = theSentence;
			//attach metadata to the sentence (Frequency, onlynoun)
			assignDataToWords(wordsInSentence);
			return;
		} else {
				console.log("sentence unusable, trying again");
				
				findSentence(listOfSentences);
		}
	}
}


//Convert theSentence into a form compatible with the Wordnik API
function format(sentence) {
	console.log("format() called with: " + sentence);
	
	
	//Turn it into an array
	wordsInSentence = sentence.split(" ");
	
	//Turn each item into an object with important characteristics for each word
	wordsInSentence.forEach(function(item, index) {
			wordsInSentence[index] = {"position": index,
			"word": item,
			"onlynoun": true,
			"frequency": 0,
			"frequencyreturned": false,
			"onlynounreturned": false,
			"theanswer": false
	}});
	
		//Punctuation handling on the Wordnik API is inconsistent. I can't just strip off all the punctuation, so these checks should fix those inconsistencies. The trickiest cases are apostrophes. Possessive apostrophes are not returned and can render a word unreadable by the API, and contracting apostrophes are necessary to identify the word. (Compare "party's" and "won't") 
		
	//Remove Apostrophes and capitals. 
	wordsInSentence = wordsInSentence.filter(function(item) {
		var pattern = new RegExp("[,’A-Z]");
		if(!pattern.test(item.word)) {return item}
	});

	//Remove the final period. Because I already ruled out using any sentences that might end in ! or ? I can just assume theres a period at the end. The other periods will be for titles and abbreviations, and I can keep those.
	wordsInSentence[wordsInSentence.length-1].word = wordsInSentence[wordsInSentence.length-1].word.replace(".","");
}


//Try to determine if the sentence will work with the program (Both my functions and Wordnik)
function canUseSentence(string) {
	
	console.log("canUseSentence called with: " + string);
	var theLetters = string.toLowerCase().split(""),
		pattern = /[a-z.\s\,\’]/;
	
	for(var i = 0; i < theLetters.length; i++) {
		
		//If it has punctuation besides ' , or . the sentence is disqualified
		if(!pattern.test(theLetters[i])) {return false;}
		
		//Is it one sentence? (Are there titles like "Mr." or abbreviated acronyms?)
		//This could stand to be beefed up with catches for several more titles and abbreviations (gov. and u.s.a. for example)
		if(theLetters[i] == "." && i != theLetters.length-1) {
			var title = theLetters[i-2] + theLetters[i-1];
			if(title !="mr" && title != "ms" && title != "dr") {

				return false;
			}
		}
	}
		
	return true;	
	
}

function assignFrequency(data) {
	console.log("assignFrequency called");
	var array = wordsInSentence;
			
	for (var i = 0; i < array.length; i++) {
		//match the returned data to the word in the sentence then update its data
		if(array[i].word == data.word) {
			
			array[i].frequencyreturned = true;
			array[i].frequency = data.totalCount;
			
		}
	
		//check if all the results are in
		var allReturned = true;

		for (var u = 0; u < array.length; u++) {
			if (array[u].frequencyreturned == false) {allReturned = false;}
		}
						
	}
	
	//If theyre all returned, check if assignOnlyNoun is also complete
	if(allReturned) {sentenceComplete(wordsInSentence);}
}

function assignOnlyNoun(data) {
	
	//Despite my sentence formatting, some words are still not playing nice with Wordnik (Like "will" surprisingly enough). This is a shotgun approach to weeding out those troublesome sentences. If for some reason a word returns no data, the sentence is disqualified
	if(data[0] == undefined) {
		findSentence(theList); //restarts the process at the next sentence
		return; 
		} else {
			console.log("assignOnlyNoun called");
			
			var array = wordsInSentence;
			
			array.forEach(function(arrayitem, arrayindex) {
					
					//match the word in the sentence to the server response
					if(array[arrayindex].word == data[0].word) {
					
						//flip the "returned" indicator to help signal when all results are returned
						array[arrayindex].onlynounreturned = true;
						
						//go through data.results to check if the word is only a noun
						data.forEach(function(dataitem, dataindex) {
							if(data[dataindex].partOfSpeech!="noun") {
								array[arrayindex].onlynoun = false;
							}
						});		
					}

			});
		}
		//check if all the results are in
		var allReturned = true;

		for (var u = 0; u < array.length; u++) {

			if (array[u].onlynounreturned == false) {allReturned = false;}
			
		}
						
	
	//If an "onlynoun" word was not found, move on to the next sentence. If it was found, call sentenceComplete to check if frequency check is complete
	var thereIsAnOnlyNoun = false;
	
	if(allReturned) {
		for (var u = 0; u < array.length; u++) {

			if (array[u].onlynoun == true) {thereIsAnOnlyNoun = true;}
			
		}
		if(thereIsAnOnlyNoun) {sentenceComplete(wordsInSentence);} else {findSentence(theList);}
	}
}



function sentenceComplete(array) {
	var allReturned = true;
	//check if frequency and onlynoun are returned
	for(var i = 0; i < array.length; i++) {
		if(array[i].frequencyreturned == false || 
			array[i].onlynounreturned == false) {
				allReturned = false;}
	}
	
	//findAnswerCalled prevents the options from being updated too many times on the DOM
	if(allReturned && !findAnswerCalled) {
		findAnswerCalled = true;
		findAnswer(array);
	}
	
}

function findAnswer(array) {
	var lowestFrequency = 100000,
		rarestWord = "incandiferous";
	
	//Find the word with lowest frequency that is also onlynoun. It will become the answer
	for(var i = 0; i < array.length; i ++) {
		if(array[i].frequency < lowestFrequency && array[i].onlynoun) {
			rarestWord = array[i].word;
			lowestFrequency = array[i].frequency;
		}		
	}
	
	for(var i = 0; i < array.length; i ++) {
		if(array[i].word == rarestWord) {
			array[i].theanswer = true;
			theAnswer = array[i];
		}		
	}
	
	//At this point the array is done. I have the word that should be tested.
	console.log("Everythings done! ");
	
	//Replace the answer with 7 non-line-breaking hyphens then print it to DOM
	sentenceToTest = sentenceToTest.replace(theAnswer.word, "&#8209;&#8209;&#8209;&#8209;&#8209;&#8209;&#8209;");
	update("stem", sentenceToTest);
	
	//Move on to finding distractors
	findDistractors(theAnswer);
}
