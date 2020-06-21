#!/usr/bin/env node
var sqlite3 = require('sqlite3').verbose();
var fs = require('fs');
var readline = require('readline');

//Make the database and run it serially
var db = new sqlite3.Database('wordnet.dict');
db.serialize(function () {

    //Create the main table
    db.run("DROP TABLE IF EXISTS words");
    db.run("CREATE TABLE words (id TEXT, word TEXT, definition TEXT, type TEXT)");
    db.run("CREATE INDEX id_idx ON words (id ASC)");
    db.run("BEGIN TRANSACTION");

    //Prepare the insert statement
    var stmt = db.prepare("INSERT INTO words VALUES (?, ?, ?, ?)");

    //For each input file
    var types = ["adj", "adv", "noun", "verb"];
    const typeCodes = {
        adj: 'a',
        adv: 'r',
        noun: 'n',
        verb: 'v',
    }
    var counter = 0;

    types.forEach(function (type) {

        //Read each line of the file
        var rl = readline.createInterface({input: fs.createReadStream('raw_dict/data.' + type)});

        var rows = 0;

        //Find the relevant variables and insert them
        rl.on('line', function (line) {
            //Skip the comment lines
            if (line.substr(0, 2) === "  ")
                return;

            //Split the line to find relevant variables
            var sections = line.split(/\s+\|\s+/);
            var cols = sections[0].split(/\s/);
            var words = cols
                .filter(col => col.match(/^[^\d!"#$%&'()\*\+\-\.,\/:;<=>?@\[\\\]^_`{|}~]/gm)) // doesn't start with number or special letter
                .filter(col => col.length > 1); // has two or more charactors
            var id = cols[0] + '-' + typeCodes[type];
            //Preserve cols[4] which always has a vaild meaning
            if(words.indexOf(cols[4]) === -1){
                words.push(cols[4])
            }
            var definitions = sections[1].split(/;/);
            words.forEach(word => stmt.run(id, word, definitions[0], type));
            rows++;
        });

        rl.on('close', function () {
            counter++;
            if (counter >= types.length) {
                stmt.finalize(()=>{
                    db.run("END");
                    db.exec("VACUUM");
                    db.close();
                });
            }
        });
    });
});
