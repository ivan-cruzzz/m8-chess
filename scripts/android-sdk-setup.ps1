# Принятие лицензий Android SDK
$env:JAVA_HOME = "$env:USERPROFILE\.jdk\jdk-17.0.20+8"
$sdkmgr = "$env:LOCALAPPDATA\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat"

$accept = ("y`n" * 10)
$accept | & cmd /c $sdkmgr --licenses 2>&1 | Out-Null
Write-Output "лицензии приняты"

# Установка пакетов
& cmd /c $sdkmgr "platform-tools" "platforms;android-34" "build-tools;34.0.0" 2>&1 | Select-Object -Last 3
