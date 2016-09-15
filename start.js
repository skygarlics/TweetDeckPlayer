const Util = require('./util');
const request = require('request');
const crypto = require('crypto');
const fs = require('fs');
const originalFs = require('original-fs')
const async = require('async');

const REVISION = 2000;
const updateURL = "https://github.com/sokcuri/TweetDeckPlayer-dist/raw/master/update.json";
const asarFile = Util.getUserDataPath() + 'main.asar';
const asarDownFile = Util.getUserDataPath() + 'main.asar.download';
const asarHashFile = Util.getUserDataPath() + 'main.asar.hash';

// bypass main.asar
const forceIndex = false;

function getHash(fileName)
{
  try
  {
    var shasum = crypto.createHash('sha1');
    var s = originalFs.readFileSync(fileName, 'binary');
    return shasum.update(s).digest('hex');
  }
  catch (e)
  {
    return -1;
  }
}

function run()
{
  var hash_key = "";
  var json;
  var url;

  try {
    hash_key = fs.readFileSync(asarHashFile);
  } catch (e) {
    hash_key = "";
  }

  async.series([
    function(callback){
      request(updateURL + '?' + new Date().getTime(),
      function (error, response, body) {
        try
        {
          json = JSON.parse(body);
          callback(null);
        }
        catch (e) {}
      });
    },
    function(callback){
      for(item of json)
      {
        if (REVISION >= item.revision &&
          (getHash(asarFile) != hash_key &&
            getHash(asarDownFile) != hash_key))
        {
          console.log('asarHash: ' + getHash(asarFile));
          console.log('asarDownHash: ' + getHash(asarDownFile));
          console.log('hash_key: ' + hash_key);
          callback(null);
        }
      }
    },
    function(callback){
      request({
        encoding: null,
        url: item.asar + '?' + new Date().getTime()}
        , function (error, response, body) {
        if (!error && response.statusCode == 200) {
          var s = originalFs.createWriteStream(asarDownFile);
          s.write(body);
          s.end();
          var s2 = originalFs.createWriteStream(asarHashFile);
          s2.write(item["asar-hash"].toLowerCase());
          s2.end();
          console.log("Downloaded main.asar");
        }
        else {
          console.log(error);
        }
      });
    }
  ]);

  async.series([
    function(callback)
    {
      if (getHash(asarFile) == hash_key)
      {
        console.log('hash key equal. passed');
        try
        {
          originalFs.unlinkSync(asarDownFile);
        }
        catch(e) {}
        callback(null);
      }
      else if (getHash(asarDownFile) == -1)
      {
        callback(null);
      }
      else if (getHash(asarDownFile) == hash_key)
      {
        console.log('rename start');
        originalFs.rename(asarDownFile, asarFile, err => {
        if (!err) console.log('renamed complete');
        try
        {
          originalFs.unlinkSync(asarDownFile);
        }
        catch(e) {}
        callback(null);
        });
      }
      else
      {
        console.log("Hash Mismatch");
        console.log("down: " + getHash(asarDownFile));
        console.log("hash: " + hash_key);
        callback(null);
      }
    },
    function(callback)
    {
      reqIndex();
    }
  ]);
}

function reqIndex()
{
  try {
    if (forceIndex) throw 0;
    require(Util.getUserDataPath() + 'main.asar/index.js');
    console.log("Running to main.asar.");
  }
  catch (e) {
    require('./index.js');
    console.log("Running to index.js.");
  } 
}

if (forceIndex)
  reqIndex();
else
  run();