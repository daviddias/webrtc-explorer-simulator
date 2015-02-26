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
(function (process){
var Id = require('dht-id');
// var dht = require('./example.json');
var domready = require('domready');

var dht = {};

window.app = {
    init: function () {
        domready(function(){
            
            document
                .getElementById('simulate')
                .addEventListener('click', buildDHT);
        
        });
    }
};

window.app.init();

function buildDHT(){
    createPeers();
    updateFingers();
    drawDHT();
    maxNumberHops();
}

/// 

function createPeers() {
    var nPeers = parseInt(document.getElementById('n_peers').value);
    var fingers = JSON
        .parse('[' + document.getElementById('fingers').value + ']');

    fingers = fingers.map(function(number) {
        return parseInt(number);
    });
    console.log('>', nPeers, fingers);
   
    for (var i = 0; i < nPeers; i++) {
        var peerId = new Id();
        dht[peerId.toHex()] = {
            fingerTable: {}
        };

        calculateIdealFingers(peerId, fingers); 
    }
}

function calculateIdealFingers(pId, fingers) {
    var k = 1; 
    while (k <= fingers.length) {
        console.log('f> ', fingers[k-1]); 
        var ideal = (pId.toDec() + Math.pow(2, fingers[k - 1])) %
            Math.pow(2, 48);
        
        console.log('ideal: ', ideal);
        ideal = new Id(ideal);
        
        dht[pId.toHex()].fingerTable[k] = {
            ideal: ideal.toHex(),
            current: undefined
        };

        k++;

        console.log('CIF',
                    pId.toHex(),
                    ideal.toHex(),
                    pId.toDec(),
                    ideal.toDec(),
                    k-1);
    }
}




///

function updateFingers() {
    console.log('update-fingers', dht);

    var sortedPeersId = Object.keys(dht).sort(function(a, b) {
        var aId = new Id(a);
        var bId = new Id(b);
        if (aId.toDec() > bId.toDec()) {
            return 1;
        }
        if (aId.toDec() < bId.toDec()) {
            return -1;
        }
        if (aId.toDec() === bId.toDec()) {
            console.log('error - There should never two identical ids');
            process.exit(1);
        }
    });

    sortedPeersId.forEach(function(peerId) {

        Object.keys(dht[peerId].fingerTable).forEach(function(rowIndex) {
            var fingerId = sucessorTo(dht[peerId]
                                .fingerTable[rowIndex]
                                .ideal, sortedPeersId);

            if (dht[peerId].fingerTable[rowIndex].current !== fingerId) {
                dht[peerId].fingerTable[rowIndex].current = fingerId;
            } 
        });
    });

    function sucessorTo(pretendedId, sortedIdList) {
        pretendedId = new Id(pretendedId).toDec();
        sortedIdList = sortedIdList.map(function(inHex) {
            return new Id(inHex).toDec();
        });

        var sucessorId;
        sortedIdList.some(function(value, index) {
            if (pretendedId === value) {
                sucessorId = value;
                return true;
            }

            if (pretendedId < value) {
                sucessorId = value;
                return true;
            }

            if (index + 1 === sortedIdList.length) {
                sucessorId = sortedIdList[0];
                return true;
            }
        });

        return new Id(sucessorId).toHex();
    }
}

///

function maxNumberHops() {
    console.log('max number of hops is: ', 'TODO');
}


///

function cartesianCoordinates(id, r) {
    var maxId = new Id(Id.spin()).toDec();
    var radId = id / (maxId / (2 * Math.PI));

    return {
        y: Math.sin(radId - Math.PI / 2) * r ,
        x: Math.cos(radId - Math.PI / 2) * r 
    };

}

function drawDHT() {

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

}).call(this,require('_process'))
},{"_process":1,"dht-id":3,"domready":4}]},{},[5]);
