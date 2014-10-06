angular.module('DeviceWall', [
  'ngResource',
  'ngRoute',
  'mm.foundation',
  'ngLodash',
  'templates',
  'configuration'
])
.factory('socket', function ($q, $rootScope, $timeout, socketFactory, SOCKET_SERVER) {
  var socket = $q.defer();

  $rootScope.$on('ready', function() {
    $timeout(function() {
      var newSocket = (function() {
        return socketFactory({
          ioSocket: io.connect(SOCKET_SERVER)
        });
      })();
      socket.resolve(newSocket);
    });
  });
  return socket.promise;
})
.config(function($routeProvider, $locationProvider) {
  $routeProvider.
    when('/', {
      templateUrl: 'assets/views/main.html',
      controller: 'MainController'
    }).
    otherwise({
      redirectTo: '/'
    });

    $locationProvider.html5Mode(true);
});
