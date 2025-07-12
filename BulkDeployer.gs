const SS_ID = '1JYRe9U6HcuKekZY7IV3L-AtBKv5qktcqhr0_fYNeE_Y'; // Main control spreadsheet ID

/**
 * Bulk update all client scripts listed in the Client URLs sheet (column C).
 */
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

/**
 * Returns an authorized OAuth2 service for Apps Script API calls.
 */
function getOAuthService() {
  return OAuth2.createService('appsScript')
    .setAuthorizationBaseUrl('https://accounts.google.com/o/oauth2/auth')
    .setTokenUrl('https://accounts.google.com/o/oauth2/token')
    .setClientId(GOOGLE_CLIENT_ID) // <-- Set in your local config, do not commit secrets
    .setClientSecret(GOOGLE_CLIENT_SECRET) // <-- Set in your local config, do not commit secrets
    .setCallbackFunction('authCallback')
    .setPropertyStore(PropertiesService.getUserProperties())
    .setScope('https://www.googleapis.com/auth/script.projects https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive');
}

/**
 * OAuth2 callback for authorization flow.
 */
function authCallback(request) {
  var service = getOAuthService();
  var authorized = service.handleCallback(request);
  if (authorized) {
    return HtmlService.createHtmlOutput('Success! You can close this tab.');
  } else {
    return HtmlService.createHtmlOutput('Denied. You can close this tab.');
  }
}

/**
 * Ensures the script is authorized before making API calls.
 */
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

/**
 * Updates a client script project with the latest menu and library linkage.
 * @param {string} scriptId - The Apps Script project ID to update.
 * @param {string} libraryId - The PROSPR library ID to link.
 */
function deployToClientViaAPI(scriptId, libraryId) {
  updateScriptWithLibraryAndMenuAPI(scriptId, libraryId);
}

/**
 * Reads the library version from the Deployment Config sheet (field 'VERSION').
 * @returns {string} The library version to use.
 */
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

/**
 * Updates the script project with the PROSPR library and menu wiring code.
 * @param {string} scriptId - The Apps Script project ID to update.
 * @param {string} libraryId - The PROSPR library ID to link.
 */
function updateScriptWithLibraryAndMenuAPI(scriptId, libraryId) {
  var service = getOAuthService();
  var version = getLibraryVersionFromSheet();
  // Build manifest with dynamic library version
  var manifest = { timeZone: 'America/New_York', dependencies: { libraries: [] }, exceptionLogging: 'STACKDRIVER' };
  var lib = {
    libraryId: libraryId,
    userSymbol: 'PROSPR',
    version: version,
    developmentMode: false
  };
  manifest.dependencies.libraries = [lib];
  // Injected code: menu and wrappers for library functions
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

/**
 * Reads the PROSPR library ID from the Deployment Config sheet.
 * @returns {string} The library ID to use.
 */
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

/**
 * Reads all client script IDs from the Client URLs sheet (column C).
 * @returns {string[]} Array of script IDs.
 */
function getClientScriptIds() {
  const sheet = SpreadsheetApp.openById(SS_ID).getSheetByName('Client URLs');
  if (!sheet) throw new Error('The "Client URLs" sheet does not exist');
  const data = sheet.getDataRange().getValues();
  return data.slice(1).map(r => r[2]).filter(Boolean);
}