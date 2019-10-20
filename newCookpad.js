const https = require("https");
const {Client} = require("pg");
const client = new Client({//postgres connection data
user: 'postgres',
password: 'some password',
database: 'Recipes'});

const baseUrl = "https://cookpad.com/recipe/";
const searchQuery = "SELECT * FROM cookpad WHERE ID = $1"; //base query for searching db for if recipe is inside already
const insertQuery = "INSERT INTO cookpad VALUES($1, $2, $3, $4)"; //base query for inserting new recipe
//constants for postgres qeuries, http request
//var recipeID = 1943493; //starting point for url identifier, recipe ID
var recipeID = 1;
const connection =  client.connect(err => { //start postgres db connection
	if (err) {
		console.log('oops!\n', err.stack)}
	else {
		console.log('connection success!')}
});


function doSomething() {
return new Promise ((resolve, reject) => {
    let insertQuery = [];
    https.get(baseUrl + recipeID,  response => {
        let body = "";
        response.on('data', data=> {
            body += data;
        });
        response.on('end', () => {
            if (body.indexOf("not_found") < 0) {//do stuff if the page exists basically
                let createCount = 0;
                let ingredientArray = [];
                let recipeName = body.substring(body.indexOf("<title>") + 7, body.indexOf("by")).trim();
                let createCountIndexFirst = body.indexOf("class='count");
                let tempString = body.substring(createCountIndexFirst + 15, createCountIndexFirst + 25);
                while (tempString.length > 0) { //get createCount
                    if (tempString.charAt(0) <= 9 && tempString.charAt(0) >= 0) {//if currChar is a number
                        createCount += tempString.charAt(0);
                    }
                    tempString = tempString.substring(1);
                }
                createCount = createCount.trim(); //end get createCount
		if(body.indexOf("'ingredient_name'") == -1) {
			reject("No ingredients");
		}
            while (body.indexOf("'ingredient_name'") != -1) { //for each ingredient, extract from body
                let secondIndex = body.indexOf("ingredient_quantity");
                let ingredient = body.substring(body.indexOf("'ingredient_name'") + 37,
                secondIndex -26);
                if (ingredient.length > 30) {//outlier case use
                    ingredient = ingredient.substring(ingredient.lastIndexOf("%") + 5);
                    ingredient = ingredient.substring(0, ingredient.indexOf("<"));
                }
                body = body.substring(secondIndex + 30);//flush out ingredient
                ingredientArray.push(ingredient);//add each ingredient to the array
            }
            insertQuery = [recipeName, ingredientArray, createCount, recipeID];
            console.log(insertQuery);
            //return new Promise((resolve, reject) => {
                resolve(insertQuery);
            //})
        }
        reject("No page data");//reject and move on
        })
    })
})
.then((output) => {//validate data not already present
    console.log("Preparing to search for " + output[3]);
    let insert = [recipeID];
    return (client.query(searchQuery, insert)
          .then(res => {
            if (!res.rows[0]) {
		console.log("step 1");
               return output;
            }
	   return [0];
          })
          .catch(err => console.log(err.stack))
    );
})
.then((insoutput) => {
    if (insoutput == 0) {
	throw "Recipe already inserted";
    }
    console.log("Preparing to insert " + insoutput);
    client.query(insertQuery, insoutput, (err, res) => {
        if (err) {
            console.log("Insertion fail " + err.stack);
    }
	else {
	    console.log("Entered recipe " + recipeID);
	}})
})
.catch(err => {
    console.log(err);
})
.finally(() => {
    recipeID += 1;
    if(recipeID < 100) {
        doSomething();
    }
    else{
	client.end();
	console.log("Ended with recipe " + (recipeID - 1));
    }
});
}
doSomething();