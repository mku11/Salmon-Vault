To view and edit files you can use Visual Studio Code.
Right click on the workspace file and "Open with Code".

To fetch and extract the salmon library dependencies run Terminal / Run Build Task.

You will need an http server to host the app or open the index.html locally with your browser (see below for limitations)

Web Browser Support:
For http-file based vaults Chrome, Firefox, Safari or any browser that supports modules ES2022
For local file based vaults only Chrome is supported.
For use with http-files without hosting on a server you can open the html file locally with your browser.
For use with local vaults drives without and http server you need to start chrome with these options:
--allow-file-access-from-files --disable-web-security

To package the app run:
./package.sh