// Change these values with each release.
const CURRENT_VERSION = "126.201.013";
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
/*
Going to need to update how this works because the AutoCAD part of this project will have its own versioning and update checks with its own releases.
This means that I will need to compare all releases in the repository to see if they end in "gs" or "ac" and then check the version numbers accordingly.
- Get the list of all tags from the GitHub repository.
https://api.github.com/repos/tencommands/acad_grading_tools/tags
- View all details of a specific release by its tag name.
https://api.github.com/repos/TenCommands/acad_grading_tools/releases/tags/v126.201.013gs
*/
var functions = {
  checkVersionUpdate: function() {
    // Attempt to connect to the GitHub repo defined at the top and get the most
    // recent tag that ends with "gs" (for Google Apps Script). The repository
    // may contain other release types (eg. AutoLISP), so we fetch tags and
    // select the newest one whose name ends with "gs".
    try {
      SpreadsheetApp.getActiveSpreadsheet().toast("Checking for updates", "Version Check", 1);
      var perPage = 100;
      var page = 1;
      var tags = [];
      while (true) {
        var url = `https://api.github.com/repos/${GITHUB_REPO}/tags?per_page=${perPage}&page=${page}`;
        var response = UrlFetchApp.fetch(url, { "muteHttpExceptions": true });
        if (response.getResponseCode() !== 200) break;
        var pageTags = JSON.parse(response.getContentText());
        if (!pageTags || pageTags.length === 0) break;
        tags = tags.concat(pageTags);
        if (pageTags.length < perPage) break; // no more pages
        page++;
      }

      if (tags.length === 0) return;

      // Find the newest tag that ends with 'gs' (case-insensitive).
      var newestGsVersion = null;
      var newestTagInfo = null;
      tags.forEach(function(t) {
        var name = t.name || "";
        if (/gs$/i.test(name)) {
          // Remove trailing 'gs' and an optional leading 'v' or 'V'
          var ver = name.replace(/gs$/i, "").replace(/^[vV]/, "");
          if (!newestGsVersion) {
            newestGsVersion = ver;
            newestTagInfo = t;
          } else if (functions.isNewerVersion(ver, newestGsVersion)) {
            newestGsVersion = ver;
            newestTagInfo = t;
          }
        }
      });

      if (!newestGsVersion || !newestTagInfo) {
        // No Google Apps Script (gs) tags found.
        return;
      }

      if (functions.isNewerVersion(newestGsVersion.replace(/^[vV]/, ""), CURRENT_VERSION)) {
        // Attempt to fetch release details for this tag (may not exist).
        var htmlUrl = `https://github.com/${GITHUB_REPO}/releases/tag/${newestTagInfo.name}`;
        var bodyText = '';
        try {
          var relApi = `https://api.github.com/repos/${GITHUB_REPO}/releases/tags/${encodeURIComponent(newestTagInfo.name)}`;
          var relResp = UrlFetchApp.fetch(relApi, { "muteHttpExceptions": true });
          if (relResp.getResponseCode() === 200) {
            var relData = JSON.parse(relResp.getContentText());
            htmlUrl = relData.html_url || htmlUrl;
            bodyText = relData.body || '';
          }
        } catch (e) {
          // ignore and fall back to tag URL
          console.warn('Failed to fetch release details: ' + e.message);
        }

        functions.showUpdateModal(newestGsVersion, htmlUrl, bodyText);
      } else {
        functions.isUptoDateToast();
      }
    } catch (e) {
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
          document.getElementById("markdown").innerHTML = md.render(${JSON.stringify(body || '')});
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