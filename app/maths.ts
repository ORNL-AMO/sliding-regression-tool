function getCombinations(array) {
    const results = [[]];
    for (const value of array) {
        const copy = [...results];
        for (const prefix of copy) {
            results.push(prefix.concat(value));
        }
    }
    return results.slice(1);
}

function modelCheck(independentCombinations, model, i, j, len) {
    //1. The p-value for the overall model fit must be less than 0.10
    if (model[i + "pValue"][j] < .1) {
        var test = false;
        //2. All independent variables included in the model must have a p-value of less than 0.20
        for (var k = 0; k < len; k++) {
            if (model[i + independentCombinations[i][k] + "pvalue"][j] >= .2) return false;
            if (!test && model[i + independentCombinations[i][k] + "pvalue"][j] < .1) test = true;
        }
        //3. At least one of the independent variables in the model must have a p-value of less than 0.10
        if (test) {
            // 4. The adjusted R2 for the regression must be at least 0.50
            return model[i + "adjustedRSquare"][j] >= .5;
        }
    } 
    return false;
}

//TODO Needs work
function findResults(json, dependentNumber){

    console.log(json);

    var table = {
        combinations: [],
        results: [],
        savings: []
    }

    var independents = [];

    var independentKeys = Object.keys(json.independent);
    var dependentKeys = Object.keys(json.dependent);
    var dateKeys = Object.keys(json.date);

    Object.keys(json.independent).forEach(function(key, index) {
        independents.push(key);
    });

    var independentCombinations = getCombinations(independents);

    table.combinations = independentCombinations;

    var rows = json.date.Date.length;
    var col = independentCombinations.length;
    var totalResult = [];

    var calc = require('./app/regression_calc.js');

    for(var i = 0; i < col; i++){
        var result = [];
        var variables = [];

        for(var k = 0; k < independentCombinations[i].length; k++){
            variables[k] = independentCombinations[i][0];
        }

        //TODO
        var results = {
            Date: [],
        };
        results["rSquare"] = [];
        results[i + "rSquare"] = [];
        results[i + "adjustedRSquare"] = [];
        results["comboNumber"] = [];
        results[i + "Intercept"] = [];
        results[i + "fittedModel"] = [];
        results[i + "pValue"] = [];
        results["model" + i] = [];

        for(var k = 0; k < independentCombinations[i].length; k++){
            results[i + independentCombinations[i][k] + "Coeff"] = [];
            results[i + independentCombinations[i][k] + "pvalue"] = [];
        }

        for(var j = 0; j < (rows - 11); j++) {
            var dependent = json.dependent[dependentKeys[dependentNumber]].slice(j, j + 12);
            var independentVariables = [];
            var independentNames = [];

            for(var k = 0; k < independentCombinations[i].length; k++) {
                independentVariables[k] = json.independent[independentCombinations[i][k]].slice(j, j + 12);
                independentNames[k] = independentCombinations[i][k];
            }
            var model = calc.calc3(5, dependent, independentVariables, independentNames);

            results.Date[j] = json.date[dateKeys[0]][j];

            results["rSquare"][j] = model.rSquare;
            results[i + "rSquare"][j] = model.rSquare;
            results[i + "adjustedRSquare"][j] = model.adjRSquare;
            results["comboNumber"][j] = i;
            results[i + "Intercept"][j] = model.intercept;
            results[i + "pValue"][j] = model.pValue;

            for(var n = 0; n < independentCombinations[i].length; n++){
                results[i + independentCombinations[i][n] + "Coeff"][j] = model.params[n];
                results[i + independentCombinations[i][n] + "pvalue"][j] = model.coeffPVals[n];
            }

            results[i + "fittedModel"][j] = model.fittedModel;
            results["model" + i][j] = (modelCheck(independentCombinations, results, i, j, independentCombinations[i].length) ? "Pass" : "Fail");
        }

        totalResult[i] = results;
    }

    table.results = totalResult;

    console.log(table);

    return table;

}

function findSavings(json, table, dependentNumber){

    var rows = json.date.Date.length;
    var independentKeys = Object.keys(json.independent);
    var dependentKeys = Object.keys(json.dependent);
    var independents = [];

    Object.keys(json.independent).forEach(function(key, index) {
        independents.push(key);
    });

    var dependent = dependentKeys[dependentNumber];

    var year = document.getElementById(dependent + "-model-year-selector").value;
    var model = document.getElementById(dependent + "-model-selector").value;
    var savings = [];

    savings["Total Actual " + dependent] = [];
    savings["Total Model " + dependent] = [];
    savings["%Savings"] = [];

    for(var i = 0; i < (rows - 11); i++) {
        savings["Total Model " + dependent][i] = 0;
        var sum = 0;
        for(var j = 0; j < 12; j++){
            sum += Number((json.dependent[dependent].slice(i, i + 12))[j])
        }

        for(var k = 0; k < table.combinations[model].length; k++){
            var independentSum = 0;

            for(var j = 0; j < 12; j++){
                independentSum += Number((json.independent[table.combinations[model][k]].slice(i, i + 12))[j][0])
            }
            //console.log(totalResult[model][independents[k] + "Coeff" + model] [year]);

            //json.independent[independentKeys[i]][year] *
            savings["Total Model " + dependent][i] += table.results[model][table.combinations[model][k] + "Coeff" + model][year] * independentSum;
        }

        savings["Total Model " + dependent][i] += table.results[model]["Intercept" + model][year] * 12;
        savings["Total Actual " + dependent][i] = sum;

        savings["%Savings"][i] = ((1 - ((savings["Total Model " + dependent][0] * savings["Total Actual " + dependent][i]) / (savings["Total Actual " + dependent][0] * savings["Total Model " + dependent][i])))*100).toFixed(2) + "%";
    }

    table.savings = savings;

    return table;
}


function findSavingsPoint(json, table, dependentNumber, year, model){

    var rows = json.date.Date.length;
    var independentKeys = Object.keys(json.independent);
    var dependentKeys = Object.keys(json.dependent);
    var independents = [];

    Object.keys(json.independent).forEach(function(key, index) {
        independents.push(key);
    });

    var dependent = dependentKeys[dependentNumber];

    var savings = [];

    savings["Total Actual " + dependent] = [];
    savings["Total Model " + dependent] = [];
    savings["%Savings"] = [];

    for(var i = 0; i < (rows - 11); i++) {
        savings["Total Model " + dependent][i] = 0;
        var sum = 0;
        for(var j = 0; j < 12; j++){
            sum += Number((json.dependent[dependent].slice(i, i + 12))[j])
        }

        for(var k = 0; k < table.combinations[model].length; k++){
            var independentSum = 0;

            for(var j = 0; j < 12; j++){
                independentSum += Number((json.independent[table.combinations[model][k]].slice(i, i + 12))[j][0])
            }
            //console.log(totalResult[model][independents[k] + "Coeff" + model] [year]);

            //json.independent[independentKeys[i]][year] *
            savings["Total Model " + dependent][i] += table.results[model][model + table.combinations[model][k] + "Coeff"][year] * independentSum;
        }

        savings["Total Model " + dependent][i] += table.results[model][model + "Intercept"][year] * 12;
        savings["Total Actual " + dependent][i] = sum;

        savings["%Savings"][i] = Number(((1 - ((savings["Total Model " + dependent][0] * savings["Total Actual " + dependent][i]) / (savings["Total Actual " + dependent][0] * savings["Total Model " + dependent][i])))).toFixed(4)) * 100;
    }

    return savings;
}

function findSavingsLine(displayJsons) {

    var savingsLines = [];

    for(var i = 0; i < displayJsons.length; i++){
        savingsLines[i] = [];
        for(var j = 0; j < displayJsons[i].length; j++){
            savingsLines[i][j] = [];
            for(var k = 0; k < displayJsons[i][j].length; k++){
                savingsLines[i][j][k] = displayJsons[i][j][k]["savings"]["%Savings"][displayJsons[i][j][k]["savings"]["%Savings"].length-1];
            }
        }
    }

    console.log(savingsLines);

    return savingsLines;
}

/*
function findSavingsLine(table, json, dependentNumber){

    console.log(table);
    console.log(json);

    var savings = [];
    var rows = json.date.Date.length;

    var modelEnergyBaselines = [];
    var modelEnergySavings = [];

    for(var i = 0; i < table["combinations"].length; i++) {
        var independentKeys = Object.keys(table["combinations"][i]);
        modelEnergyBaselines[i] = [];

        for(var k = 0; k < (rows - 11); k++){
            var modelEnergyBaseline = 0;
            for (var j = 0; j < independentKeys.length; j++) {

                var sum = 0;
                for(var z = 0; z < 12; z++){
                    sum += Number((json.independent[table["combinations"][i][j]].slice(0, 12))[z])
                }
                modelEnergyBaseline += (table["results"][i][table["combinations"][i][j]+"Coeff"+i][k] * sum);
            }
            modelEnergyBaselines[i][k] = modelEnergyBaseline;
        }
    }

    for(var i = 0; i < table["combinations"].length; i++) {
        var independentKeys = Object.keys(table["combinations"][i]);
        modelEnergySavings[i] = [];

        for(var k = 0; k < (rows - 11); k++){
            var modelEnergySaving = 0;
            for (var j = 0; j < independentKeys.length; j++) {

                var sum = 0;
                for(var z = 0; z < 12; z++){
                    sum += Number((json.independent[table["combinations"][i][j]].slice((rows - 12), (rows - 12) + 12))[z]);
                }
                modelEnergySaving += (table["results"][i][table["combinations"][i][j]+"Coeff"+i][k] * sum);
            }
            modelEnergySavings[i][k] = modelEnergySaving;
        }
    }

    var lines = [];


    console.log(modelEnergyBaselines);
    console.log(modelEnergySavings);
}
*/