@echo off
set "JAVA_HOME=C:\Program Files\Java\jdk-25.0.2"
set "PATH=%JAVA_HOME%\bin;%PATH%"
cd /d "c:\Users\acer\Documents\Task Cost"
echo ====================================================
echo Starting Spendorio Java Spring Boot Backend...
echo Embedded Tomcat Port: 3000
echo ====================================================
java -jar "c:\Users\acer\Documents\Task Cost\backend-springboot\target\spendorio-backend-1.0.0.jar"
