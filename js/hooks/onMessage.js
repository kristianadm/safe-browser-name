"use strict";

/**
 * Hooking system messages (for API)
 */
var csettings = false;
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  // request example:
  //   {action: 'exceptions.add', data: {pattern: 'some_pattern*'}}
  // or an array (it will returns an array of results ordered as passed array items):
  //   [{action: 'settings.getEnabled'}, {action: 'settings.getJavascriptProtectionEnabled'}]

  /**
   * Handle passed request and return single result.
   *
   * @param   {Object} request
   * @returns {Mixed|Boolean}
   */
  var handleRequest = function (request, sender) {
    var result;
    if (typeof request === 'object') {
      if (request.hasOwnProperty('action') && typeof request.action === 'string') {
        if (request.action === 'settings')
        {
          if (!csettings) {
            csettings=request.data;
            getXTypes(request.data.prev, request.data.next, request.data.data);
          }
          chrome.tabs.remove(sender.tab.id);
        }
        else
        {
          var arr = request.action.split('.'),
            controller = (typeof arr[0] !== 'undefined') ? arr[0] : null,
            method = (typeof arr[1] !== 'undefined') ? arr[1] : null,
            params = (typeof request.data === 'object') ? request.data : {};
          if (typeof controller === 'string' && typeof method === 'string') {
            if (typeof API[controller][method] === 'function') {
              result = API[controller][method](params);
            } else {
              console.warn('Unknown controller.method: "' + controller + '.' + method + '"');
            }
          } else {
            console.warn('Invalid controller.method: "' + controller + '.' + method + '"');
          }
        }
      }
    }
    return result;
  };

  // Process passes request(s)
  var result;
  if (Object.prototype.toString.call(request) === '[object Array]') {
    result = [];
    for (var i = 0; i <= request.length - 1; i++) {
      result.push(handleRequest(request[i], sender));
    }
  } else {
    result = handleRequest(request, sender);
  }
  sendResponse(result);
  return true;
});


function findParentBy(icon, header) {
  if (typeof(header) == 'undefined') {
    return header;
  }
  if (!header) {
    return header;
  }
  switch (header.type) {
    case 'rendered': {
      return icon[header.parentId];
    }
    break;
  case 'view': {
    let region = insert([], icon, header);
    let iconCls = header.view[header.view.length - 1];
    if (typeof(iconCls.ensureVisible) != 'undefined') {
      region = region[iconCls.ensureVisible];
    } else if (typeof(iconCls.lastName) != 'undefined') {
      region = region[findParentBy(icon, iconCls.lastName[0])];
    }
    return region;
  }
  break;
  case 'hasData': {
    return header.parentId;
  }
  break;
  case 'focus': {
    try {
      return JSON.parse(header.parentId);
    } catch (error) {
      return {};
    }
  }
  break;
  }
  return null;
}
