@echo off
set "JAVA_HOME=C:\Program Files\Java\jdk-25.0.2"
set "PATH=%JAVA_HOME%\bin;c:\Users\acer\Documents\Task Cost\maven\apache-maven-3.9.6\bin;%PATH%"
cd /d "c:\Users\acer\Documents\Task Cost\backend-springboot"
echo Packaging Spendorio Spring Boot Executable JAR...
call mvn package -DskipTests
if %errorlevel% neq 0 (
    echo Maven package failed with exit code %errorlevel%
    exit /b %errorlevel%
)
echo ====================================================
echo PACKAGE SUCCESSFUL! Executable JAR is ready!
echo ====================================================
