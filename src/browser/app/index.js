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
