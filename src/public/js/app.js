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

    if (_id && (typeof _id === 'number')) {
        dec = _id;
        var tmp = ('00000000000000' + _id.toString(16));
        hex = tmp.substring(tmp.length - 12, tmp.length);
    } else if (_id && (typeof _id === 'string')) {
        dec = parseInt(_id, 16);
        hex = _id;
    } else {
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
var Id = require('dht-id');

window.app = {
    init: function () {

        var R = 150 
        var peers = [];
       
        // create peers
        for (i=0;i<10;i++) {
            peers.push(new Id());
        }
        
        // add their coordinates 
        peers.forEach(function (peer) {
            peer.coordinates = cartesianCoordinates(peer.toDec(), R);
        });

        var vis = d3.select('#dht-ring')
                    .append('svg');

        vis.attr("width", 600)
            .attr("height", 600);

        var peer = vis.selectAll("circle.peers")
            .data(peers)
            .enter()
            .append("g")
            .attr("class", "peer")

            
        peer.append("svg:circle")
            .attr("cx", function(peer) { return peer.coordinates.x + 1.2 * R + 50; })
            .attr("cy", function(peer) { return peer.coordinates.y + 1.2 * R; })
            .attr("r", "5px")
            .attr("fill", "black")

        peer.append("svg:text")
            .attr("dx", 4)
            .attr("dy", ".15em")
            .text(function(d) { return d.toHex(); })
            .attr("transform", function(d, i) {
                        var x = d.coordinates.x + 1.2 * R + 50;
                        var y = d.coordinates.y + 1.2 * R;
                        return "translate(" + x + "," + y + ")"; 
                            })

        console.log('finished');

    }
};

window.app.init();

function cartesianCoordinates(id, r) {
    var radId = id/(Id.spin()/Math.PI);
    return {
        x: Math.sin(radId) * r,
        y: Math.cos(radId) * r
    };

}


},{"dht-id":3}]},{},[4]);
