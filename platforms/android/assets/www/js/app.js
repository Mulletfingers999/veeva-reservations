// We use an "Immediate Function" to initialize the application to avoid leaving anything behind in the global scope
(function () {
    /* ---------------------------------- Local Variables ---------------------------------- */
    var homeTpl = Handlebars.compile($("#home-tpl").html());
    var employeeListTpl = Handlebars.compile($("#employee-list-tpl").html());

    var service = new EmployeeService();
    service.initialize().done(function () {
      renderHomeView();
    });

    /* --------------------------------- Event Registration -------------------------------- */
    //$('.search-key').on('keyup', findByName);
    /*$('.help-btn').on('click', function() {
        alert("Employee Directory v3.4");
    });*/

    document.addEventListener('deviceready', function () {

      //Define some default stuff
      StatusBar.overlaysWebView( false );
      StatusBar.backgroundColorByHexString('#ffffff');
      StatusBar.styleDefault();
      if (navigator.notification) { // Override default HTML alert with native dialog
        window.alert = function (message) {
          navigator.notification.alert(
            message,    // message
            null,       // callback
            "Message from app", // title
            'OK'        // buttonName
          );
        };
      }
    }, false);

/*document.addEventListener("deviceready", init, false);
function init() {
	document.querySelector("#scan").addEventListener("touchend", scan, false);
	resultDiv = document.querySelector("#results");
}*/

    /* ---------------------------------- Local Functions ---------------------------------- */
    function findByName() {
      service.findByName($('.search-key').val()).done(function (employees) {
        $('.content').html(employeeListTpl(employees));
      });
    }

    function renderHomeView() {
      $('body').html(homeTpl());
      $('.search-key').on('keyup', findByName);
    }

    /* ---------------------------------- Google Calendar --------------------------------- */
    function newEvent(room) {
      room = "" + room;

    }

    /* ---------------------------------- Barcode Scanner ---------------------------------- */
    function scan() {
      //Scanning function
      cordova.plugins.barcodeScanner.scan(
        function (result) {
          if (result.cancelled == true) {
            alert('ERR: Barcode Scanning Canceled');
          } else {
            if (result.format != "QR_CODE") {
              alert('ERR: You didn\'t scan a QR Code! Nonetheless, it returned this value: ' + result.text);
            } else {
              //No errors, procide...
              //alert('Yay! It worked! \nValue returned:' + result.text + '\n' + 'Code Type: ' + result.format);
              newEvent(result.text);
            }
          }
        },
        function (error) {
          alert("Scanning failed: " + error);
        }
      );
    }

    /* ----------------------------------- Google Api Crap --------------------------------- */

    var googleapi = {
      authorize: function(options) {
        var deferred = $.Deferred();

        //Build the OAuth consent page URL
        var authUrl = 'https://accounts.google.com/o/oauth2/auth?' + $.param({
          client_id: options.client_id,
          redirect_uri: options.redirect_uri,
          response_type: 'code',
          scope: options.scope
        });

        //Open the OAuth consent page in the InAppBrowser
        var authWindow = window.open(authUrl, '_blank', 'location=no,toolbar=no');

        //The recommendation is to use the redirect_uri "urn:ietf:wg:oauth:2.0:oob"
        //which sets the authorization code in the browser's title. However, we can't
        //access the title of the InAppBrowser.
        //
        //Instead, we pass a bogus redirect_uri of "http://localhost", which means the
        //authorization code will get set in the url. We can access the url in the
        //loadstart and loadstop events. So if we bind the loadstart event, we can
        //find the authorization code and close the InAppBrowser after the user
        //has granted us access to their data.
        $(authWindow).on('loadstart', function(e) {
          var url = e.originalEvent.url;
          var code = /\?code=(.+)$/.exec(url);
          var error = /\?error=(.+)$/.exec(url);

          if (code || error) {
            //Always close the browser when match is found
            authWindow.close();
          }

          if (code) {
            //Exchange the authorization code for an access token
            $.post('https://accounts.google.com/o/oauth2/token', {
              code: code[1],
              client_id: options.client_id,
              client_secret: options.client_secret,
              redirect_uri: options.redirect_uri,
              grant_type: 'authorization_code'
            }).done(function(data) {
              deferred.resolve(data);
            }).fail(function(response) {
              deferred.reject(response.responseJSON);
            });
          } else if (error) {
            //The user denied access to the app
            deferred.reject({
              error: error[1]
            });
          }
        });

        return deferred.promise();
      }
    };

    /*function listEvents() {
      alert('running');
      var request = googleapi.client.calendar.events.list({
        'calendarId': 'primary',
        'timeMin': (new Date()).toISOString(),
        'showDeleted': false,
        'singleEvents': true,
        'maxResults': 10,
        'orderBy': 'startTime'
      });

      request.execute(function(resp) {
        var events = resp.items;
        alert('Upcoming events:');

        if (events.length > 0) {
          for (i = 0; i < events.length; i++) {
            var event = events[i];
            var when = event.start.dateTime;
            if (!when) {
              when = event.start.date;
            }
            alert(event.summary + ' (' + when + ')')
          }
        } else {
          alert('No upcoming events found.');
        }

      });
    }

    function getGoogleMeStatus(token) {
      alert('yup the funcs workin');
      var xhr = new XMLHttpRequest();

      var url='https://www.googleapis.com/plus/v1/people/me?fields=birthday%2CcurrentLocation%2CdisplayName%2Cemails%2Cgender%2Cid%2Cimage&access_token='+token;

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            $('#output p').html(xhr.responseText);
          } else {
            var error = xhr.responseText ? JSON.parse(xhr.responseText).error : {message: 'An error has occurred'};
            $('#output p').html(error.message);
          }
        }
      };

      xhr.open('GET', url, true);
      xhr.send();
    }*/

    $(document).on('deviceready', function() {
      var $loginButton = $('#login a');
      var $loginStatus = $('#login p');

      $loginButton.on('click', function() {
        googleapi.authorize({
          client_id: '742441378089-o41dmn9ri0jtj9lqdv55kn8goqgdr67k.apps.googleusercontent.com',
          redirect_uri: 'http://localhost',
          scope: 'https://www.googleapis.com/auth/calendar https://apps-apis.google.com/a/feeds/calendar/resource/ email'
        }).done(function(data) {
          //Getting the user's domain


          //google calendar events
          var xhr = new XMLHttpRequest();

          var url='https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=' + (new Date()).toISOString() +
            '&singleEvents=true&orderBy=startTime&access_token='+data.access_token;

          xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
              if (xhr.status === 200) {
                $('#output p').html('Full XHR GAPI Response:\n' + xhr.responseText);
                alert('Full XHR GAPI Response: ' + xhr.responseText)

                var response = $.parseJSON(xhr.responseText);
                var events = response;
                if ($.isEmptyObject(events) == false) {

                  $.each(events['items'], function(i, val) {
                    //alert(i);alert(val);
                    /*if ('' + i == 'summary') {
                      alert('Event name: ' + val)
                    } else if ('' + i == 'description') {
                      alert('Event Description: ' + val)
                    } else {
                      //continue
                    }*/

                    $.each(val, function(ind, value) {
                      //alert(ind + '    ' + value);
                      if ('' + ind == 'summary') {
                        alert('Event name: ' + value);
                      } else if ('' + ind == 'description') {
                        alert('Event Description: ' + value);
                      } else {
                        //continue
                      }
                    });
                  });

                  /*for (i = 0; i < events.length; i++) {

                    var event = events[i];
                    var when = event.start.dateTime;
                    if (!when) {
                      when = event.start.date;
                    }
                    alert('You have: ' + event['summary'] + 'at ' + when);

                  }*/

                } else {
                  alert('No upcoming events found :(');
                }

              } else {
                var error = xhr.responseText ? JSON.parse(xhr.responseText).error : {message: 'An error has occurred'};
                $('#output p').html(error.message);
              }
            }
          };

          xhr.open('GET', url, true);
          xhr.send();

        }).fail(function(data) {
          $loginStatus.html(data.error);
        });
      });
    });

    /**
    * Append a pre element to the body containing the given message
    * as its text node.
    *
    * @param {string} message Text to be placed in pre element.
    */
    function appendPre(message) {
      /*var pre = document.getElementById('output');
      var textContent = document.createTextNode(message + '\n');
      pre.appendChild(textContent);*/
      $('#output p').append(message + '\n');
    }
}());
