/* Web app entry points, one-time setup and scheduled jobs. */

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return json_({ ok: true, service: 'vidyanidhi-api' });
}

function doPost(e) {
  let body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'Bad request', code: 'BAD_REQUEST' });
  }
  return json_(handle(body));
}

/* Run this once from the editor (select "setup" and press Run). Safe to run again after an update:
   it only adds what is missing. */
function setup() {
  const props = PropertiesService.getScriptProperties();

  let ss;
  const existing = props.getProperty('SHEET_ID');
  if (existing) ss = SpreadsheetApp.openById(existing);
  else {
    ss = SpreadsheetApp.create('Vidyanidhi Database (edit through the portal, not by hand)');
    props.setProperty('SHEET_ID', ss.getId());
  }
  ['SESSION_SECRET', 'PEPPER'].forEach((k) => {
    if (!props.getProperty(k)) props.setProperty(k, Utilities.getUuid() + Utilities.getUuid());
  });
  if (!props.getProperty('FOLDER_ID')) props.setProperty('FOLDER_ID', DriveApp.createFolder('Vidyanidhi Documents').getId());
  if (!props.getProperty('BACKUP_FOLDER_ID')) props.setProperty('BACKUP_FOLDER_ID', DriveApp.createFolder('Vidyanidhi Backups').getId());

  Object.keys(SCHEMA).forEach((name) => {
    const cols = Object.keys(SCHEMA[name]);
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getMaxColumns() < cols.length) sh.insertColumnsAfter(sh.getMaxColumns(), cols.length - sh.getMaxColumns());
    const have = sh.getLastColumn() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String).filter(String) : [];
    cols.filter((c) => have.indexOf(c) < 0).forEach((c) => {
      sh.getRange(1, have.length + 1).setValue(c);
      have.push(c);
    });
    sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).setNumberFormat('@');
    sh.getRange(1, 1, 1, have.length).setFontWeight('bold').setBackground('#d9f5ea');
    sh.setFrozenRows(1);
  });
  const blank = ss.getSheetByName('Sheet1');
  if (blank && ss.getSheets().length > 1) ss.deleteSheet(blank);

  seedData(Session.getEffectiveUser().getEmail());

  ScriptApp.getProjectTriggers().forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('jobFlushOutbox').timeBased().everyMinutes(15).create();
  ScriptApp.newTrigger('jobReminders').timeBased().everyDays(1).atHour(9).create();
  ScriptApp.newTrigger('jobBackup').timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(2).create();

  console.log('Setup done. Database: ' + ss.getUrl());
  console.log('Master admin (first Google sign-in): ' + Session.getEffectiveUser().getEmail());
  console.log('Next: Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone) and copy the URL.');
}

/* Weekly copy of the database into the backup folder; keeps the last 8 copies. */
function jobBackup() {
  const props = PropertiesService.getScriptProperties();
  const folder = DriveApp.getFolderById(props.getProperty('BACKUP_FOLDER_ID'));
  const stamp = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
  DriveApp.getFileById(props.getProperty('SHEET_ID')).makeCopy('Vidyanidhi backup ' + stamp, folder);
  const copies = [];
  const it = folder.getFiles();
  while (it.hasNext()) copies.push(it.next());
  copies.sort((a, b) => b.getDateCreated() - a.getDateCreated()).slice(8).forEach((f) => f.setTrashed(true));
}
