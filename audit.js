import csvjson from 'csvjson';
import fs from 'fs';
import os from 'os';
import path from 'path';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
dayjs.extend(utc);
//const stringSimilarity = require("string-similarity");
import stringSimilarity from 'string-similarity';

const DATABASEFILE = path.join(os.homedir(), 'Documents', 'Financial', 'transactions.csv');
const CATEGORYLIST = ["Activities & Entertainment","Auto & Transport","Balance","Bills & Utilities","Business Services","Fees & Charges","Food & Dining","Gifts & Donations","Healthcare","Home","Income","Misc Expense","Personal Care","Shopping","Taxes","Transfer","Travel", "UNKNOWN"];

(async () => {

   const database = csvjson.toObject(fs.readFileSync(DATABASEFILE).toString(), {delimiter: ',', quote: '"'});

   console.log(`CATEGORIES ========================================`);
   const categories = [...new Set(database.map(i => i.category).sort())];
   categories.forEach(category => {
      // console.log(category);
      if (CATEGORYLIST.indexOf(category) === -1) {
         console.log(`INCORRECT: ${category}`);
      }
   });
   console.log("\n\n");

   console.log(`PAYEES ========================================`);
   const payees = [...new Set(database.map(i => i.payee).sort())];
   payees.forEach(payee => {
      const payeeCategories = [...new Set(database.filter(i => i.payee === payee).map(i => i.category).sort())];
      if (payeeCategories.length > 1) {
         console.log(`MULTIPLE: ${payee}: ${payeeCategories}`);
      }
   });
   console.log(`\n`);
   payees.forEach(payee => {
      var matches = stringSimilarity.findBestMatch(payee, payees);
      matches.ratings.forEach(match => {
         if (match.rating > .7 && match.rating != 1 && match.target.indexOf('airport') == -1) {
            console.log(`SIMILIAR: ${payee} ~= ${match.target}`);
         }
      });
   });
   console.log(`\n\n`);

   console.log(`TRANSACTIONS ========================================`);
   database.forEach(transaction => {
      if (transaction.category === 'UNKNOWN') {
         console.log(`UNMAPPED: ${transaction.date}, ${transaction.payee}, ${transaction.amount}, ${transaction.notes}`);
      }
      let p = transaction.amount.split('.');
      if (p[1].length != 2) {
         console.log(`ODD: ${JSON.stringify(transaction)}`);
      }
   });
   console.log(`\n\n`);

})();
