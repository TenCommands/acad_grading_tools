(setq VERSION "026.003.008")

(defun C:HELLO (msg, / message) ; message is declared as a local variable
  (setq message (strcat "Hello world." msg)) ; set a value
  (alert message) ; displays an alert box with the message
  (princ) ; suppresses the return of the last expression's value to the command line
)

(defun C:VP2 {/}
  (command "MView")
)

(defun C:MAKELAYER (name, / layername)
  (if (= (tblsearch "LAYER" "VIEWPORT") nil)
    (command "-layer" "M" "VIEWPORT" "C" 177 "" "LT" "PHANTOM2" "" "P" "N" "" "")
    (alert "LAYER ALREADY EXISTS")
   )
)