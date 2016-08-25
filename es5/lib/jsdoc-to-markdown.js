'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var version = require('../../package').version;
var UsageStats = require('usage-stats');
var jsdocApi = require('jsdoc-api');
var dmd = require('dmd');

var usageStats = new UsageStats('UA-70853320-3', {
  name: 'jsdoc2md',
  version: version
});

exports.render = function (options) {
  return stats('render', options, render);
};
exports.renderSync = function (options) {
  return stats('renderSync', options, renderSync, true);
};
exports.getTemplateData = function (options) {
  return stats('getTemplateData', options, getTemplateData);
};
exports.getTemplateDataSync = function (options) {
  return stats('getTemplateDataSync', options, getTemplateDataSync, true);
};
exports.getJsdocData = function (options) {
  return stats('getJsdocData', options, getJsdocData);
};
exports.getJsdocDataSync = function (options) {
  return stats('getJsdocDataSync', options, getJsdocDataSync, true);
};
exports.clear = function () {
  return stats('clear', null, clear);
};

exports._usageStats = usageStats;

function render(options) {
  options = options || {};
  var dmdOptions = new DmdOptions(options);
  return getTemplateData(options).then(function (templateData) {
    return dmd.async(templateData, dmdOptions);
  });
}

function renderSync(options) {
  options = options || {};
  var dmdOptions = new DmdOptions(options);
  return dmd(getTemplateDataSync(options), dmdOptions);
}

function getTemplateData(options) {
  options = options || {};
  var jsdocParse = require('jsdoc-parse');
  return getJsdocData(options).then(jsdocParse);
}

function getTemplateDataSync(options) {
  options = options || {};
  var jsdocParse = require('jsdoc-parse');
  var jsdocData = getJsdocDataSync(options);
  return jsdocParse(jsdocData, options);
}

function getJsdocData(options) {
  options = options || {};
  var jsdocOptions = new JsdocOptions(options);
  return jsdocApi.explain(jsdocOptions);
}

function getJsdocDataSync(options) {
  options = options || {};
  var jsdocOptions = new JsdocOptions(options);
  return jsdocApi.explainSync(jsdocOptions);
}

function clear() {
  return jsdocApi.cache.clear().then(function () {
    return dmd.cache.clear();
  });
}

var JsdocOptions = function JsdocOptions(options) {
  _classCallCheck(this, JsdocOptions);

  options = options || {};

  this.cache = options.cache === undefined ? true : options.cache;

  this.files = options.files;

  this.source = options.source;

  this.configure = options.configure;

  this.html = options.html;
};

var DmdOptions = function DmdOptions(options) {
  _classCallCheck(this, DmdOptions);

  var arrayify = require('array-back');

  this.template = options.template || '{{>main}}';

  this['heading-depth'] = options['heading-depth'] || 2;

  this['example-lang'] = options['example-lang'] || 'js';

  this.plugin = arrayify(options.plugin);

  this.helper = arrayify(options.helper);

  this.partial = arrayify(options.partial);

  this['name-format'] = options['name-format'];

  this['no-gfm'] = options['no-gfm'];

  this.separators = options.separators;

  this['module-index-format'] = options['module-index-format'] || 'dl';

  this['global-index-format'] = options['global-index-format'] || 'dl';

  this['param-list-format'] = options['param-list-format'] || 'table';

  this['property-list-format'] = options['property-list-format'] || 'table';

  this['member-index-format'] = options['member-index-format'] || 'grouped';

  this.private = options.private;
};

function stats(screenName, options, command, sync) {
  options = options || {};
  if (options['no-usage-stats']) {
    usageStats.disable();
    return command(options);
  } else {
    var _ret = function () {
      var debug = options.debug;
      usageStats.start();
      usageStats.screenView(screenName);
      if (options) {
        Object.keys(options).forEach(function (option) {
          var dontSend = ['files', 'source', 'template'];
          usageStats.event('option', option, dontSend.includes(option) ? undefined : options[option]);
        });
      }
      var req = usageStats.end().send({ debug: debug });
      if (debug) {
        req.then(function (response) {
          response.data = response.data ? response.data.toString() : response.data;
          console.error(require('util').inspect(response, { depth: 3, colors: true }));
        });
      }

      if (sync) {
        try {
          var output = command(options);
          if (!debug) usageStats.abort();
          return {
            v: output
          };
        } catch (err) {
          commandFailed(err, debug);
        }
      } else {
        return {
          v: command(options).then(function (output) {
            if (!debug) usageStats.abort();
            return output;
          }).catch(function (err) {
            commandFailed(err, debug);
          })
        };
      }
    }();

    if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
  }
}

function commandFailed(err, debug) {
  usageStats.exception(err.message, 1);
  var req = usageStats.end().send({ debug: debug });
  if (debug) {
    req.then(function (response) {
      console.error(require('util').inspect(response, { depth: 3, colors: true }));
    });
  }
  throw err;
}