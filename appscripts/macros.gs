// Change these values with each release.
const CURRENT_VERSION = "124.012.011";
// This should link to the current repository of the maintainer.
const GITHUB_REPO = "TenCommands/acad_grading_tools";

// HTML template for the dialog box
const HTML_CONTENT = `<html><head><base target="_top"></head><body><textarea id="textToCopy" rows="14" cols="30"><?= celltext ?></textarea><br><button onclick="copyToClipboard()">Copy Text</button><p id="status"></p><script>function copyToClipboard() {var copyText = document.getElementById("textToCopy");navigator.clipboard.writeText(copyText.value).then(function() {document.getElementById("status").innerText = "Text copied successfully!";}).catch(function(err) {document.getElementById("status").innerText = 'Failed to copy text: ' + err;});}</script></body></html>`;

// Gets the chosen content and allows user to copy to without having to manually select it.
function copySelectedCells() {
    var sheet  = SpreadsheetApp.getActiveSheet(); // get the active sheet
    // starting row, starting column, row numbers, column numbers
    var columnH  = sheet.getRange(1, 8/*H*/, sheet.getLastRow(), 1);
    var columnF = sheet.getRange(1, 6/*F*/, sheet.getLastRow(), 1);
    /*
    * loop through the rows of range:
    *    if column H is not empty:
    *        get the value of column F and H
    *        append to selectedText with newline
    */
    var selectedText = '';
    for (var i = 1; i <= columnH.getNumRows(); i++) {
        var cellValue = columnH.getCell(i, 1).getValue();
        if (cellValue !== '' && cellValue[0] !== '*') {
            var cellValue2 = columnF.getCell(i, 1).getValue();
            /* exclude the contents of column H if it is a '.' (provides a cleaner result) */
            if (cellValue !== '.'){ selectedText += cellValue2 + cellValue + '\n'; }else{
                selectedText += cellValue2 + '\n';
            }
            
        }
    }
    /* Places the values into the text box of the HTML dialog to be copied. */
    var html = HtmlService.createTemplate(HTML_CONTENT) 
        html.celltext = selectedText 
    var htmlOutput = html.evaluate() 
    SpreadsheetApp.getUi().showSidebar(htmlOutput); 
}

// Clears the contents of column H
function clearColumnH() {
    var sheet  = SpreadsheetApp.getActiveSheet();
    var columnH  = sheet.getRange(1, 8/*H*/, sheet.getLastRow(), 1);
    columnH.clearContent();
}

// Storying functions that are not macros in an object so they don't appear in the macros screen and confuse users.
var functions = {
  checkVersionUpdate: function() {
    // Attempt to connect to the current github repo defined at the top and get the latest release number.
    try {
      SpreadsheetApp.getActiveSpreadsheet().toast("Checking for updates", "Version Check", 1);
      const url = `api.github.com/repos/`+GITHUB_REPO+`/releases/latest`; // Connect to github
      const response = UrlFetchApp.fetch(url, { "muteHttpExceptions": true }); // Get the response information
      if (response.getResponseCode() !== 200) return; // Response code 200 is the only valid response. Return if not.
      const data = JSON.parse(response.getContentText());
      const latestVersion = data.tag_name.replace(/[vV]/g, ""); // Regex parse the latest version to remove the `v` at the start if apparent
      if (functions.isNewerVersion(latestVersion, CURRENT_VERSION)) {
        // If the latest version is newer then this will display a modal informing them that an update is available.
        functions.showUpdateModal(latestVersion, data.html_url, data.body);
      }else{
        functions.isUptoDateToast()
      }
    } catch (e) {
      // Send errors to console
      console.error("Update check failed: " + e.message);
      SpreadsheetApp.getActiveSpreadsheet().toast("Update check failed: " + e.message, "Version Check", 1);
    }
  },
  isNewerVersion: function(latest, current) {
    // Convert both strings into numbers in an array split by the delimiter `.`
    const latestParts = latest.split('.').map(Number);
    const currentParts = current.split('.').map(Number);
    // Iterate the arrays and compare each part.
    //The first part of the github version (latest) to appear greater than the current will return true
    for (let i = 0; i < latestParts.length; i++) {
      if (latestParts[i] > (currentParts[i] || 0)) return true;
      if (latestParts[i] < (currentParts[i] || 0)) return false;
    }
    return false;
  },
  // Display HTML popup modal to inform the user of an available update.
  showUpdateModal: function(newVersion, url, body) {
    const html = HtmlService.createHtmlOutput(
      `<script src="https://cdn.jsdelivr.net/npm/markdown-it@10.0.0/dist/markdown-it.min.js"></script>
      <div style="font-family: sans-serif;">
        <p>A newer version (<b>v${newVersion}</b>) is available. <a href="${url}" target="_blank" style="color: #1a73e8;">View release on GitHub</a></p>
        <p></p>
        <p>Current version: <b>v${CURRENT_VERSION}</b><p>
        <button onclick="google.script.host.close()" style="padding: 5px 10px; cursor: pointer;">Dismiss</button>
        <div id="markdown"></div>
        <script>
          var md = window.markdownit();
          document.getElementById("markdown").innerHTML = md.render(${body});
        </script>
      </div>`
    ).setWidth(350).setHeight(150);
    SpreadsheetApp.getUi().showModalDialog(html, "Update Available");
  },
  isUptoDateToast: function(){
    SpreadsheetApp.getActiveSpreadsheet().toast("You are up-to date.", "Version Check", 1);
  }
}

function onOpen() {
  functions.checkVersionUpdate();
}