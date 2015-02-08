var Hapi = require('hapi');
var config = require('config');
var Path = require('path');

var server = new Hapi.Server();

server.connection({
    port: config.get('port'),
});

server.views({
    engines: {
        jade: require('jade')
    },
    relativeTo: __dirname,
    path: './views'
});

server.route({
    method: 'GET',
    path: '/{param*}',
    handler: {
        directory: {
            path: Path.join(__dirname, 'public')
        }
    }
});

server.route({
    method: 'GET',
    path: '/',
    handler: function(request, reply) {
        reply.view('index');
    }
});


server.start(function(err) {
    if (err) {
        throw err;
    }
    console.log('server started on :',  config.get('port'));
});
