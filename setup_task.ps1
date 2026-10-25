$action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument '/c ""c:\Users\acer\Documents\Task Cost\run_taskcost.bat""' -WorkingDirectory 'c:\Users\acer\Documents\Task Cost'
$trigger = New-ScheduledTaskTrigger -AtLogOn
Register-ScheduledTask -TaskName 'TaskCostServer' -Action $action -Trigger $trigger -Description 'Runs Task Cost Server automatically on user logon' -Force
