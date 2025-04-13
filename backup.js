import fs from 'fs';
import os from 'os';
import path from 'path';

const DATABASEFILE = path.join(os.homedir(), 'Documents', 'Financial', 'transactions.csv');
const DATABASEBAKFOLDER = path.join(os.homedir(), 'Documents', 'Backups', 'transaction-manager');
const DATABASEBAKFILE = path.join(DATABASEBAKFOLDER, `transactions-backup-${Date.now().toString()}.csv`);

(async () => {

   // backup database
   fs.copyFileSync(DATABASEFILE, DATABASEBAKFILE);

})();
