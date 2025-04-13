import csvjson from 'csvjson';
import fs from 'fs';
import os from 'os';
import path from 'path';

const DATABASEJS = path.join(os.homedir(), 'Documents', 'Financial', 'transactions.csv');
const DATABASEAPP = path.join(os.homedir(), 'Documents', 'Backups', 'TransactionManager', 'transactions.csv');
const HEADERS = 'date,payee,categoryName,amount,memo,checknum,type,accountId,id,originalPayee,originalMemo';


(async () => {

   const databaseJs = csvjson.toObject(fs.readFileSync(DATABASEJS).toString(), {delimiter: ',', quote: '"'});
   const databaseJsIds = databaseJs.filter(i => i.id !== null && i.id.trim() !== '').map(i => i.id);
   const databaseApp = csvjson.toObject(fs.readFileSync(DATABASEAPP).toString(), {delimiter: ',', quote: '"'});
   const databaseAppIds = databaseJs.filter(i => i.id !== null && i.id.trim() !== '').map(i => i.id);

   console.log(`${databaseJsIds.length}, ${databaseAppIds.length}`);

   databaseJsIds.forEach((id) => {
      var a = databaseJs.find(t => t.id == id);
      var b = databaseApp.find(t => t.id == id);
      if (b == null) {
          console.log(`${a.id} NOT FOUND in app.csv`);
      } else {
         if (a.payee != b.payee) { console.log(`${a.id} PAYEE: ${a.payee} != ${b.payee}`); }
         if (a.categoryName != b.categoryName) { console.log(`${a.id} CAT: ${a.categoryName} != ${b.categoryName}`); }
         if (a.memo != b.memo) { console.log(`${a.id} MEMO: ${a.memo} != ${b.memo}`); }
      }
   });

   databaseAppIds.forEach((id) => {
      var a = databaseJs.find(t => t.id == id);
      var b = databaseApp.find(t => t.id == id);
      if (a == null) {
         console.log(`${b.id} NOT FOUND in js.csv`);
      }
   });

})();
