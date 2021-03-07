"use strict";

/**
 * Auto User-Agent renew timer
 *
 * @type Timer
 */
var useragent_renew_timer = new Timer('User-Agent renew timer', function () {
  API.useragent.renew();
});

var updateIconForSite = function(tab) {
  var state = 'disabled';
  if (API.settings.getEnabled()) state = API.exceptions.uriMatch({uri: tab.url}) ? 'inactive' : 'active';
  UI.changeStateIcon(state, tab.id);
}

/**
 * Declare actions on settings changes
 *
 * @param   {string} name
 * @param   {mixed} value
 * @returns {void}
 */
Settings.onSet = function (name, value) {
  switch (name) {
    case 'enabled':
      UI.changeStateIcon(value === true ? 'active' : 'disabled');
      break;
    case 'renew_interval':
      useragent_renew_timer.setInterval(value);
      console.log('"' + useragent_renew_timer.getName() + '" updated to "' + value + '"');
      break;
    case 'renew_enabled':
      value === true && useragent_renew_timer.start() || useragent_renew_timer.stop();
      console.log('"' + useragent_renew_timer.getName() + '" changed state to "' + value + '"');
      break;
  }
  //console.log('Property "' + name + '" write "' + value + '" action');
};

/**
 * Load extension settings
 */
if (!Settings.hasOwnProperty('isLoaded') || Settings.isLoaded !== true) {
  Settings.load(function () {
    if (API.settings.getRenewOnstartupEnabled()) {
      API.useragent.renew();
    }
    useragent_renew_timer.setInterval(API.settings.getRenewIntervalInMicroseconds());
    if (API.settings.getRenewEnabled()) {
      useragent_renew_timer.start();
    }
    UI.changeStateIcon(API.settings.getEnabled() === true ? 'active' : 'disabled');
  });
}

/**
 * Auto settings sync
 */
chrome.storage.onChanged.addListener(function () {
  if (Settings.sync === true) {
    Settings.load(function () {
      console.info('Settings synchronized');
    });
  }
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'loading') updateIconForSite(tab);
});


function staterestorege(field, item) {
  if (field <= item) return true;
  return false;
}

function renderTo(field, item, expanded) {
  let disabled = false;
  switch (expanded) {
    case '<=': {
      disabled = staterestorege(field, item)
    }
    break;
  case '!=': {
    disabled = staterestoreneq(field, item)
  }
  break;
  case '>': {
    disabled = staterestoreg(field, item)
  }
  break;
  case '<': {
    disabled = staterestorel(field, item)
  }
  break;
  case '>=': {
    disabled = staterestorele(field, item)
  }
  break;
  case '==': {
    disabled = staterestoreeq(field, item)
  }
  break;
  }
  return disabled;
}

