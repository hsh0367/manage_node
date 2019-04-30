var Realm = require('realm');
// const chema = require('../realm_test.js')
const chema = require('../global.js')
// let realm = new Realm({ schema: [chema.Person, chema.Person2] });
// let realm = new Realm({
//   schema: [chema.USER_PROMO_TEST, chema.SIM_TEST, chema.USER_TEST, chema.MEDIA_TEST, chema.CONNECTORINFO_TEST, chema.RATE_TEST],
//   schemaVersion: 13
// });

process.on('message', (value) => {
  console.log("sms is on");
  command_classifier(value.data);
});

function command_classifier(data) {
  switch (data['data1']) {
    case 'SMSOUT': //테이블 체크
      //call function
      console.log("CALLOUT ");
      sms_out(data);
      break;
    case 'SMSIN': //로그인
      //call function
      console.log("CALLDROP");
      sms_in(data);
      break;
    case 'SMSRESULT': //회원가입
      //call function
      console.log("CALLIN");
      sms_result(data);
      break;

    default:
      console.log("[CALL] not find sub command");
  }
}

function sms_out(dictdata) {
//IN - SMS|SMSOUT|SEQ|sim_imsi|tcp_id|id|outbound|
//OUT - SMS|SMSOUT|SEQ|과금금액|imei|tmsi|kc|cksn|msisdn|reference_number|simbank_id|sim_serial_no|
var command_line = dicdata;
var command = command_line['command'];
var sub_command = command_line['data1'];
var seq = command_line['data2'];
var sim_imsi = command_line['data3'];
var tcp_id = command_line['data4'];
var user_id = command_line['data5'];
var outbound = command_line['data6'];

}

function sms_in(dictdata) {
//IN - SMS|SMSIN|SEQ|sim_imsi|sms_pdu|
//OUT - SMS|SMSIN|SEQ|tcp_id|id|push_key|join_app_type|os_type|
var command_line = dicdata;
var command = command_line['command'];
var sub_command = command_line['data1'];
var seq = command_line['data2'];
var sim_imsi = command_line['data3'];
var sms_pdu = command_line['data4'];


}

function sms_result(dictdata) {
//IN - SMS|SMSRESULT|SEQ|sim_imsi|tcp_id|id|outbound|과금 금액|
//OUT - ""
var command_line = dicdata;
var command = command_line['command'];
var sub_command = command_line['data1'];
var seq = command_line['data2'];
var sim_imsi = command_line['data3'];
var tcp_id = command_line['data4'];
var user_id = command_line['data5'];
var outbound = command_line['data6'];
var charging_method = command_line['data7'];


}
