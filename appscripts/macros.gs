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