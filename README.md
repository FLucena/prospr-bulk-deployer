# PROSPR Bulk Apps Script Deployer

## Overview
This solution allows you to **bulk update and manage Google Apps Script projects** (bound to client spreadsheets) from a single standalone Apps Script using the Apps Script REST API and OAuth2 authentication.

- **Link a shared library** (e.g., PROSPR) to multiple client scripts.
- **Inject custom menu and wrapper functions** that call library features.
- **Update all client scripts in bulk** with new menu items and code.

## Assumptions
- There is always an **existing bound script** for each client spreadsheet (i.e., you already have the script ID for each client).
- The list of script IDs in your sheet is accurate and up to date.
- The PROSPR library is published and accessible to all client scripts.
- The Google Cloud project and OAuth2 credentials are correctly configured and have the necessary permissions.
- The user running the deployment has edit access to all target scripts.
- The "Client URLs" sheet (column C) contains only valid Apps Script project IDs (not spreadsheet URLs).
- The "Deployment Config" sheet contains the correct library ID and version.

## How It Works
- Uses the [Apps Script REST API](https://developers.google.com/apps-script/api/reference/rest) via `UrlFetchApp` and the [OAuth2 library](https://github.com/googleworkspace/apps-script-oauth2).
- Reads a list of client script IDs from a Google Sheet ("Client URLs" sheet, column C).
- For each script ID, updates the Apps Script project to:
  - Link the PROSPR library (with the correct version and identifier)
  - Inject code that creates a custom menu and exposes library functions

## Features
- **Bulk update**: Update all client scripts at once.
- **Library linking**: Ensures all scripts use the latest version of your shared library.
- **Menu wiring**: Adds menu items that call library functions (e.g., createAdminMenu, generateComparativeReport, showHelpDialog, sendReportEmail, etc.).
- **OAuth2 authentication**: Securely authorizes API calls.
- **No duplicate scripts**: Only updates existing scripts (pure PUT workflow).

## Usage
1. **Set up your Google Cloud project**
   - Enable the Apps Script API.
   - Create OAuth2 credentials and add them to the script.
2. **Add the OAuth2 library** to your Apps Script project.
   - In the Apps Script editor, go to Extensions > Libraries.
   - Add the library with ID: `1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF` (version 43 or latest).
   - Set the identifier to `OAuth2`.
3. **Prepare your Google Sheet**
   - Sheet name: `Client URLs`
   - Column C: Script IDs of client scripts to update
   - Sheet name: `Deployment Config` (must include fields `LIBRARY_ID` and `VERSION`)
4. **Configure the script**
   - Set your spreadsheet ID in `SS_ID`.
   - The library version and identifier are set dynamically from the `VERSION` and `LIBRARY_ID` fields in the `Deployment Config` sheet.
5. **Run `bulkDeployToScriptIds()`**
   - The script will update all listed client scripts with the new menu and library linkage.

## Example Injected Menu
- **Admin**
  - Create Admin Menu
  - Generate Comparative Report
  - Show Help
  - Reset Admin Access
  - Show Session Info
  - Send Report Email

Each menu item calls a wrapper function that invokes the corresponding PROSPR library function.

## Requirements
- Google Cloud project with Apps Script API enabled
- OAuth2 credentials
- Apps Script OAuth2 library
- List of client script IDs

---
**This solution is scalable, secure, and keeps all your client scripts up to date with the latest features from your shared library.** 