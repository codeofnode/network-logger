var defaultConfig = {
  methodIsNot: 'OPTIONS'
};

var FilterConfig = [];

var shouldRecord = function(inp){
  var req = inp.request;
  if (!req || !req.url) return false;
  if (inp.type !== 'XHR') return false;
  var ln = FilterConfig.length, ptimes = 0;
  for (var fl, kys, lk, z = 0; z< ln; z++){
    fl = FilterConfig[z];
    if (typeof fl !== 'object' || fl === null) continue;
    kys = Object.keys(fl);
    lk = kys.length;
    for (var isp = true, j = 0; isp && j< lk; j++){
      switch(kys[j]) {
        case 'urlContains':
          if (req.url.indexOf(fl[kys[j]]) === -1) {
            isp = false;
          }
          break;
        case 'methodIsNot':
          if (req.method === fl[kys[j]]) {
            isp = false;
          }
          break;
        case 'method':
          if (req.method !== fl[kys[j]]) {
            isp = false;
          }
          break;
        case 'urlNotContains':
          if (req.url.indexOf(fl[kys[j]]) !== -1) {
            isp = false;
          }
          break;
        case 'urlStartsWith':
          if (!req.url.startsWith(fl[kys[j]])) {
            isp = false;
          }
          break;
        case 'urlEndsWith':
          if (!req.url.endsWith(fl[kys[j]])) {
            isp = false;
          }
          break;
        case 'urlRegex':
          if (!((new Regex(fl[kys[j]])).test(req.url))) {
            isp = false;
          }
          break;
        default:
          isp = false;
      }
    }
    if (isp) {
      ptimes++;
    }
  }
  return ptimes === ln;
};

var activeTabId;
var record = {};
var getActiveTab = function(e) {
    return activeTabId ? e() : (chrome.tabs.query({
        currentWindow: !0,
        active: !0
    }, function(t) {
        t.length ? (activeTabId = t[0].id,
        e()) : alert("No active tab found")
    }),
    void 0)
};
chrome.tabs.onActivated.addListener(function(e) {
  record = {},
  activeTabId = e.tabId
});

var dataMap = {};
var storeTCs = [];
var recordHttpTraffic = function(e) {
    chrome.debugger.sendCommand(e, "Network.enable"),
    chrome.debugger.onEvent.removeListener(onHttpRequestEvent),
    chrome.debugger.onEvent.addListener(onHttpRequestEvent)
}
  , getParsedData = function(n) {
    try {
      return JSON.parse(n);
    } catch(er) {
      return n;
    }
}
  , onHttpRequestEvent = function(e, t, n) {
    if (!n || !n.requestId) return;
    if (dataMap[n.requestId] && t === 'Network.responseReceived') {
      if (!record[n.requestId]) return;
      dataMap[n.requestId].response.headers = n.response.headers;
      dataMap[n.requestId].response.statusCode = n.response.status;
      dataMap[n.requestId].assertions.statusCode = n.response.status || 200;
      chrome.debugger.sendCommand(e, "Network.getResponseBody", {
        requestId: n.requestId
      }, function(e) {
        dataMap[n.requestId].response.content = getParsedData(e && e.body || "")
      });
    } else if(n.request && shouldRecord(n) && t === 'Network.requestWillBeSent') {
      record[n.requestId] = true;
      dataMap[n.requestId] = {
        request: {
          method: n.request.method,
          url : n.request.url,
          payload : getParsedData(n.request.postData),
          headers: n.request.headers
        },
        response: {
        },
        assertions: {
          statusCode: 200
        }
      };
      storeTCs.push(dataMap[n.requestId]);
    }
}
  , onAttach = function(e) {
    record = {};
    storeTCs = [];
    recordHttpTraffic(e)
    if (FilterConfig.length === 0) {
      FilterConfig = [JSON.parse(JSON.stringify(defaultConfig))];
    }
}
  , onDetach = function(e) {
    var a = window.document.createElement('a');
    a.href = window.URL.createObjectURL(new Blob([JSON.stringify({ entries : storeTCs }, null, 2)], {type: 'application/json'}));
    a.download = 'allrounder.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
  , onRecordButtonClick = function() {
    getActiveTab(function() {
        chrome.windows.getCurrent(function() {
            var e = {
                tabId: activeTabId
            };
            chrome.debugger.attach(e, '1.0', onAttach.bind(null, e));
        })
    })
};
chrome.debugger.onDetach.addListener(onDetach);
chrome.extension.onMessage.addListener(function(e, t, n) {
  if (e.startRecording === true) {
    onRecordButtonClick(t.id);
  } else if(typeof e.setupFilter === 'string' && e.setupFilter.length > 1) {
    try {
      var ab = JSON.parse(e.setupFilter);
      if(!Array.isArray(ab)) ab = [ab];
      var out = [];
      ab.forEach(am => {
        if (typeof am === 'object' && am !== null) {
          out.push(Object.assign({}, defaultConfig, am));
        }
      });
      FilterConfig = out.length ? out : [JSON.parse(JSON.stringify(defaultConfig))];
    } catch(er) {
      FilterConfig = [JSON.parse(JSON.stringify(defaultConfig))];
    }
  }
  console.log('filter config is :', FilterConfig);
});
