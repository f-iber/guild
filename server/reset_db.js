// Node deps
var path = require('path');
var fs = require('co-fs');
// 3rd party
var pg = require('co-pg')(require('pg'));
var co = require('co');
// 1st party
var db = require('./db');

////////////////////////////////////////////////////////////

function* slurpSql(filePath) {
  var relativePath = '../sql/' + filePath;
  var fullPath = path.join(__dirname, relativePath);
  return yield fs.readFile(fullPath, 'utf8');
}

var succBack = function() { console.log('Database reset!'); };
var errBack = function(err) { console.error('Caught error: ', err, err.stack); };

co(function*() {
  console.log('Resetting the database...');
  var sql = yield slurpSql('schema.sql');
  yield db.query(sql);
  var sql = yield slurpSql('dev_seeds.sql');
  yield db.query(sql);
}).then(succBack, errBack);