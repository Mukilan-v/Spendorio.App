@echo off
cd /d "c:\Users\acer\Documents\Task Cost"
echo Current dir: %CD% > debug.log
echo Node path: >> debug.log
where node >> debug.log 2>&1
"C:\Program Files\nodejs\node.exe" -v >> debug.log 2>&1
"C:\Program Files\nodejs\node.exe" server.js >> debug.log 2>&1
echo Done >> debug.log
