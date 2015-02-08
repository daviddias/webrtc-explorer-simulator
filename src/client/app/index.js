var Id = require('dht-id');

window.app = {
    init: function () {
        console.log('starting');

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

        console.log('PEERS', peers);
        
        var vis = d3.select('#dht-ring')
                    .append('svg');

        vis.attr("width", 600)
            .attr("height", 600);

        var peer = vis.selectAll("circle.peers")
            .data(peers)
            .enter()
            .append("svg:circle")
            .attr("cx", function(peer) { return peer.coordinates.x + 1.2 * R + 50; })
            .attr("cy", function(peer) { return peer.coordinates.y + 1.2 * R; })
            .attr("r", "5px")
            .attr("fill", "black")

        peer.append("svg:text")
            .attr("dx", 12)
            .attr("dy", ".35em")
            .text(function(d) { return d.toHex(); });

            //.append("text").text(function(peer, i) { return peer.toHex(); });

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

