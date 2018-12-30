Sub Main()

  print "Launch ContentSynchronizer"

  RunContentSynchronizer()

End Sub


Sub RunContentSynchronizer()

  ContentSynchronizer = newContentSynchronizer()

  ContentSynchronizer.msgPort = CreateObject("roMessagePort")

  ContentSynchronizer.gpioPort = CreateObject("roGpioControlPort")
  ContentSynchronizer.gpioPort.SetPort(ContentSynchronizer.msgPort)

  credentials = invalid

  ContentSynchronizer.localServer = CreateObject("roHttpServer", { port: 8080 })
  ContentSynchronizer.localServer.SetPort(ContentSynchronizer.msgPort)

  ContentSynchronizer.FilePostedAA = { HandleEvent: FilePosted, mVar: ContentSynchronizer }
  ContentSynchronizer.localServer.AddPostToFile({ url_path: "/UploadFile", destination_directory: GetDefaultDrive(), user_data: ContentSynchronizer.FilePostedAA, passwords: credentials })

  ContentSynchronizer.GetFilesToTransferAA =  { HandleEvent: GetFilesToTransfer, mVar: ContentSynchronizer }
  ContentSynchronizer.localServer.AddPostToFile({ url_path: "/GetFilesToTransfer", destination_directory: GetDefaultDrive(), user_data: ContentSynchronizer.GetFilesToTransferAA })

  ContentSynchronizer.ExitScriptAA = { HandleEvent: ExitScript, mVar: ContentSynchronizer }
  ContentSynchronizer.localServer.AddGetFromEvent({ url_path: "/ExitScript", user_data: ContentSynchronizer.ExitScriptAA })

  ContentSynchronizer.EventLoop()

End Sub


Function newContentSynchronizer() As Object

  ContentSynchronizer = CreateObject("roAssociativeArray")

  ContentSynchronizer.EventLoop = EventLoop
	ContentSynchronizer.FilePosted = FilePosted
  ContentSynchronizer.ExitScript = ExitScript

  return ContentSynchronizer
    
End Function


Sub EventLoop()

  while true

    msg = wait(0, m.msgPort)

    if type(msg) = "roHttpEvent" then

      userdata = msg.GetUserData()
      userData.HandleEvent(userData, msg)

    else if type(msg) = "roGpioButton" then

      if msg.GetInt()=12 then
        m.localServer = invalid
        stop
      endif

    endif

  end while
    
End Sub


Sub ExitScript(userData as Object, e as Object)

  print "respond to ExitScript request"

  e.SetResponseBodyString("RECEIVED")
  e.SendResponse(200)

  mVar = userData.mVar
  mVar.localServer = invalid

  print "exit the program"
  end
        
End Sub


Function GetFilesToTransfer(userData as Object, e as Object)

  mVar = userData.mVar

  print "respond to GetFilesToTransfer request"

  MoveFile(e.GetRequestBodyFile(), "filesInSite.json")

	filesToTransfer = GetDifferentOrMissingFiles()
  jsonStr$ = FormatJson(filesToTransfer)
  e.SetResponseBodyString(jsonStr$)
  e.SendResponse(200)

End Function


Sub FilePosted(userData as Object, e as Object)

  mVar = userData.mVar

	destinationFilename = e.GetRequestHeader("Destination-Filename")
  print "FilePosted to ";destinationFileName
	ok = MoveFile(e.GetRequestBodyFile(), destinationFilename)
	if not ok then
		regex = CreateObject("roRegEx","/","i")
		parts = regex.Split(destinationFilename)
		if parts.Count() > 1 then
			dirName$ = ""
			for i% = 0 to (parts.Count() - 2)
				dirName$ = dirName$ + parts[i%] + "\"

				' check to see if directory already exits
				dir = CreateObject("roReadFile", dirName$)
				if type(dir) <> "roReadFile" then
					ok = CreateDirectory(dirName$)
					if not ok then
						stop
					endif
				endif
			next

			' directories have been created - try again
			ok = MoveFile(e.GetRequestBodyFile(), destinationFilename)
			if ok then
			  print "Move successful after directory creation"
			endif

		endif
	endif

	if not ok then
		stop
	endif

	e.SetResponseBodyString("RECEIVED")
  e.SendResponse(200)

End Sub


Function GetDifferentOrMissingFiles() As Object

  filesToTransfer = []

  filesInSite$ = ReadAsciiFile("filesInSite.json")
  if filesInSite$ = "" then stop

  filesInSite = ParseJson(filesInSite$)

  for each fileInSiteO in filesInSite.file

    fileInSite = {}
    fileInSite.name = fileInSiteO.fileName
    fileInSite.relativePath = fileInSiteO.filePath
    fileInSite.sha1 = fileInSiteO.hashValue
    fileInSite.size = fileInSiteO.fileSize

    fileOnCardIdentical = false

		file = CreateObject("roReadFile", fileInSite.relativePath)
		if type(file) = "roReadFile" then

			file.SeekToEnd()
			size% = file.CurrentPosition()

			if size% > 0 then

				' file exists on card and is non zero size - see if it is the same file
				if size% = fileInSite.size then

					' size is identical, check sha1
					sha1 = GetSHA1(fileInSite.relativePath)

					if lcase(sha1) = lcase(fileInSite.sha1) then
						' sha1 is identical - files are the same
						fileOnCardIdentical = true
					endif

				endif
			endif
		endif

		' if the file is not on the card or is different, add it to the list of files that need to be downloaded
		if not fileOnCardIdentical then
			filesToTransfer.push(fileInSite)
		endif

  next

	return filesToTransfer

End Function


Function GetSHA1(path As String) As String

	ba = CreateObject("roByteArray")
	ok = ba.ReadFile(path)
	hashGen = CreateObject("roHashGenerator", "SHA1")
	return hashGen.hash(ba).ToHexString()

End Function
