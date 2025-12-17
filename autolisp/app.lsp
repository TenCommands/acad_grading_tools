(defun C:HELLO (msg, / message) ; message is declared as a local variable
  (setq message (strcat "Hello world." msg)) ; set a value
  (alert message) ; displays an alert box with the message
  (princ) ; suppresses the return of the last expression's value to the command line
)