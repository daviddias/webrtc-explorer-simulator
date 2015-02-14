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
