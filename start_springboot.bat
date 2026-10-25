@echo off
set "JAVA_HOME=C:\Program Files\Java\jdk-25.0.2"
set "PATH=%JAVA_HOME%\bin;c:\Users\acer\Documents\Task Cost\maven\apache-maven-3.9.6\bin;%PATH%"
cd /d "c:\Users\acer\Documents\Task Cost\backend-springboot"
echo ====================================================
echo Starting Spendorio Java Spring Boot Backend...
echo Embedded Tomcat Port: 3000
echo ====================================================
call mvn spring-boot:run
