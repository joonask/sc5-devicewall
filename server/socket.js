var _ = require('lodash');
var socketio = require('socket.io');

module.exports = function (app, options) {
  'use strict';
  var
    io = socketio(app),
    config = options.config,
    nsApp = io.of('/devicewallapp'),
    nsCtrl = io.of('/devicewall'),
    devices = require('./devices'),
    instances = require('./instances');

  // Device
  nsApp.on('connection', function (socket) {
    console.log('Test device connected!');

    socket.on('rename', rename);
    socket.on('update', update);
    socket.on('started', started);
    socket.on('idling', idling);
    socket.on('disconnect', disconnect);
    socket.on('check-platform', checkPlatform);

    function rename(data) {
      console.log("Client <<<< rename ", data);
      var device = devices.find(data.oldLabel);
      if (device) {
        if (devices.remove(data.oldLabel)) {
          console.log("Removed label " + data.oldLabel);
        } else {
          console.log("Unable to remove label " + data.oldLabel);
        }
        device.set('label', data.newLabel);
        devices.update(device.toJSON());
        console.log("Control >>>> rename ", data);
        nsCtrl.emit('rename', data);
      } else {
        console.log("Device label " + data.oldLabel + " does not exists");
      }
    }

    function update(data) {
      console.log("Client <<< update", data);
      var device;
      if (_.has(data, 'label') === false || data.label === '') {
        console.error("Client sent an empty label", data);
        return;
      }
      device = devices.update(data);
      if (device.get('userId')) {
        var instance = instances.find(device.get('userId'));
        if (instance) {
          if (instance.get('status') === 'running') {
            device.set('status', 'starting');
            console.log("Client >>> start", data);
            var startData = {
              labels: instance.get('labels'),
              url: instance.get('startUrl')
            };
            socket.emit('start', startData);
            instance.syncClientLocations();
          }
        }
      }
      console.log("Controlt >>>> update", devices.toJSON());
      nsCtrl.emit('update', devices.toJSON());
    }

    function started(label) {
      console.log("Client <<< started", label);
      var device = devices.find(label);
      if (device) {
        device.set('status', 'running');
        nsCtrl.emit('update', devices.toJSON());
      }
    }

    function idling(label) {
      console.log("Client <<< idling", label);
      var device = devices.find(label);
      if (device) {
        device.set('status', 'idle');
        device.set('updated', +new Date());
        devices.update(device.toJSON());
        app.emit('update-devices');
        console.log("Control >>>> update", devices.toJSON());
        nsCtrl.emit('update', devices.toJSON());
      }
    }

    function disconnect() {
      console.log("Client <<< disconnect");
    }

    function checkPlatform(data, fn) {
      console.log("Client <<< check-platform", data);
      var appPlatform = '';
      var device = devices.find(data.label);
      if (device) {
        appPlatform = device.appPlatform;
      }
      fn({appPlatform: appPlatform});
    }
  });

  // Control panel
  nsCtrl.on('connection', function (socket) {
    console.log('Control <<<< connection');
    // Start
    socket.on('start', start);
    socket.on('stop', stop);
    socket.on('stopall', stopAll);
    socket.on('disconnect', disconnect);
    socket.on('list', list);
    socket.on('save', save);
    socket.on('remove', removeDevices);
    socket.on('reload-devices', reloadDevices);
    if (process.env.NODE_ENV === "test") {
      socket.on('reset', resetAppData);
    }

    function start(data) {
      console.log("Control <<< start", data);
      instances.start(data).then(
        function(startData) {
          var appData = _.clone(data);
          appData.url = startData.startUrl;

          console.log('Control >> socket "update"');
          nsCtrl.emit('update', devices.toJSON());
          console.log('Control >> start"', data);
          nsCtrl.emit('start', data);
          console.log('Client >> start"', appData);
          nsApp.emit('start', appData);
        },
        function(reason) {
          var emitData = {user: data.user, reason: reason};
          console.log('Control >> server-stop', emitData);
          nsCtrl.emit('server-stop', emitData);
        }
      );
    }

    function stop(data) {
      console.log("Control <<< stop", data);
      instances.stop(data.user.id).then(function() {
        console.log('Control >> update', devices.toJSON());
        nsCtrl.emit('update', devices.toJSON());
        console.log('Control >> stop', data);
        nsCtrl.emit('stop', data);
      });
    }

    function stopAll() {
      console.log("Control <<< stopAll");
      instances.stopAll().done(function() {
        console.log('Control >> update', devices.toJSON());
        nsCtrl.emit('update', devices.toJSON());
        console.log('Control >> stopall');
        nsCtrl.emit('stopall');
      });
    }

    function disconnect () {
      console.log("Control <<< disconnect");
    }

    function list(data, fn) {
      console.log("Control <<< list");
      devices.sort();
      if (typeof(fn) === typeof(Function)) {
        fn(devices.toJSON());
      } else {
        console.log("not a function: ", fn);
      }
    }

    function save(data) {
      console.log("Control <<< save", data);
      var device = devices.find(data.label);
      if (device) {
        ['model', 'version', 'platform'].forEach(function(val) {
          if (data[val]) {
            device.set(val, data[val]);
          }
        });
        devices.update(device.toJSON());
      }
      app.emit('update-devices');
      socket.broadcast.emit('update', devices);
    }

    function removeDevices(data) {
      console.log("Control <<< remove", data);
      data.labels.forEach(function(label) {
        devices.remove(label);
      });
      app.emit('update-devices');
      socket.broadcast.emit('update', devices);
    }

    function reloadDevices() {
      console.log("Control <<< reload-devices");
      devices.read();
    }

    // only used with e2e tests
    function resetAppData() {
      console.info("Control <<< reset");
      instances.forceStopAll();
      //instances.stopAll().then(function() {
        console.info(">>> resetted");
        socket.emit("resetted");
      //});
      devices.removeAll();
    }
  });

  devices.init({config: config});
  devices.read();
  instances.init({
    config: config,
    devices: devices
  });
  setInterval(function() {
    devices.write();
  }, 10000);

};