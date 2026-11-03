Set UAC = CreateObject("Shell.Application")
UAC.ShellExecute "cmd.exe", "/c ""G:\Gamoventure\Organisation\excalidraw-clone\scripts\add-hosts.cmd""", "", "runas", 0
