var Realm = require('realm');
// const chema = require('../realm_test.js')
const chema = require('../global.js')
// let realm = new Realm({ schema: [chema.Person, chema.Person2] });
// let realm = new Realm({
//   schema: [chema.USER_PROMO_TEST, chema.SIM_TEST, chema.USER_TEST, chema.MEDIA_TEST, chema.CONNECTORINFO_TEST, chema.RATE_TEST],
//   schemaVersion: 13
// });

process.on('message', (value) => {
  console.log("policy is on");
  command_classifier(value.data);
});

process.on('message', (value) => {
  console.log("call is on");
  command_classifier(value.data);
});

function command_classifier(data) {
  switch (data['data1']) {
    case 'PAGING': //테이블 체크
      //call function
      console.log("CALLOUT ");
      mp_paging(data);
      break;
    case 'PORT_ARRANGE': //회원가입
      //call function
      console.log("CALLIN");
      port_arrange(data);
      break;
    default:
      console.log("[CALL] not find sub command");
  }
}

function mp_paging(dictdata) {
//IN - MP|PAGING|SEQ|sim_imsi|
//OUT - MP|PAGING|SEQ|sim_imsi|imei|tmsi|kc|cksn|msisdn|simbank_id|sim_serial_no|

var command_line = dicdata;
var command = command_line['command'];
var sub_command = command_line['data1'];
var seq = command_line['data2'];
var sim_imsi = command_line['data3'];



}

function port_arrange(dictdata) {
//IN - MP|PORT_ARRANGE|CON_ID|IMSI|OUTBOUND|CUR_TIME|CALLOUT|/CALLIN|SRART/ANSWER/DROP|
//OUT - ""

var command_line = dicdata;
var command = command_line['command'];
var sub_command = command_line['data1'];
var con_id = command_line['data2'];
var imsi = command_line['data3'];
var outbound = command_line['data4'];
var cur_time = command_line['data5'];
var call_out_in_check = command_line['data6'];
var call_state = command_line['data7'];





}
