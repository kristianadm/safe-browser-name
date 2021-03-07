"use strict";

(function() {

  /**
   * Actual User-Agent
   */
  var updateActualUserAgentLabel = function() {
    chrome.runtime.sendMessage({action: 'useragent.get'}, function(actual_useragent) {
      if ((typeof actual_useragent !== 'string') || (actual_useragent === '')) {
        actual_useragent = 'User-Agent (managed by this extension) is not available';
      }
      UI.forEachCssClass('actual-user-agent', function($el) {
        if ($el.innerHTML !== actual_useragent) {
          $el.innerHTML = actual_useragent;
        }
      });
    });
  }, actual_useragent_interval = window.setInterval(updateActualUserAgentLabel, 500);
  updateActualUserAgentLabel();

  /**
   * Enabled on this site
   */
  UI.forEachCssClass('enabled-on-this-domain', function($el) {
    if (UI.isCheckbox($el)) {
      var getThisPageUri = function(callback) {
        if (typeof chrome.tabs === 'object') {
          chrome.tabs && chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            callback.call(null, tabs[0].url);
          });
        } else {
          callback.call(null, window.location.href);
        }
      };
      getThisPageUri(function(uri) {
        chrome.runtime.sendMessage({action: 'exceptions.uriMatch', data: {uri: uri}}, function(is_match) {
          $el.checked = !is_match;
          UI.addEvent($el, 'change', function() {
            chrome.runtime.sendMessage({
              action: 'exceptions.' + ($el.checked === true ? 'remove' : 'add') + 'UriPattern',
              data: {uri: uri}
            }, function(result) {
              if (typeof result === 'boolean') {
                chrome.runtime.sendMessage({action: 'exceptions.uriMatch', data: {uri: uri}}, function(is_match) {
                  $el.checked = !is_match;
                });
              } else {
                console.error('Invalid response format (not boolean)');
              }
            });
          });
        });
      });
    }
  });

  /**
   * Change 'enabled' state
   */
  chrome.runtime.sendMessage({ action: 'settings.getEnabled'}, function(is_enabled) {
    if (typeof is_enabled === 'boolean') {
      var guiSetEnabled = function(is_enabled) {
        UI.forEachCssClass('change-enabled-state', function($el) {
          if ((UI.hasCssClass($el, 'disable') && !is_enabled) || (UI.hasCssClass($el, 'enable') && is_enabled)) {
            UI.addCssClass($el, 'hidden');
          } else {
            UI.removeCssClass($el, 'hidden');
          }
        });
      }, apiSetEnabled = function(is_enabled) {
        chrome.runtime.sendMessage({action: 'settings.setEenabled', data: {enabled: is_enabled}}, function(result) {
          if (result === true) {
            guiSetEnabled(is_enabled);
          } else {
            console.error('Error while changing enabled state:\n', result);
          }
        });
      };
      guiSetEnabled(is_enabled);
      UI.forEachCssClass('change-enabled-state', function($el) {
        if (UI.hasCssClass($el, 'disable')) {
          UI.addEvent($el, 'click', function() {
            apiSetEnabled(false);
          });
        }
        if (UI.hasCssClass($el, 'enable')) {
          UI.addEvent($el, 'click', function() {
            apiSetEnabled(true);
          });
        }
      });
    } else {
      console.error('Invalid "settings.getEnabled" response format:\n', is_enabled);
    }
  });

  /**
   * Renew useragent
   */
  UI.forEachCssClass('renew-useragent', function($el) {
    UI.addEvent($el, 'click', function() {
      chrome.runtime.sendMessage({action: 'useragent.renew'}, function(result) {
        if (result === true) {
          updateActualUserAgentLabel();
        } else {
          console.error('Renew useragent completed with error');
        }
      });
    });
  });

  /**
   * Open settings panel
   */
  UI.forEachCssClass('open-settings-panel', function($el) {
    UI.addEvent($el, 'click', function() {
      if (chrome.runtime) {
        if (chrome.runtime.openOptionsPage) {
          // New way to open options pages, if supported (Chrome 42+)
          chrome.runtime.openOptionsPage();
        } else {
          // Reasonable fallback
          if (chrome.runtime.getURL) {
            window.open(chrome.runtime.getURL('/html/options.html'));
          } else {
            alert('Cannot open settings page from here, click on popup frame only');
          }
        }
      }
    });
  });

  /**
   * Auto-height hack
   */
  var autoheight_interval = window.setInterval(function() {
    UI.getElementById('main', function($el) {
      var body_height = document.body.style.height,
        self_height = $el.offsetHeight;
      if (body_height !== self_height) {
        document.body.style.height = self_height + 'px';
      }
    });
  }, 50);

  /**
   * Localize UI
   */
  UI.forEachWithDataAttrib('l10n', function($el, data_attrib_value) {
    UI.localizeElement($el, data_attrib_value);
  });

})();
