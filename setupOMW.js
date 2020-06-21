#!/usr/bin/env node
const _ = require('lodash');
const fs = require('fs');
const readline = require('readline');
const sqlite3 = require('sqlite3').verbose();

//Make the database and run it serially
var db = new sqlite3.Database('wordnet.dict');
db.serialize(function () {
    db.run("BEGIN TRANSACTION");

    //Prepare the insert statement
    var stmt = db.prepare("UPDATE words SET fr = IFNULL(fr || ' ; ' || ?, ?) WHERE id = ?;");

    //Read each line of the file
    var rl = readline.createInterface({input: fs.createReadStream('omw/fra/wn-data-fra.tab')});

    var rows = 0;

    rl.on('line', function (line) {
        var sections = line.split(/ /);
        stmt.run(sections[1], sections[1], sections[0]);
        rows++;
    });

    rl.on('close', function () {
      stmt.finalize(()=>{
          db.run("END");
          db.exec("VACUUM");
          db.close();
      });
    });
});
