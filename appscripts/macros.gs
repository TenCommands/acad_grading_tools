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

const CURRENT_VERSION = "v125.012.011";
const GITHUB_REPO = "TenCommands/acad_grading_tools";

var functions = {
  checkVersionUpdate: function() {
    try {
      const url = `api.github.com/repos/`+GITHUB_REPO+`/releases/latest`;
      const response = UrlFetchApp.fetch(url, { "muteHttpExceptions": true });

      if (response.getResponseCode() !== 200) return;

      const data = JSON.parse(response.getContentText());
      const latestVersion = data.tag_name.replace(/[vV]/g, "");

      if (functions.isNewerVersion(latestVersion, CURRENT_VERSION)) {
        functions.showUpdateModal(latestVersion, data.html_url);
      }
    } catch (e) {
      console.error("Update check failed: " + e.message);
    }
  },
  isNewerVersion: function(latest, current) {
    const latestParts = latest.split('.').map(Number);
    const currentParts = current.split('.').map(Number);

    for (let i = 0; i < latestParts.length; i++) {
      if (latestParts[i] > (currentParts[i] || 0)) return true;
      if (latestParts[i] < (currentParts[i] || 0)) return false;
    }
    return false;
  },
  showUpdateModal: function(newVersion, url) {
    const html = HtmlService.createHtmlOutput(
      `<div style="font-family: sans-serif;">
        <p>A newer version (<b>${newVersion}</b>) is available.</p>
        <p><a href="${url}" target="_blank" style="color: #1a73e8;">View release on GitHub</a></p>
        <button onclick="google.script.host.close()" style="padding: 5px 10px; cursor: pointer;">Dismiss</button>
      </div>`
    ).setWidth(350).setHeight(150);

    SpreadsheetApp.getUi().showModalDialog(html, "Update Available");
  }
}

function onOpen() {
  functions.checkVersionUpdate();
}