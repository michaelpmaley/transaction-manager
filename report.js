import csvjson from 'csvjson';
import fs from 'fs';
import os from 'os';
import path from 'path';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
dayjs.extend(utc);

const DATABASEFILE = path.join(os.homedir(), 'Documents', 'Financial', 'transactions.csv');
const CURRENCYFORMATTER = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD' });

(async () => {

   const database = csvjson.toObject(fs.readFileSync(DATABASEFILE).toString(), {delimiter: ',', quote: '"'});

   const accountIds = [...new Set(database.map(i => i.accountId).sort())];
   const accountBalances = new Map(accountIds.map(i => [i, 0]));
   const accountTransactionCounts = new Map(accountIds.map(i => [i, 0]));

   database.forEach(transaction => {
      accountBalances.set(transaction.accountId, accountBalances.get(transaction.accountId) + parseFloat(transaction.amount));
      accountTransactionCounts.set(transaction.accountId, accountTransactionCounts.get(transaction.accountId) + 1);
   });

   let totalBalance = 0;
   let totalCount = 0;
   console.log(`${"ACCOUNTS ".padEnd(40, '=')}`);
   accountIds.forEach((accountId) => {
      let name = accountId.includes("|") ? "Amex" : "Chase";
      let balance = accountBalances.get(accountId);
      totalBalance += balance;
      let count = accountTransactionCounts.get(accountId);
      totalCount += count;
      console.log(`${name.padEnd(8)} ${CURRENCYFORMATTER.format(balance).padStart(13)} ${count.toString().padStart(8)}`);
   });
   console.log(`         ------------- --------`);
   console.log(`         ${CURRENCYFORMATTER.format(totalBalance).padStart(13)} ${totalCount.toString().padStart(8)}`);
   console.log(`\n\n`);

})();
