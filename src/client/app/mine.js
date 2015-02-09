var Id = require('dht-id');

window.app = {
    init: function () {

        var R = 200 
        var peers = [];
       
        // create peers
        for (i=0;i<10;i++) {
            peers.push(new Id());
        }
        var zero = new Id(0);
        console.log(zero.toHex(), zero.toDec());
        var zeroString = new Id('000000000000');
        console.log(zeroString.toHex(), zeroString.toDec());

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
    var radId = id/(new Id(Id.spin()).toDec()/Math.PI);
    return {
        x: Math.sin(radId) * r,
        y: Math.cos(radId) * r
    };

}

