taskkill /im chrome.exe
cd nginx
nginx -s quit
start nginx.exe
start /WAIT chrome --disable-cache http://localhost:8080/game.html
nginx -s quit
taskkill /im nginx.exe

