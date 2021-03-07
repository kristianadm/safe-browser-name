// Do not execute JS protection on Firefox. Could become a problem if the extension is ported
// to Edge or Chrome starts to support the "browser" object.
document.addEventListener("settings", function(e) { chrome.runtime.sendMessage({'action':'settings','data':e.detail}); });

if (typeof browser == 'undefined')
{
  chrome.runtime.sendMessage([
    {action: 'settings.getEnabled'},
    {action: 'settings.getJavascriptProtectionEnabled'},
    {action: 'useragent.get'},
    {action: 'exceptions.uriMatch', data: {uri: window.location.href}} // Make wildcard search in exceptions list
  ], function(results) {
    var enabled = results[0],
      js_protection_enabled = results[1],
      useragent = results[2],
      uri_match = results[3];
    var consoleMessage = function (message_text) {
      if (typeof message_text === 'string') {
        console.log('[Random User-Agent] '+message_text);
      }
    };
    if (enabled === true) {
      if (js_protection_enabled === true) {
        if (typeof useragent === 'string' && useragent !== '') {
          if (uri_match === false) {
            //consoleMessage('Use fake User-Agent: ' + useragent);
            var injection_code = '(' + function(new_useragent) {
                  if (typeof window === 'object' && typeof window.navigator === 'object') {
                    navigator = Object.create(window.navigator);
                    Object.defineProperties(navigator, {
                      userAgent:  {get: function() {return new_useragent;}},
                      appVersion: {get: function() {return new_useragent;}}
                    });
                    Object.defineProperty(window, 'navigator', {
                      value: navigator, configurable: false, enumerable: false, writable: false
                    });
                  }
                } + ')("' + useragent.replace(/([\"\'])/g, '\\$1') + '");';
            var script = document.createElement('script');
            script.textContent = injection_code;
            document.documentElement.appendChild(script);
            script.remove();
            if (typeof navigator === 'object') {
              Object.defineProperties(navigator, {
                userAgent:  {get: function() {return useragent;}},
                appVersion: {get: function() {return useragent;}}
              });
            }
          }
        }
      } else {
        //consoleMessage('User-Agent JavaScript protection disabled!');
      }
    }
  });
}
