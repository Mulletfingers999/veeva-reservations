// We use an "Immediate Function" to initialize the application to avoid leaving anything behind in the global scope
var a_token;
(function () {
    var calendar = '';

    /* ---------------------------------- Local Variables ---------------------------------- */
    var homeTpl = Handlebars.compile($("#home-tpl").html());
    var employeeListTpl = Handlebars.compile($("#employee-list-tpl").html());

    var service = new EmployeeService();
    service.initialize().done(function () {
      renderHomeView();
    });

    /* --------------------------------- Event Registration -------------------------------- */
    document.addEventListener('deviceready', function () {

      //Define some defaults
      StatusBar.overlaysWebView( false );
      StatusBar.backgroundColorByHexString('#ffffff');
      StatusBar.styleDefault();
      if (navigator.notification) { // Override default HTML alert with native dialog
        window.alert = function (message) {
          navigator.notification.alert(
            message,    // message
            null,       // callback
            "Message from app", // title
            "OK"        // buttonName
          );
        };

        window.prompt = function (msg, def) {
          navigator.notification.prompt(
            msg,
            null,
            "Enter data",
            ['OK', ''],
            def
          );
        };

        window.confirm = function (msg) {
          navigator.notification.confirm(
            msg,
            null,
            "Confirm action",
            ['OK', 'Cancel']
          )
        }
      }
    }, false);

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

    function parseDate(d) {
      var googleDate = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})([+-]\d{2}):(\d{2})$/;
      var m = googleDate.exec(d);
      var year   = +m[1];
      var month  = +m[2];
      var day    = +m[3];
      var hour   = +m[4];
      var minute = +m[5];
      var second = +m[6];
      var msec   = +m[7];
      var tzHour = +m[8];
      var tzMin  = +m[9];
      var tzOffset = new Date().getTimezoneOffset() + tzHour * 60 + tzMin;

      return new Date(year, month - 1, day, hour, minute - tzOffset, second, msec);
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
      var xhr_events = new XMLHttpRequest();

      var url='https://www.googleapis.com/plus/v1/people/me?fields=birthday%2CcurrentLocation%2CdisplayName%2Cemails%2Cgender%2Cid%2Cimage&access_token='+token;

      xhr_events.onreadystatechange = function () {
        if (xhr_events.readyState === 4) {
          if (xhr_events.status === 200) {
            $('#output p').html(xhr_events.responseText);
          } else {
            var error = xhr_events.responseText ? JSON.parse(xhr_events.responseText).error : {message: 'An error has occurred'};
            $('#output p').html(error.message);
          }
        }
      };

      xhr_events.open('GET', url, true);
      xhr_events.send();
    }*/

    $(document).on('deviceready', function() {
      var $loginButton = $('#logina');
      var $loginStatus = $('#login p');

      var url = '';

      $loginButton.on('click', function() {
        googleapi.authorize({
          client_id: '742441378089-o41dmn9ri0jtj9lqdv55kn8goqgdr67k.apps.googleusercontent.com',
          redirect_uri: 'http://localhost',
          scope: 'https://www.googleapis.com/auth/calendar '+/*'https://apps-apis.google.com/a/feeds/calendar/resource/'+*/'email'
        }).done(function(data) {
          //set token
          a_token = data.access_token;

          //room booking function
          window.book_room = function(t, tstring) {
            if (("" + $('#' + t + '_veeva').attr('style')).indexOf("red") == -1 && t != 600) {

              //clear the values
              $('#event_form_minutes').html("");

              function adjt(time) {
                var t = time;
                //console.log(Math.floor((t+15) / (Math.pow(10, 1)) % 10) + '' + Math.floor((t+15) / (Math.pow(10, 0)) % 10));
                if (t == 1245) {
                  t = 100;
                } else if (t + 15 == 600 && t + 15 >= 800 && ((t + 15) + '').length == 3) {
                  t = 615;
                } else if ((parseInt(Math.floor((t+15) / (Math.pow(10, 1)) % 10) + '' + Math.floor((t+15) / (Math.pow(10, 0)) % 10)) % 60) == 0) {
                  t = t + 15 + 40;
                } else {
                  t = t + 15;
                }
                console.log(t);
                return t;
              }

              function tparse(t) {
                var parsed = "";

                if (t % 60 == 0) {
                  parsed = (t / 60) + 'h';
                } else if (t < 60) {
                  parsed = t + '';
                } else {
                  var hrs = Math.floor( t / 60);
                  var minutes = t % 60;
                  parsed = hrs + 'h' + minutes;
                }

                return parsed;
              }

              function inBounds(t) {
                var inb;
                if (('' + t).length == 4) {
                  inb = true;
                } else if (('' + t).length == 3 && t < 600) {
                  inb = true;
                } else if (('' + t).length == 3 && t >= 800) {
                  inb = true;
                } else {
                  inb = false;
                }
                return inb;
              }

              var j = 0;
              for (var i = t; ('' + $('#' + i + '_veeva').attr('style')).indexOf('red') == -1 && inBounds(i); i=adjt(i)) {
                j++;
                $('#event_form_minutes').append('<option>' + tparse(j*15) + '</option>');
              }

              $('#event_form_dialog').dialog({
                draggable: true
              });

              $('#event_form').submit(function (e) {
                e.preventDefault();
                var name = $('#event_form_name').val();//prompt("What would you like to name your meeting?", "In prompt to: ");
                var minutes_val = $('#event_form_minutes').val();//prompt("How many minutes would you like " + ((name == undefined) ? 'your meeting' : name) + " to last?", "60");
                var minutes;
                var meridian;

                if (minutes_val.indexOf('h') > -1) {
                  var splt = minutes_val.split('h');
                  if (splt[1] != '') {
                     minutes = parseInt(splt[1]) + (parseInt(splt[0])*60);
                  } else {
                     minutes = (parseInt(splt[0])*60);
                  }
                } else {
                    //Just minutes == Just parse it
                    minutes = parseInt(minutes_val);
                }

                if (t >= 800 && t <= 1245) {
                  meridian = "AM";
                } else if (t >= 100 && t <= 600) {
                  meridian = "PM";
                }

                var stime = new Date(new Date().toDateString() + " " + tstring + " " + meridian);

                var event = {
                  "summary": name,
                  "start": {
                    "dateTime": stime.toISOString()
                  },
                  "end": {
                    "dateTime": new Date(stime.getTime() + ((parseInt(minutes))*60000)).toISOString()
                  },
                  "attendees": [
                    {
                      //inviting the owner to their event
                      "email": email
                    }
                  ]
                }

                $.ajax({
                  contentType: 'application/json',
                  data: JSON.stringify(event),
                  dataType: 'json',
                  success: function(data){
                      alert('Event Created!');

                      //now refresh the veeva calendar to show the event
                      var g = new Date();
                      g.setHours(0,0,0,0);
                      var f = new Date(new Date().getTime() + (86400000 * 1));
                      f.setHours(0,0,0,0);

                      $.getJSON('https://www.googleapis.com/calendar/v3/calendars/'+calendar+'/events?timeMin='+g.toISOString()+'&timeMax='+f.toISOString()+'&singleEvents=true&orderBy=startTime&access_token='+a_token, function(events) {
                        if ($.isEmptyObject(events['items']) == false) {

                          $.each(events['items'], function(i, v) {

                            var startend_time = {};

                            function time(dtime) {
                              var datetime = new Date(dtime);
                              return (datetime.getHours() % 12 || 12) + ':' + ((datetime.getMinutes() == 0) ? '00' : datetime.getMinutes());
                            };

                            startend_time[v.summary] = {'start': time(v.start.dateTime), 'end': time(v.end.dateTime)};
                            if (calendar != 'primary') {
                              //This is a veeva calendar
                              $('#' + (startend_time[v.summary].start).replace(':','') + '_veeva').text(v.summary).attr('style', 'background:red;border-top:1px solid black;');
                              $('#' + (startend_time[v.summary].end).replace(':','') + '_veeva').attr('style', 'background:red;border-bottom:1px solid black;');

                              if (parseInt((startend_time[v.summary].start).replace(':','')) <= 1245 &&
                                  parseInt((startend_time[v.summary].end).replace(':','')) <= 600 &&
                                  parseInt((startend_time[v.summary].start).replace(':','')) >= 800) {

                                //the time crosses over the AM-PM mark
                                for (var i = parseInt((startend_time[v.summary].start).replace(':','')); i <= 1245; i++) {
                                    var i_minutes = parseInt((startend_time[v.summary].start).split(':')[1]);
                                    //console.log('Time: ' + i + ', minutes: ' + i_minutes);

                                    if (Math.floor(i_minutes/15) == 1 || 2 || 3) {
                                      //console.log('true');
                                      $('#' + i + '_veeva').attr('style', 'background:red;');
                                      //console.log('#' + i + '_veeva');
                                    }
                                }

                                for (var i = 100; i <= parseInt((startend_time[v.summary].end).replace(':','')); i++) {
                                    var i_minutes = parseInt((startend_time[v.summary].start).split(':')[1]);
                                    //console.log('Time: ' + i + ', minutes: ' + i_minutes);

                                    if (Math.floor(i_minutes/15) == 1 || 2 || 3) {
                                      //console.log('true');
                                      $('#' + i + '_veeva').attr('style', 'background:red;');
                                      //console.log('#' + i + '_veeva');
                                    }
                                }
                              } else {
                                //the time does not cross over the AM-PM mark
                                for (var i = parseInt((startend_time[v.summary].start).replace(':','')); i <= parseInt((startend_time[v.summary].end).replace(':','')); i++) {
                                    var i_minutes = parseInt((startend_time[v.summary].start).split(':')[1]);
                                    //console.log('Time: ' + i + ', minutes: ' + i_minutes);

                                    if (Math.floor(i_minutes/15) == 1 || 2 || 3) {
                                      //console.log('true');
                                      $('#' + i + '_veeva').attr('style', 'background:red;');
                                      //console.log('#' + i + '_veeva');
                                    }
                                }
                              }
                            } else {
                              // Only show the user's primary calendar
                              // This will be used for debugging and occasional demos
                              $('#' + (startend_time[v.summary].start).replace(':','') + '_personal').text(v.summary).attr('style', 'background:red;');

                            }

                          });
                        } else {
                          alert('No upcoming events found :(');
                        }
                      });

                      //now refresh the user's calendar
                      $.getJSON('https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin='+g.toISOString()+'&timeMax='+f.toISOString()+'&singleEvents=true&orderBy=startTime&access_token='+a_token, function(events) {
                        if ($.isEmptyObject(events['items']) == false) {

                          $.each(events['items'], function(i, v) {

                            var startend_time = {};

                            function time(dtime) {
                              var datetime = new Date(dtime);
                              return (datetime.getHours() % 12 || 12) + ':' + ((datetime.getMinutes() == 0) ? '00' : datetime.getMinutes());
                            };

                            startend_time[v.summary] = {'start': time(v.start.dateTime), 'end': time(v.end.dateTime)};
                            if (calendar != 'primary') {
                              //This is a veeva calendar
                              $('#' + (startend_time[v.summary].start).replace(':','') + '_personal').text(v.summary).attr('style', 'background:#32C532;border-top:1px solid black;');
                              $('#' + (startend_time[v.summary].end).replace(':','') + '_personal').attr('style', 'background:#32C532;border-bottom:1px solid black;');

                              if (parseInt((startend_time[v.summary].start).replace(':','')) <= 1245 &&
                                  parseInt((startend_time[v.summary].end).replace(':','')) <= 600 &&
                                  parseInt((startend_time[v.summary].start).replace(':','')) >= 800) {

                                //the time crosses over the AM-PM mark
                                for (var i = parseInt((startend_time[v.summary].start).replace(':','')); i <= 1245; i++) {
                                    var i_minutes = parseInt((startend_time[v.summary].start).split(':')[1]);
                                    //console.log('Time: ' + i + ', minutes: ' + i_minutes);

                                    if (Math.floor(i_minutes/15) == 1 || 2 || 3) {
                                      //console.log('true');
                                      $('#' + i + '_personal').attr('style', 'background:#32C532;');
                                      //console.log('#' + i + '_veeva');
                                    }
                                }

                                for (var i = 100; i <= parseInt((startend_time[v.summary].end).replace(':','')); i++) {
                                    var i_minutes = parseInt((startend_time[v.summary].start).split(':')[1]);
                                    //console.log('Time: ' + i + ', minutes: ' + i_minutes);

                                    if (Math.floor(i_minutes/15) == 1 || 2 || 3) {
                                      //console.log('true');
                                      $('#' + i + '_personal').attr('style', 'background:#32C532;');
                                      //console.log('#' + i + '_veeva');
                                    }
                                }
                              } else {
                                //the time does not cross over the AM-PM mark
                                for (var i = parseInt((startend_time[v.summary].start).replace(':','')); i <= parseInt((startend_time[v.summary].end).replace(':','')); i++) {
                                    var i_minutes = parseInt((startend_time[v.summary].start).split(':')[1]);
                                    //console.log('Time: ' + i + ', minutes: ' + i_minutes);

                                    if (Math.floor(i_minutes/15) == 1 || 2 || 3) {
                                      //console.log('true');
                                      $('#' + i + '_personal').attr('style', 'background:#32C532;');
                                      //console.log('#' + i + '_veeva');
                                    }
                                }
                              }
                            } else {
                              // Only show the user's primary calendar
                              // This will be used for debugging and occasional demos
                              $('#' + (startend_time[v.summary].start).replace(':','') + '_personal').text(v.summary).attr('style', 'background:#32C532');

                            }

                          });
                        } else {
                          alert('No upcoming events found :(');
                        }
                      });

                  },
                  error: function(err){
                      alert("Request failed. Details can be found in console. Terminating XHR...");
                      console.log(err);
                  },
                  processData: false,
                  type: 'POST',
                  url: 'https://www.googleapis.com/calendar/v3/calendars/' + calendar + '/events?access_token=' + data.access_token
                });

                $('#event_form_dialog').dialog('close');
              });
            } else if (t == 600) {
              alert('You can\'t book a room in that slot');
            } else {
              alert('A room is already booked in that slot!');
            }
          };
          //storing the users email for later use
          var email = '';

          //change the sign in with google thing to a rescanner
          $('#login a').text('Re-scan QR Code');
          $('#login a').attr('id', 'rescan');

          //creating xhrs
          var xhr_events = new XMLHttpRequest();
          var xhr_personal_events = new XMLHttpRequest();
          var xhr_email = new XMLHttpRequest();
          var xhr_calendar_list = new XMLHttpRequest();

          //scan the barcode
          cordova.plugins.barcodeScanner.scan(
            function (result) {
              if (result.cancelled == true) {
                alert('ERR: Barcode Scanning Canceled');
              } else {
                if (result.format != "QR_CODE") {
                  alert('ERR: You didn\'t scan a QR Code! Nonetheless, it returned this value: ' + result.text);
                } else {
                  //No errors, procide...
                  calendar = result.text;
                  console.log('Scanned text: ' + calendar);

                  //set the header of the room events calendar to be the name of the calendar
                  $.getJSON('https://www.googleapis.com/calendar/v3/calendars/' + calendar +  '?access_token=' + data.access_token, function (resource) {
                    $('#rheader').text(resource.summary);
                  });

                  //get the user's email address
                  xhr_email.onreadystatechange = function () {
                    if (xhr_email.readyState === 4) {
                      if (xhr_email.status === 200) {
                        //$('#output p').html('Full xhr_events GAPI Response:\n' + xhr_events.responseText);
                        //alert('Full xhr_events GAPI Response: ' + xhr_events.responseText)

                        var response = $.parseJSON(xhr_email.responseText);
                        var emails = response;

                        if ($.isEmptyObject(emails['emails']) == false) {
                          $.each(emails['emails'], function(ind, v) {
                            $.each(v, function(i, val) {
                              if ('' + i == 'value') {
                                email = val + '';

                                //getting dates
                                var date = new Date();
                                var year = date.getFullYear();
                                var month = date.getMonth();
                                month=month+1;
                                if (month < 10)
                                 month = "0" + month;
                                var day= date.getDate();
                                if (day < 10)
                                 day = "0" + day;
                                var datestring=year+month+day;

                                //changing the personal calendar

                                //alert($('#personal-calendar').attr('src'));
                              }
                            });

                          });

                        }

                        if ($.isEmptyObject(emails['displayName']) == false) {
                          $('#pheader').text(emails['displayName']);
                        }

                      } else {
                        var error = xhr_email.responseText ? JSON.parse(xhr_email.responseText).error : {message: 'An error has occurred'};

                        if (error.message == "Not Found") {
                          $('#output p').html('The calendar you scanned wasn\'t found on your account. Perhaps you signed into the wrong account (or maybe you don\'t have permission)?');
                        } else {
                          $('#output p').html('An undocumented XHR_email error occured. Message is as follows: ' + error.message);
                        }
                      }
                    }

                    //retrieving a list of the user's calendars -- sending the request

                    //
                    //

                  };

                  xhr_email.open('GET', 'https://www.googleapis.com/plus/v1/people/me?access_token=' + data.access_token, true);
                  xhr_email.send();

                  //retrieving a list of the user's calendars -- onreadystatechange
                  /*xhr_calendar_list.onreadystatechange = function () {
                    if (xhr_calendar_list.readyState === 4) {
                      if (xhr_calendar_list.status === 200) {

                        var response = $.parseJSON(xhr_calendar_list.responseText);
                        var calendarlist = response;

                        if ($.isEmptyObject(calendarlist['items']) == false) {
                          $.each(calendarlist['items'], function(ind, v) {

                            $.each(v, function(i, val) {

                              if ('' + i == 'id' && '' + val == email) {
                                //this is the user's primary calendar. continue...

                              }

                            });

                          });

                        } else {
                          alert('No calendars for this account were found. :(');
                        }

                      } else {
                        var error = xhr_calendar_list.responseText ? JSON.parse(xhr_calendar_list.responseText).error : {message: 'An error has occurred'};

                        if (error.message == "Not Found") {
                          $('#output p').html('The calendar you scanned wasn\'t found on your account. Perhaps you signed into the wrong account (or maybe you don\'t have permission)?');
                        } else {
                          $('#output p').html('An undocumented XHR_calendar_list error occured. Message is as follows: ' + error.message);
                        }
                      }
                    }
                  }*/
                  var g = new Date();
                  g.setHours(0,0,0,0);
                  var f = new Date(new Date().getTime() + (86400000 * 1));
                  f.setHours(0,0,0,0);

                  url='https://www.googleapis.com/calendar/v3/calendars/' + calendar + '/events?timeMin=' + g.toISOString() +
                  '&timeMax=' + f.toISOString() + '&singleEvents=true&orderBy=startTime&access_token='+data.access_token;

                  //getting the date
                  var date = new Date();
                  var year = date.getFullYear();
                  var month = date.getMonth();
                  month=month+1;
                  if (month < 10)
                   month = "0" + month;
                  var day= date.getDate();
                  if (day < 10)
                   day = "0" + day;
                  var datestring=year+month+day;

                  //displaying the calendar

                  xhr_events.open('GET', url, true);
                  xhr_events.send();
                }
              }
            },
            function (error) {
              alert("Scanning failed: " + error);
            }
          );

          //check for Re-scan
          /*$('#rescan').click(function() {
            cordova.plugins.barcodeScanner.scan(
              function (result) {
                if (result.cancelled == true) {
                  alert('ERR: Barcode Scanning Canceled');
                } else {
                  if (result.format != "QR_CODE") {
                    alert('ERR: You didn\'t scan a QR Code! Nonetheless, it returned this value: ' + result.text);
                  } else {
                    //No errors, procide...
                    calendar = result.text;

                    url='https://www.googleapis.com/calendar/v3/calendars/' + calendar + '/events?timeMin=' + (new Date()).toISOString() +
                    '&timeMax=' + (new Date(new Date().getTime() + (86400000 * 1))).toISOString() +
                    '&singleEvents=true&orderBy=startTime&access_token='+data.access_token;

                    $('#veeva-calendar').attr('src', 'https://www.google.com/calendar/embed?showTabs=0&amp;showCalendars=0&amp;mode=DAY&amp;height=600&amp;wkst=1&amp;bgcolor=%23FFFFFF&amp;src=' + calendar + '&amp;color=%23711616&amp;ctz=America%2FLos_Angeles')

                    xhr_events.open('GET', url, true);
                    xhr_events.send();
                  }
                }
              },
              function (error) {
                alert("Scanning failed: " + error);
              }
            );
          });*/

          //here comes the fun part... the rest api.
          xhr_events.onreadystatechange = function () {
            if (xhr_events.readyState === 4) {
              if (xhr_events.status === 200) {
                //$('#output p').html('Full xhr_events GAPI Response:\n' + xhr_events.responseText);
                //alert('Full xhr_events GAPI Response: ' + xhr_events.responseText)

                var response = $.parseJSON(xhr_events.responseText);
                var events = response;


                if ($.isEmptyObject(events['items']) == false) {

                  $.each(events['items'], function(i, v) {

                    var startend_time = {};

                    function time(dtime) {
                      var datetime = new Date(dtime);
                      return (datetime.getHours() % 12 || 12) + ':' + ((datetime.getMinutes() == 0) ? '00' : datetime.getMinutes());
                    };

                    startend_time[v.summary] = {'start': time(v.start.dateTime), 'end': time(v.end.dateTime)};
                    if (calendar != 'primary') {
                      //This is a veeva calendar
                      $('#' + (startend_time[v.summary].start).replace(':','') + '_veeva').text(v.summary).attr('style', 'background:red;border-top:1px solid black;');
                      $('#' + (startend_time[v.summary].end).replace(':','') + '_veeva').attr('style', 'background:red;border-bottom:1px solid black;');

                      if (parseInt((startend_time[v.summary].start).replace(':','')) <= 1245 &&
                          parseInt((startend_time[v.summary].start).replace(':','')) >= 800 &&
                          parseInt((startend_time[v.summary].end).replace(':','')) <= 600) {

                        //the time crosses over the AM-PM mark
                        for (var i = parseInt((startend_time[v.summary].start).replace(':','')); i <= 1245; i++) {
                            var i_minutes = parseInt((startend_time[v.summary].start).split(':')[1]);
                            //console.log('Time: ' + i + ', minutes: ' + i_minutes);

                            if (Math.floor(i_minutes/15) == 1 || 2 || 3) {
                              //console.log('true');
                              $('#' + i + '_veeva').attr('style', 'background:red;');
                              //console.log('#' + i + '_veeva');
                            }
                        }

                        for (var i = 100; i <= parseInt((startend_time[v.summary].end).replace(':','')); i++) {
                            var i_minutes = parseInt((startend_time[v.summary].start).split(':')[1]);
                            //console.log('Time: ' + i + ', minutes: ' + i_minutes);

                            if (Math.floor(i_minutes/15) == 1 || 2 || 3) {
                              //console.log('true');
                              $('#' + i + '_veeva').attr('style', 'background:red;');
                              //console.log('#' + i + '_veeva');
                            }
                        }
                      } else {
                        //the time does not cross over the AM-PM mark
                        for (var i = parseInt((startend_time[v.summary].start).replace(':','')); i <= parseInt((startend_time[v.summary].end).replace(':','')); i++) {
                            var i_minutes = parseInt((startend_time[v.summary].start).split(':')[1]);
                            //console.log('Time: ' + i + ', minutes: ' + i_minutes);

                            if (Math.floor(i_minutes/15) == 1 || 2 || 3) {
                              //console.log('true');
                              $('#' + i + '_veeva').attr('style', 'background:red;');
                              //console.log('#' + i + '_veeva');
                            }
                        }
                      }
                    } else {
                      // Only show the user's primary calendar
                      // This will be used for debugging and occasional demos
                      $('#' + (startend_time[v.summary].start).replace(':','') + '_personal').text(v.summary).attr('style', 'background:red;');

                    }

                  });
                } else {
                  alert('No upcoming events found :(');
                }

              } else {
                var error = xhr_events.responseText ? JSON.parse(xhr_events.responseText).error : {message: 'An error has occurred'};

                if (error.message == "Not Found") {
                  $('#output p').html('The calendar you scanned wasn\'t found on your account. Perhaps you signed into the wrong account (or maybe you don\'t have permission)?');
                } else {
                  $('#output p').html('Undocumented XHR_events Error: ' + error.message);
                }
              }
            }
          };

          var g = new Date();
          g.setHours(0,0,0,0);
          var f = new Date(new Date().getTime() + (86400000 * 1));
          f.setHours(0,0,0,0);


          // user's primary calendar events
          url='https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=' + g.toISOString() +
          '&timeMax=' + f.toISOString() + '&singleEvents=true&orderBy=startTime&access_token='+data.access_token;

          //sending request
          xhr_personal_events.open('GET', url, true);
          xhr_personal_events.send();

          xhr_personal_events.onreadystatechange = function () {
            if (xhr_personal_events.readyState === 4) {
              if (xhr_personal_events.status === 200) {

                var response = $.parseJSON(xhr_personal_events.responseText);
                var events = response;


                if ($.isEmptyObject(events['items']) == false) {

                  $.each(events['items'], function(i, v) {

                    var startend_time = {};

                    function time(dtime) {
                      var datetime = new Date(dtime);
                      return (datetime.getHours() % 12 || 12) + ':' + ((datetime.getMinutes() == 0) ? '00' : datetime.getMinutes());
                    };

                    startend_time[v.summary] = {'start': time(v.start.dateTime), 'end': time(v.end.dateTime)};

                    if (calendar != 'primary') {
                      // Displaying the user's primary calendar next to the veeva calendar
                      $('#' + (startend_time[v.summary].start).replace(':','') + '_personal').text(v.summary).attr('style', 'background:#32C532;border-top:1px solid black;');
                      $('#' + (startend_time[v.summary].end).replace(':','') + '_personal').attr('style', 'background:#32C532;border-bottom:1px solid black;');

                      if (parseInt((startend_time[v.summary].start).replace(':','')) <= 1245 &&
                          parseInt((startend_time[v.summary].end).replace(':','')) <= 600 &&
                          parseInt((startend_time[v.summary].start).replace(':','')) >= 800) {

                        //the time crosses over the AM-PM mark
                        for (var i = parseInt((startend_time[v.summary].start).replace(':','')); i <= 1245; i++) {
                            var i_minutes = parseInt((startend_time[v.summary].start).split(':')[1]);
                            //console.log('Time: ' + i + ', minutes: ' + i_minutes);

                            if (Math.floor(i_minutes/15) == 1 || 2 || 3) {
                              //console.log('true');
                              $('#' + i + '_personal').attr('style', 'background:#32C532;;');
                              //console.log('#' + i + '_veeva');
                            }
                        }

                        for (var i = 100; i <= parseInt((startend_time[v.summary].end).replace(':','')); i++) {
                            var i_minutes = parseInt((startend_time[v.summary].start).split(':')[1]);
                            //console.log('Time: ' + i + ', minutes: ' + i_minutes);

                            if (Math.floor(i_minutes/15) == 1 || 2 || 3) {
                              //console.log('true');
                              $('#' + i + '_personal').attr('style', 'background:#32C532;');
                              //console.log('#' + i + '_veeva');
                            }
                        }
                      } else {
                        //the time does not cross over the AM-PM mark
                        for (var i = parseInt((startend_time[v.summary].start).replace(':','')); i <= parseInt((startend_time[v.summary].end).replace(':','')); i++) {
                            var i_minutes = parseInt((startend_time[v.summary].start).split(':')[1]);
                            //console.log('Time: ' + i + ', minutes: ' + i_minutes);

                            if (Math.floor(i_minutes/15) == 1 || 2 || 3) {
                              //console.log('true');
                              $('#' + i + '_personal').attr('style', 'background:#32C532;');
                              //console.log('#' + i + '_veeva');
                            }
                        }
                      }
                    }

                  });

                } else {
                  alert('No upcoming events found :(');
                }

              } else {
                var error = xhr_events.responseText ? JSON.parse(xhr_events.responseText).error : {message: 'An error has occurred'};

                if (error.message == "Not Found") {
                  $('#output p').html('The calendar you scanned wasn\'t found on your account. Perhaps you signed into the wrong account (or maybe you don\'t have permission)?');
                } else {
                  $('#output p').html('Undocumented XHR_events Error: ' + error.message);
                }
              }
            }
          };

        }).fail(function(data) {
          $loginStatus.html(data.error);
        });
      });
    });
}());
