var Id = require('dht-id');

window.app = {
    init: function () {
        console.log('starting');

        var id1 = new Id();

        console.log(cartesianCoordinates(id1.toDec(), 10));



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

