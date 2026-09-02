param([string]$FramesDir=".\edited_frames",[string]$Output="edited-video.mp4",[int]$Fps=24)
$ffmpeg=(Get-Command ffmpeg -ErrorAction SilentlyContinue).Source
if(-not $ffmpeg){$ffmpeg="C:\Users\alexv\Desktop\computering\wind-turbine-monitor\node_modules\ffmpeg-static\ffmpeg.exe"}
if(-not (Test-Path $ffmpeg)){throw 'ffmpeg was not found. Install/use the same ffmpeg executable used for the turbine video.'}
& $ffmpeg -y -framerate $Fps -i (Join-Path $FramesDir 'frame-%04d.png') -c:v libx264 -pix_fmt yuv420p $Output
