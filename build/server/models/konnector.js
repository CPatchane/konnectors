// Generated by CoffeeScript 1.9.3
var Konnector, americano, konnectorHash, log;

americano = require('cozydb');

konnectorHash = require('../lib/konnector_hash');

log = require('printit')({
  prefix: null,
  date: true
});

module.exports = Konnector = americano.getModel('Konnector', {
  slug: String,
  fieldValues: Object,
  password: {
    type: String,
    "default": '{}'
  },
  lastImport: Date,
  lastAutoImport: Date,
  isImporting: {
    type: Boolean,
    "default": false
  },
  importInterval: {
    type: String,
    "default": 'none'
  },
  errorMessage: {
    type: String,
    "default": null
  }
});

Konnector.all = function(callback) {
  return Konnector.request('all', function(err, konnectors) {
    if (konnectors == null) {
      konnectors = [];
    }
    konnectors.forEach(function(konnector) {
      return konnector.injectEncryptedFields();
    });
    return callback(err, konnectors);
  });
};

Konnector.prototype.injectEncryptedFields = function() {
  var error, name, parsedPasswords, results, val;
  try {
    parsedPasswords = JSON.parse(this.password);
    results = [];
    for (name in parsedPasswords) {
      val = parsedPasswords[name];
      results.push(this.fieldValues[name] = val);
    }
    return results;
  } catch (_error) {
    error = _error;
    if (this.fieldValues == null) {
      this.fieldValues = {};
    }
    this.fieldValues.password = this.password;
    this.password = {
      password: this.password
    };
    return log.info("Injecting encrypted fields : JSON.parse error : " + error);
  }
};

Konnector.prototype.getFields = function() {
  var ref;
  if (konnectorHash[this.slug] != null) {
    return (ref = konnectorHash[this.slug]) != null ? ref.fields : void 0;
  } else {
    return this.fields;
  }
};

Konnector.prototype.removeEncryptedFields = function(fields) {
  var name, password, type;
  if (fields == null) {
    log.warn("Fields variable undefined, use curren one instead.");
    fields = this.getFields();
  }
  password = {};
  for (name in fields) {
    type = fields[name];
    if (!(type === "password")) {
      continue;
    }
    password[name] = this.fieldValues[name];
    delete this.fieldValues[name];
  }
  return this.password = JSON.stringify(password);
};

Konnector.prototype.updateFieldValues = function(newKonnector, callback) {
  var data, fields;
  fields = this.getFields();
  this.fieldValues = newKonnector.fieldValues;
  this.removeEncryptedFields(fields);
  data = {
    fieldValues: this.fieldValues,
    password: this.password,
    importInterval: newKonnector.importInterval || this.importInterval
  };
  return this.updateAttributes(data, callback);
};

Konnector.prototype["import"] = function(callback) {
  return this.updateAttributes({
    isImporting: true
  }, (function(_this) {
    return function(err) {
      var data, konnectorModule;
      if (err != null) {
        log.error('An error occured while modifying konnector state');
        log.raw(err);
        data = {
          isImporting: false,
          lastImport: new Date()
        };
        return _this.updateAttributes(data, callback);
      } else {
        konnectorModule = konnectorHash[_this.slug];
        _this.injectEncryptedFields();
        return konnectorModule.fetch(_this.fieldValues, function(err, notifContent) {
          var fields;
          fields = _this.getFields();
          _this.removeEncryptedFields(fields);
          if ((err != null) && typeof err === 'object' && Object.keys(err).length > 0) {
            data = {
              isImporting: false,
              errorMessage: err
            };
            return _this.updateAttributes(data, function() {
              return callback(err, notifContent);
            });
          } else {
            data = {
              isImporting: false,
              lastImport: new Date(),
              errorMessage: null
            };
            return _this.updateAttributes(data, function(err) {
              return callback(err, notifContent);
            });
          }
        });
      }
    };
  })(this));
};

Konnector.prototype.appendConfigData = function() {
  var key, konnectorData, modelNames, msg, name, ref, value;
  konnectorData = konnectorHash[this.slug];
  if (konnectorData == null) {
    msg = ("Config data cannot be appended for konnector " + this.slug + ": ") + "missing config file.";
    throw new Error(msg);
  }
  for (key in konnectorData) {
    this[key] = konnectorData[key];
  }
  modelNames = [];
  ref = this.models;
  for (key in ref) {
    value = ref[key];
    name = value.toString();
    if (name.indexOf('Constructor' !== -1)) {
      name = name.substring(0, name.length - 'Constructor'.length);
    }
    modelNames.push(name);
  }
  this.modelNames = modelNames;
  return this;
};

Konnector.getKonnectorsToDisplay = function(callback) {
  return Konnector.all(function(err, konnectors) {
    var konnectorsToDisplay;
    if (err != null) {
      log.error('An error occured while retrieving konnectors');
      return callback(err);
    } else {
      try {
        konnectorsToDisplay = konnectors.filter(function(konnector) {
          return konnectorHash[konnector.slug] != null;
        }).map(function(konnector) {
          konnector.appendConfigData();
          return konnector;
        });
        return callback(null, konnectorsToDisplay);
      } catch (_error) {
        err = _error;
        log.error('An error occured while filtering konnectors');
        return callback(err);
      }
    }
  });
};
