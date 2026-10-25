Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "c:\Users\acer\Documents\Task Cost"
WshShell.Run """c:\Users\acer\Documents\Task Cost\start_server.bat""", 0, False
