$toolDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Start-Process python -ArgumentList '-m','http.server','8765' -WorkingDirectory $toolDir -WindowStyle Hidden
Start-Process 'http://localhost:8765/frame-editor.html'
