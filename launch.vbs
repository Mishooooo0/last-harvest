' Last Harvest launcher, used by the desktop shortcut.
' Starts the small game server in the background if it isn't running yet,
' then opens the game in its own Chrome window (Edge, or the default browser, if Chrome is missing).
' The server only listens on this computer (127.0.0.1) and keeps running until you sign out or restart.
Option Explicit

Dim shell, fso, root, gameUrl, checkUrl, node, browser, i
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(WScript.ScriptFullName)
' Saves live in the browser per address, so always open the same one.
gameUrl = "http://localhost:4173/"
checkUrl = "http://127.0.0.1:4173/"

Function ServerUp()
  Dim http
  ServerUp = False
  On Error Resume Next
  Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
  http.setTimeouts 500, 500, 1000, 1000
  http.open "GET", checkUrl, False
  http.send
  If Err.Number = 0 Then
    If http.status = 200 Then ServerUp = True
  End If
  Err.Clear
End Function

Function FirstFile(paths)
  Dim p
  FirstFile = ""
  For Each p In paths
    p = shell.ExpandEnvironmentStrings(p)
    If fso.FileExists(p) Then
      FirstFile = p
      Exit Function
    End If
  Next
End Function

If Not ServerUp() Then
  node = FirstFile(Array("%ProgramFiles%\nodejs\node.exe", "%ProgramFiles(x86)%\nodejs\node.exe", "%LOCALAPPDATA%\Programs\nodejs\node.exe"))
  If node = "" Then node = "node"
  shell.CurrentDirectory = root
  shell.Run """" & node & """ """ & root & "\serve.mjs""", 0, False
  For i = 1 To 40
    If ServerUp() Then Exit For
    WScript.Sleep 250
  Next
  If Not ServerUp() Then
    MsgBox "Last Harvest couldn't start its game server." & vbCrLf & vbCrLf & _
      "Make sure Node.js is installed, then try the shortcut again." & vbCrLf & _
      "(Or open a terminal in """ & root & """ and run: node serve.mjs)", vbExclamation, "Last Harvest"
    WScript.Quit 1
  End If
End If

browser = FirstFile(Array("%ProgramFiles%\Google\Chrome\Application\chrome.exe", "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe", "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe", "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe", "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"))
If browser = "" Then
  shell.Run gameUrl, 1, False
Else
  shell.Run """" & browser & """ --app=" & gameUrl & " --start-maximized", 1, False
End If
