$toolDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = (Get-Command python -ErrorAction Stop).Source
Start-Process -FilePath $python -ArgumentList 'editor_server.py' -WorkingDirectory $toolDir -WindowStyle Hidden
Start-Sleep -Milliseconds 750
Start-Process 'http://127.0.0.1:8765/frame-editor.html'
