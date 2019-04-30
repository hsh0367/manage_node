var Realm = require('realm');
// const chema = require('../realm_test.js')
const chema = require('../global.js')
// let realm = new Realm({ schema: [chema.Person, chema.Person2] });
// let realm = new Realm({
//   schema: [chema.USER_PROMO_TEST, chema.SIM_TEST, chema.USER_TEST, chema.MEDIA_TEST, chema.CONNECTORINFO_TEST, chema.RATE_TEST],
//   schemaVersion: 13
// });

// process.on('message', (value) => {
//   console.log("cnd is on");
//   command_classifier(value.data);
// });

function timeConverter(UNIX_timestamp) {
  var a = new Date(UNIX_timestamp);
  var months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  var year = a.getFullYear();
  var month = months[a.getMonth()];
  var date = a.getDate();
  var hour = a.getHours();
  var min = a.getMinutes();
  var sec = a.getSeconds();
  var time = year + '-' + month + '-' + date + ' ' + hour + ':' + min + ':' + sec;
  return time;
}  var now = Date.now();
  var seven = 86400000 * 7;
console.log(timeConverter(now+seven));
