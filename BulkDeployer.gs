const SS_ID = '1JYRe9U6HcuKekZY7IV3L-AtBKv5qktcqhr0_fYNeE_Y';

function getOAuthService() {
  return OAuth2.createService('appsScript')
    .setAuthorizationBaseUrl('https://accounts.google.com/o/oauth2/auth')
    .setTokenUrl('https://accounts.google.com/o/oauth2/token')
    .setClientId(GOOGLE_CLIENT_ID) // <-- Replace with your client ID
    .setClientSecret(GOOGLE_CLIENT_SECRET) // <-- Replace with your client secret
    .setCallbackFunction('authCallback')
    .setPropertyStore(PropertiesService.getUserProperties())
    .setScope('https://www.googleapis.com/auth/script.projects https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive');
}

function authCallback(request) {
  var service = getOAuthService();
  var authorized = service.handleCallback(request);
  if (authorized) {
    return HtmlService.createHtmlOutput('Success! You can close this tab.');
  } else {
    return HtmlService.createHtmlOutput('Denied. You can close this tab.');
  }
}

function authorize() {
  var service = getOAuthService();
  if (!service.hasAccess()) {
    var authorizationUrl = service.getAuthorizationUrl();
    Logger.log('Open the following URL and re-run the script: %s', authorizationUrl);
    console.log('Open the following URL and re-run the script:\n' + authorizationUrl);
    return false;
  }
  return true;
}

function deployToClientViaAPI(scriptId, libraryId) {
  updateScriptWithLibraryAndMenuAPI(scriptId, libraryId);
}

function bulkDeployToScriptIds() {
  if (!authorize()) return;
  const scriptIds = getClientScriptIds();
  const libraryId = getLibraryIdFromSheet();
  let results = [];
  for (const scriptId of scriptIds) {
    try {
      if (!scriptId) {
        throw new Error('scriptId is undefined or empty for this row.');
      }
      updateScriptWithLibraryAndMenuAPI(scriptId, libraryId);
      results.push('✅ ' + scriptId);
    } catch (e) {
      results.push('❌ ' + scriptId + ' - ' + e.message);
    }
  }
  Logger.log('Results:\n' + results.join('\n'));
}

function getLibraryVersionFromSheet() {
  const sheet = SpreadsheetApp.openById(SS_ID).getSheetByName('Deployment Config');
  if (!sheet) throw new Error('The "Deployment Config" sheet does not exist');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'VERSION') {
      return data[i][1];
    }
  }
  throw new Error('VERSION not found in Deployment Config');
}

function updateScriptWithLibraryAndMenuAPI(scriptId, libraryId) {
  var service = getOAuthService();
  var version = getLibraryVersionFromSheet();
  var manifest = { timeZone: 'America/New_York', dependencies: { libraries: [] }, exceptionLogging: 'STACKDRIVER' };
  var lib = {
    libraryId: libraryId,
    userSymbol: 'PROSPR',
    version: version,
    developmentMode: false
  };
  manifest.dependencies.libraries = [lib];
  var code = `
function onOpen() {
  PROSPR.createAdminMenu();
}

function generateComparativeReport() {
  PROSPR.generateComparativeReport();
}

function showHelpDialog() {
  PROSPR.showHelpDialog();
}

function resetAdminAccess() {
  PROSPR.resetAdminAccess();
}

function showSessionInfo() {
  PROSPR.showSessionInfo();
}

function sendReportEmail() {
  PROSPR.sendReportEmail();
}
`;
  var url = 'https://script.googleapis.com/v1/projects/' + scriptId + '/content';
  var options = {
    method: 'PUT',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + service.getAccessToken() },
    payload: JSON.stringify({
      files: [
        { name: 'Code', type: 'SERVER_JS', source: code },
        { name: 'appsscript', type: 'JSON', source: JSON.stringify(manifest, null, 2) }
      ]
    }),
    muteHttpExceptions: true
  };
  var response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() !== 200) {
    throw new Error('Failed to update script: ' + response.getContentText());
  }
}

function getLibraryIdFromSheet() {
  const sheet = SpreadsheetApp.openById(SS_ID).getSheetByName('Deployment Config');
  if (!sheet) throw new Error('The "Deployment Config" sheet does not exist');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'LIBRARY_ID') {
      return data[i][1];
    }
  }
  throw new Error('LIBRARY_ID not found in Deployment Config');
}

function getClientScriptIds() {
  const sheet = SpreadsheetApp.openById(SS_ID).getSheetByName('Client URLs');
  if (!sheet) throw new Error('The "Client URLs" sheet does not exist');
  const data = sheet.getDataRange().getValues();
  return data.slice(1).map(r => r[2]).filter(Boolean);
}