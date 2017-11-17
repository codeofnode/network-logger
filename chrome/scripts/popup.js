var STORE_KEY = 'recorder-string';

document.getElementById("start-recording").onclick = function(){
  chrome.extension.sendMessage({
    startRecording : true
  });
  return false;
}
document.getElementById("setup-filter").onclick = function(){
  var str = prompt('Enter the filter configuration.', window.localStorage.getItem(STORE_KEY) || '');
  window.localStorage.setItem(STORE_KEY, str);
  chrome.extension.sendMessage({
    setupFilter : str
  });
  return false;
}
