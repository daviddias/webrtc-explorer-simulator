(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],2:[function(require,module,exports){
(function (process){
"use strict";

var isNode = typeof process === 'object' &&
             typeof process.versions === 'object' &&
             process.versions.node &&
             process.__atom_type !== "renderer";

var shared, create, crypto;
if (isNode) {
  var nodeRequire = require; // Prevent mine.js from seeing this require
  crypto = nodeRequire('crypto');
  create = createNode;
}
else {
  shared = new Uint32Array(80);
  create = createJs;
}


// Input chunks must be either arrays of bytes or "raw" encoded strings
module.exports = function sha1(buffer) {
  if (buffer === undefined) return create(false);
  var shasum = create(true);
  shasum.update(buffer);
  return shasum.digest();
};

// Use node's openssl bindings when available
function createNode() {
  var shasum = crypto.createHash('sha1');
  return {
    update: function (buffer) {
      return shasum.update(buffer);
    },
    digest: function () {
      return shasum.digest('hex');
    }
  };
}

// A pure JS implementation of sha1 for non-node environments.
function createJs(sync) {
  var h0 = 0x67452301;
  var h1 = 0xEFCDAB89;
  var h2 = 0x98BADCFE;
  var h3 = 0x10325476;
  var h4 = 0xC3D2E1F0;
  // The first 64 bytes (16 words) is the data chunk
  var block, offset = 0, shift = 24;
  var totalLength = 0;
  if (sync) block = shared;
  else block = new Uint32Array(80);

  return { update: update, digest: digest };

  // The user gave us more data.  Store it!
  function update(chunk) {
    if (typeof chunk === "string") return updateString(chunk);
    var length = chunk.length;
    totalLength += length * 8;
    for (var i = 0; i < length; i++) {
      write(chunk[i]);
    }
  }

  function updateString(string) {
    var length = string.length;
    totalLength += length * 8;
    for (var i = 0; i < length; i++) {
      write(string.charCodeAt(i));
    }
  }


  function write(byte) {
    block[offset] |= (byte & 0xff) << shift;
    if (shift) {
      shift -= 8;
    }
    else {
      offset++;
      shift = 24;
    }
    if (offset === 16) processBlock();
  }

  // No more data will come, pad the block, process and return the result.
  function digest() {
    // Pad
    write(0x80);
    if (offset > 14 || (offset === 14 && shift < 24)) {
      processBlock();
    }
    offset = 14;
    shift = 24;

    // 64-bit length big-endian
    write(0x00); // numbers this big aren't accurate in javascript anyway
    write(0x00); // ..So just hard-code to zero.
    write(totalLength > 0xffffffffff ? totalLength / 0x10000000000 : 0x00);
    write(totalLength > 0xffffffff ? totalLength / 0x100000000 : 0x00);
    for (var s = 24; s >= 0; s -= 8) {
      write(totalLength >> s);
    }

    // At this point one last processBlock() should trigger and we can pull out the result.
    return toHex(h0) +
           toHex(h1) +
           toHex(h2) +
           toHex(h3) +
           toHex(h4);
  }

  // We have a full block to process.  Let's do it!
  function processBlock() {
    // Extend the sixteen 32-bit words into eighty 32-bit words:
    for (var i = 16; i < 80; i++) {
      var w = block[i - 3] ^ block[i - 8] ^ block[i - 14] ^ block[i - 16];
      block[i] = (w << 1) | (w >>> 31);
    }

    // log(block);

    // Initialize hash value for this chunk:
    var a = h0;
    var b = h1;
    var c = h2;
    var d = h3;
    var e = h4;
    var f, k;

    // Main loop:
    for (i = 0; i < 80; i++) {
      if (i < 20) {
        f = d ^ (b & (c ^ d));
        k = 0x5A827999;
      }
      else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ED9EBA1;
      }
      else if (i < 60) {
        f = (b & c) | (d & (b | c));
        k = 0x8F1BBCDC;
      }
      else {
        f = b ^ c ^ d;
        k = 0xCA62C1D6;
      }
      var temp = (a << 5 | a >>> 27) + f + e + k + (block[i]|0);
      e = d;
      d = c;
      c = (b << 30 | b >>> 2);
      b = a;
      a = temp;
    }

    // Add this chunk's hash to result so far:
    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;

    // The block is now reusable.
    offset = 0;
    for (i = 0; i < 16; i++) {
      block[i] = 0;
    }
  }

  function toHex(word) {
    var hex = "";
    for (var i = 28; i >= 0; i -= 4) {
      hex += ((word >> i) & 0xf).toString(16);
    }
    return hex;
  }

}

}).call(this,require('_process'))
},{"_process":1}],3:[function(require,module,exports){
var sha1 = require('git-sha1');

exports = module.exports = Id;

var maxHex = 'ffffffffffff';
var maxDec = parseInt(maxHex, 16);

function Id(_id) {
    var dec;
    var hex;

    if (typeof _id === 'number') {
        dec = _id;
        var tmp = ('00000000000000' + _id.toString(16));
        hex = tmp.substring(tmp.length - 12, tmp.length);
    }
    if (typeof _id === 'string') {
        dec = parseInt(_id, 16);
        hex = _id;
    }
    if (typeof _id === 'undefined') {
        hex = sha1((~~(Math.random() * 1e9)).toString(36) + Date.now())
            .substring(0, 12);
        dec = parseInt(hex, 16);
    }

    this.toHex = function() {
        return hex;
    };

    this.toDec = function() {
        return dec;
    };

    this.next = function() {
        if (hex === maxHex) {
            return '000000000000';
        } else {
            var a = ('000000000000' + ((dec + 1).toString(16)));
            return a.substring(a.length - 12, a.length);
        }
    };

    return this;
}

//
// bigger Id than available to make the message spin the ring
//
exports.spin = function() {
    return (maxDec + 1).toString(16);
};

//
// returns the Id in a hex value, which correspondes to the hash of the content
//
exports.hash = function(content) {
    return sha1(content).substring(0, 12);
};

},{"git-sha1":2}],4:[function(require,module,exports){
/*!
  * domready (c) Dustin Diaz 2014 - License MIT
  */
!function (name, definition) {

  if (typeof module != 'undefined') module.exports = definition()
  else if (typeof define == 'function' && typeof define.amd == 'object') define(definition)
  else this[name] = definition()

}('domready', function () {

  var fns = [], listener
    , doc = document
    , hack = doc.documentElement.doScroll
    , domContentLoaded = 'DOMContentLoaded'
    , loaded = (hack ? /^loaded|^c/ : /^loaded|^i|^c/).test(doc.readyState)


  if (!loaded)
  doc.addEventListener(domContentLoaded, listener = function () {
    doc.removeEventListener(domContentLoaded, listener)
    loaded = 1
    while (listener = fns.shift()) listener()
  })

  return function (fn) {
    loaded ? fn() : fns.push(fn)
  }

});

},{}],5:[function(require,module,exports){
"use strict";
var window = require("global/window")
var once = require("once")
var parseHeaders = require("parse-headers")


var XHR = window.XMLHttpRequest || noop
var XDR = "withCredentials" in (new XHR()) ? XHR : window.XDomainRequest

module.exports = createXHR

function createXHR(options, callback) {
    function readystatechange() {
        if (xhr.readyState === 4) {
            loadFunc()
        }
    }

    function getBody() {
        // Chrome with requestType=blob throws errors arround when even testing access to responseText
        var body = undefined

        if (xhr.response) {
            body = xhr.response
        } else if (xhr.responseType === "text" || !xhr.responseType) {
            body = xhr.responseText || xhr.responseXML
        }

        if (isJson) {
            try {
                body = JSON.parse(body)
            } catch (e) {}
        }

        return body
    }
    
    var failureResponse = {
                body: undefined,
                headers: {},
                statusCode: 0,
                method: method,
                url: uri,
                rawRequest: xhr
            }
    
    function errorFunc(evt) {
        clearTimeout(timeoutTimer)
        if(!(evt instanceof Error)){
            evt = new Error("" + (evt || "unknown") )
        }
        evt.statusCode = 0
        callback(evt, failureResponse)
    }

    // will load the data & process the response in a special response object
    function loadFunc() {
        clearTimeout(timeoutTimer)
        
        var status = (xhr.status === 1223 ? 204 : xhr.status)
        var response = failureResponse
        var err = null
        
        if (status !== 0){
            response = {
                body: getBody(),
                statusCode: status,
                method: method,
                headers: {},
                url: uri,
                rawRequest: xhr
            }
            if(xhr.getAllResponseHeaders){ //remember xhr can in fact be XDR for CORS in IE
                response.headers = parseHeaders(xhr.getAllResponseHeaders())
            }
        } else {
            err = new Error("Internal XMLHttpRequest Error")
        }
        callback(err, response, response.body)
        
    }
    
    if (typeof options === "string") {
        options = { uri: options }
    }

    options = options || {}
    if(typeof callback === "undefined"){
        throw new Error("callback argument missing")
    }
    callback = once(callback)

    var xhr = options.xhr || null

    if (!xhr) {
        if (options.cors || options.useXDR) {
            xhr = new XDR()
        }else{
            xhr = new XHR()
        }
    }

    var key
    var uri = xhr.url = options.uri || options.url
    var method = xhr.method = options.method || "GET"
    var body = options.body || options.data
    var headers = xhr.headers = options.headers || {}
    var sync = !!options.sync
    var isJson = false
    var timeoutTimer

    if ("json" in options) {
        isJson = true
        headers["Accept"] || (headers["Accept"] = "application/json") //Don't override existing accept header declared by user
        if (method !== "GET" && method !== "HEAD") {
            headers["Content-Type"] = "application/json"
            body = JSON.stringify(options.json)
        }
    }

    xhr.onreadystatechange = readystatechange
    xhr.onload = loadFunc
    xhr.onerror = errorFunc
    // IE9 must have onprogress be set to a unique function.
    xhr.onprogress = function () {
        // IE must die
    }
    xhr.ontimeout = errorFunc
    xhr.open(method, uri, !sync)
    //has to be after open
    xhr.withCredentials = !!options.withCredentials
    
    // Cannot set timeout with sync request
    // not setting timeout on the xhr object, because of old webkits etc. not handling that correctly
    // both npm's request and jquery 1.x use this kind of timeout, so this is being consistent
    if (!sync && options.timeout > 0 ) {
        timeoutTimer = setTimeout(function(){
            xhr.abort("timeout");
        }, options.timeout+2 );
    }

    if (xhr.setRequestHeader) {
        for(key in headers){
            if(headers.hasOwnProperty(key)){
                xhr.setRequestHeader(key, headers[key])
            }
        }
    } else if (options.headers) {
        throw new Error("Headers cannot be set on an XDomainRequest object")
    }

    if ("responseType" in options) {
        xhr.responseType = options.responseType
    }
    
    if ("beforeSend" in options && 
        typeof options.beforeSend === "function"
    ) {
        options.beforeSend(xhr)
    }

    xhr.send(body)

    return xhr


}


function noop() {}

},{"global/window":6,"once":7,"parse-headers":11}],6:[function(require,module,exports){
(function (global){
if (typeof window !== "undefined") {
    module.exports = window;
} else if (typeof global !== "undefined") {
    module.exports = global;
} else if (typeof self !== "undefined"){
    module.exports = self;
} else {
    module.exports = {};
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],7:[function(require,module,exports){
module.exports = once

once.proto = once(function () {
  Object.defineProperty(Function.prototype, 'once', {
    value: function () {
      return once(this)
    },
    configurable: true
  })
})

function once (fn) {
  var called = false
  return function () {
    if (called) return
    called = true
    return fn.apply(this, arguments)
  }
}

},{}],8:[function(require,module,exports){
var isFunction = require('is-function')

module.exports = forEach

var toString = Object.prototype.toString
var hasOwnProperty = Object.prototype.hasOwnProperty

function forEach(list, iterator, context) {
    if (!isFunction(iterator)) {
        throw new TypeError('iterator must be a function')
    }

    if (arguments.length < 3) {
        context = this
    }
    
    if (toString.call(list) === '[object Array]')
        forEachArray(list, iterator, context)
    else if (typeof list === 'string')
        forEachString(list, iterator, context)
    else
        forEachObject(list, iterator, context)
}

function forEachArray(array, iterator, context) {
    for (var i = 0, len = array.length; i < len; i++) {
        if (hasOwnProperty.call(array, i)) {
            iterator.call(context, array[i], i, array)
        }
    }
}

function forEachString(string, iterator, context) {
    for (var i = 0, len = string.length; i < len; i++) {
        // no such thing as a sparse string.
        iterator.call(context, string.charAt(i), i, string)
    }
}

function forEachObject(object, iterator, context) {
    for (var k in object) {
        if (hasOwnProperty.call(object, k)) {
            iterator.call(context, object[k], k, object)
        }
    }
}

},{"is-function":9}],9:[function(require,module,exports){
module.exports = isFunction

var toString = Object.prototype.toString

function isFunction (fn) {
  var string = toString.call(fn)
  return string === '[object Function]' ||
    (typeof fn === 'function' && string !== '[object RegExp]') ||
    (typeof window !== 'undefined' &&
     // IE8 and below
     (fn === window.setTimeout ||
      fn === window.alert ||
      fn === window.confirm ||
      fn === window.prompt))
};

},{}],10:[function(require,module,exports){

exports = module.exports = trim;

function trim(str){
  return str.replace(/^\s*|\s*$/g, '');
}

exports.left = function(str){
  return str.replace(/^\s*/, '');
};

exports.right = function(str){
  return str.replace(/\s*$/, '');
};

},{}],11:[function(require,module,exports){
var trim = require('trim')
  , forEach = require('for-each')
  , isArray = function(arg) {
      return Object.prototype.toString.call(arg) === '[object Array]';
    }

module.exports = function (headers) {
  if (!headers)
    return {}

  var result = {}

  forEach(
      trim(headers).split('\n')
    , function (row) {
        var index = row.indexOf(':')
          , key = trim(row.slice(0, index)).toLowerCase()
          , value = trim(row.slice(index + 1))

        if (typeof(result[key]) === 'undefined') {
          result[key] = value
        } else if (isArray(result[key])) {
          result[key].push(value)
        } else {
          result[key] = [ result[key], value ]
        }
      }
  )

  return result
}
},{"for-each":8,"trim":10}],12:[function(require,module,exports){
var Id = require('dht-id');
// var dht = require('./example.json');
var domready = require('domready');
var xhr = require("xhr");

window.app = {
    init: function () {
        domready(function(){
            
            document
                .getElementById('visualize')
                .addEventListener('click', fetchDHT);
        
        });
    }
};

window.app.init();

function fetchDHT(){
    xhr({
        uri: "http://localhost:9000/dht",
        headers: {
            "Content-Type": "application/json"
        }
    }, function (err, resp, body) {
        drawDHT(JSON.parse(body)); 
    }); 
}

function cartesianCoordinates(id, r) {
    var maxId = new Id(Id.spin()).toDec();
    var radId = id / (maxId / (2 * Math.PI));

    return {
        y: Math.sin(radId - Math.PI / 2) * r ,
        x: Math.cos(radId - Math.PI / 2) * r 
    };

}

function drawDHT(dht) {

    var R = 200 
    var peers = [];

    Object.keys(dht).map(function (key){
        var peer = {
            peerId: key,
            fingerTable: dht[key].fingerTable,
            predecessorId: dht[key].predecessorId
        };

        peers.push(peer);
        //Add the peer to the global table too to
        //make it easier to lookup coords by id
        console.log('fill in peer');
        dht[key].peer = peer;
    });

    // add their coordinates 
    peers.forEach(function (peer) {
        peer.coordinates = cartesianCoordinates(
            new Id(peer.peerId).toDec(), R);
    });

    var vis = d3.select('#dht-ring')
                .append('svg');

    vis.attr("width", 600)
       .attr("height", 600);

    var plane = vis.append("g")
                    //centering
                    .attr("transform", function(peer, i){
                        return "translate(" + 1.2 * R + "," + 1.2 * R + ")"; 
                    })

    //separate the overall peer selection, from the on-enter-groups
    var peer = plane.selectAll("peers")
                    .data(peers);

    var gs = peer.enter()
                 .append("g")

    gs.append("svg:circle")
      .attr("r", "4px")
      .attr("fill", "black")

    gs.append("svg:text")
      .attr("dx", 5)
      .attr("dy", ".35em")
      .attr("fill", "black")
      .text(function(peer) { return peer.peerId; });

    gs.attr("transform", function(peer, i){
        return "translate(" + (peer.coordinates.x ) + "," + peer.coordinates.y + ")"; 
    });

    var arcBetween = function (source, target) {
        var dx = target.coordinates.x - source.coordinates.x;
        var dy = target.coordinates.y - source.coordinates.y;
        var dr = Math.sqrt(dx * dx + dy * dy);

        //We want to draw the line from 0,0 of the group (which is where
        //the dot is rendered), to the delta of the too points, since we
        //are drawing relative to the source position, not the canvas
        return "M" + 0 +
            "," + 0 +
            "A" + dr +
            "," + dr +
            " 0 0,1 " + dx +
            "," + dy;
    };

    //Create a new sub-selection joining source's to their fingers
    var links = peer.selectAll('.links')
                    .data(function (d) {
                        //Should return the nested dataset, in this case an array of
                        // [arcId, sourcePeer, targetPeer]
                        var arcs = Object.keys(d.fingerTable).map(function (key) {
                            return {
                                arcId: d.peerId + '-' + key,
                                source: d,
                                target: dht[d.fingerTable[key].current].peer
                            };
                        });
                        
                        return arcs;
                    });

    //for all the links (a nested selection across sources and targets
    //draw an arc
    links.enter()
         .append("path")
         .attr('class', 'link')
         .attr("d", function (link) {
            return arcBetween(link.source, link.target);
         });

}

},{"dht-id":3,"domready":4,"xhr":5}]},{},[12]);
