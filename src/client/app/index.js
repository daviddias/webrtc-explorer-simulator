var Id = require('dht-id');

window.app = {
    init: function () {
        console.log('starting');

        var R = 200 
        var peers = [];
       
        // create peers
        for (i=0;i<10;i++) {
            peers.push(new Id());
        }
        peers.push(new Id(0));        


        // add their coordinates 
        peers.forEach(function (peer) {
            peer.coordinates = cartesianCoordinates(peer.toDec(), R);
        });

       

        var vis = d3.select('#dht-ring')
                    .append('svg');

        vis.attr("width", 600)
            .attr("height", 600);

        var plane = vis.append("g")
                    //centering
                    .attr("transform", function(peer, i){
                        return "translate(" + 1.2*R + "," + 1.2*R + ")"; 
                    }) 

        var peer = plane.selectAll("circle.peers")
            .data(peers)
            .enter()
            .append("g")

        peer.append("svg:circle")
            .attr("r", "5px")
            .attr("fill", "black")

        peer.append("svg:text")
            .attr("dx", 5)  
            .attr("dy", ".35em")
            .attr("fill", "black")
            .text(function(d) { return d.toHex(); });


        peer.attr("transform", function(peer, i){
            
            console.log(i);

            return "translate(" + (peer.coordinates.x ) + "," + peer.coordinates.y + ")"; 
        })


        console.log('finished');


    }
};

window.app.init();



function cartesianCoordinates(id, r) {
    var fullSpin = new Id(Id.spin()).toDec()
    var radId = ((id/Id.spin())*2*Math.PI );

    return {
        x: Math.sin(-radId + Math.PI/2) * r ,
        y: Math.cos(-radId + Math.PI/2) * r 
    };

}
